'use client';

import React, {
  createContext, useContext, useState, useCallback, useEffect, useMemo, useRef,
} from 'react';
import type { CellarItem } from '@/components/pages/cellar-page';
import type {
  Rack, Placement, SlotId, CellarFilters,
} from './types';
import { DEFAULT_FILTERS, createDefaultRack, computeAllSlots } from './types';
import { cellarItemToPlacement, matchesFilters, sortPlacements } from './utils';

type ViewMode = '3d' | '2d';
type TabId = 'rack' | 'list' | 'insights';

interface CellarRackContextValue {
  racks: Rack[];
  activeRackId: string | null;
  activeRack: Rack | null;
  setActiveRackId: (id: string) => void;
  createRack: (rack: Rack) => void;
  updateRack: (rack: Rack) => void;
  deleteRack: (id: string) => void;

  cellarItems: CellarItem[];
  setCellarItems: (items: CellarItem[]) => void;

  placementMap: Map<SlotId, Placement>;
  allPlacements: Placement[];
  unassignedPlacements: Placement[];
  assignSlot: (cellarItemId: string, slotId: SlotId) => void;
  unassignSlot: (slotId: SlotId) => void;
  moveBottle: (fromSlot: SlotId, toSlot: SlotId) => void;

  selectedSlotId: SlotId | null;
  setSelectedSlotId: (id: SlotId | null) => void;
  selectedPlacement: Placement | null;

  filters: CellarFilters;
  setFilters: (filters: CellarFilters) => void;
  resetFilters: () => void;
  filteredPlacements: Placement[];

  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;

  heatmapEnabled: boolean;
  setHeatmapEnabled: (v: boolean) => void;

  isRackBuilderOpen: boolean;
  setIsRackBuilderOpen: (v: boolean) => void;
  editingRack: Rack | null;
  setEditingRack: (rack: Rack | null) => void;

  isPickerMode: boolean;
  setIsPickerMode: (v: boolean) => void;

  wineCardPlacement: Placement | null;
  setWineCardPlacement: (p: Placement | null) => void;

  userId: string;
  refreshCellar: () => Promise<void>;
}

const CellarRackContext = createContext<CellarRackContextValue | null>(null);

export function useCellarRack() {
  const ctx = useContext(CellarRackContext);
  if (!ctx) throw new Error('useCellarRack must be used within CellarRackProvider');
  return ctx;
}

// --------------- localStorage helpers (used as fast cache only) ---------------

function loadLocalRacks(userId: string): Rack[] {
  try {
    const raw = localStorage.getItem(`cellar-racks:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function cacheRacksLocally(userId: string, racks: Rack[]) {
  try {
    localStorage.setItem(`cellar-racks:${userId}`, JSON.stringify(racks));
  } catch { /* quota */ }
}

function loadLocalSlotAssignments(userId: string): Record<string, SlotId> {
  try {
    const raw = localStorage.getItem(`cellar-slots:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// --------------- Rack API helpers ---------------

async function fetchRacksFromDb(userId: string): Promise<{ dbId: string; rack: Rack }[]> {
  try {
    const res = await fetch(`/api/cellar/rack?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data.racks)) return [];
    return data.racks.map((row: { id: string; config: Rack }) => ({
      dbId: row.id,
      rack: row.config,
    }));
  } catch {
    return [];
  }
}

async function postRackToDb(userId: string, rack: Rack): Promise<string | null> {
  try {
    const res = await fetch('/api/cellar/rack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, config: rack }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.id ?? null;
  } catch {
    return null;
  }
}

async function patchRackInDb(dbId: string, rack: Rack): Promise<void> {
  try {
    await fetch('/api/cellar/rack', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: dbId, config: rack }),
    });
  } catch { /* silent */ }
}

async function deleteRackFromDb(dbId: string): Promise<void> {
  try {
    await fetch(`/api/cellar/rack?id=${encodeURIComponent(dbId)}`, { method: 'DELETE' });
  } catch { /* silent */ }
}

async function patchCellarItemSlot(cellarItemId: string, slotId: string | null): Promise<void> {
  try {
    await fetch('/api/cellar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cellarItemId, slotId }),
    });
  } catch { /* silent */ }
}

// --------------- Provider ---------------

interface CellarRackProviderProps {
  children: React.ReactNode;
  userId: string;
  initialItems: CellarItem[];
}

export function CellarRackProvider({
  children, userId, initialItems,
}: CellarRackProviderProps) {
  const [racks, setRacks] = useState<Rack[]>([]);
  const [activeRackId, setActiveRackIdState] = useState<string | null>(null);
  const [cellarItems, setCellarItems] = useState<CellarItem[]>(() => {
    if (initialItems.length > 0) return initialItems;
    try {
      const cached = sessionStorage.getItem(`cellar-data:${userId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);
  const [filters, setFilters] = useState<CellarFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [activeTab, setActiveTab] = useState<TabId>('rack');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isRackBuilderOpen, setIsRackBuilderOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [wineCardPlacement, setWineCardPlacement] = useState<Placement | null>(null);
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  // Maps rack.id (config id used in slot strings) -> DB row id (for API CRUD)
  const rackDbIds = useRef<Record<string, string>>({});

  // --------------- Load racks from DB on mount (with localStorage migration) ---------------

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedView = localStorage.getItem(`cellar-view:${userId}`);
    if (savedView === '3d' || savedView === '2d') setViewMode(savedView);

    (async () => {
      const dbRows = await fetchRacksFromDb(userId);

      if (dbRows.length > 0) {
        const loaded = dbRows.map((r) => r.rack);
        for (const r of dbRows) {
          rackDbIds.current[r.rack.id] = r.dbId;
        }
        setRacks(loaded);
        setActiveRackIdState(loaded[0].id);
        cacheRacksLocally(userId, loaded);
        return;
      }

      // DB empty — check localStorage for data to migrate
      const localRacks = loadLocalRacks(userId);
      if (localRacks.length > 0) {
        setRacks(localRacks);
        setActiveRackIdState(localRacks[0].id);

        // Migrate localStorage racks to DB
        for (const rack of localRacks) {
          const dbId = await postRackToDb(userId, rack);
          if (dbId) rackDbIds.current[rack.id] = dbId;
        }

        // Migrate localStorage slot assignments to DB
        const localSlots = loadLocalSlotAssignments(userId);
        const slotEntries = Object.entries(localSlots);
        if (slotEntries.length > 0) {
          // Optimistically set slot_id on cellar items in local state
          setCellarItems((prev) => prev.map((item) => {
            const slotId = localSlots[item.id];
            return slotId ? { ...item, slot_id: slotId } : item;
          }));
          // Persist each to DB in background
          for (const [itemId, slotId] of slotEntries) {
            patchCellarItemSlot(itemId, slotId);
          }
        }
        return;
      }

      // Nothing anywhere — create a default rack in DB
      const defaultRack = createDefaultRack('My Wine Rack');
      const dbId = await postRackToDb(userId, defaultRack);
      if (dbId) rackDbIds.current[defaultRack.id] = dbId;
      setRacks([defaultRack]);
      setActiveRackIdState(defaultRack.id);
      cacheRacksLocally(userId, [defaultRack]);
    })();
  }, [userId]);

  // Persist view mode
  useEffect(() => {
    if (initializedRef.current) {
      localStorage.setItem(`cellar-view:${userId}`, viewMode);
    }
  }, [viewMode, userId]);

  const activeRack = useMemo(
    () => racks.find((r) => r.id === activeRackId) ?? null,
    [racks, activeRackId],
  );

  const setActiveRackId = useCallback((id: string) => {
    setActiveRackIdState(id);
    setSelectedSlotId(null);
  }, []);

  // --------------- Rack CRUD (synced to DB) ---------------

  const createRack = useCallback((rack: Rack) => {
    setRacks((prev) => {
      const next = [...prev, rack];
      cacheRacksLocally(userId, next);
      return next;
    });
    setActiveRackIdState(rack.id);
    postRackToDb(userId, rack).then((dbId) => {
      if (dbId) rackDbIds.current[rack.id] = dbId;
    });
  }, [userId]);

  const updateRack = useCallback((rack: Rack) => {
    setRacks((prev) => {
      const next = prev.map((r) => (r.id === rack.id ? rack : r));
      cacheRacksLocally(userId, next);
      return next;
    });
    const dbId = rackDbIds.current[rack.id];
    if (dbId) patchRackInDb(dbId, rack);
  }, [userId]);

  const deleteRack = useCallback((id: string) => {
    const dbId = rackDbIds.current[id];
    if (dbId) {
      deleteRackFromDb(dbId);
      delete rackDbIds.current[id];
    }
    setRacks((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) {
        const defaultRack = createDefaultRack('My Wine Rack');
        setActiveRackIdState(defaultRack.id);
        postRackToDb(userId, defaultRack).then((newDbId) => {
          if (newDbId) rackDbIds.current[defaultRack.id] = newDbId;
        });
        cacheRacksLocally(userId, [defaultRack]);
        return [defaultRack];
      }
      cacheRacksLocally(userId, next);
      return next;
    });
    if (activeRackId === id) {
      setRacks((prev) => {
        if (prev.length > 0) setActiveRackIdState(prev[0].id);
        return prev;
      });
    }
  }, [activeRackId, userId]);

  // --------------- Derive slot assignments from cellarItems[].slot_id ---------------

  const slotAssignments = useMemo(() => {
    const map: Record<string, SlotId> = {};
    for (const item of cellarItems) {
      if (item.slot_id) map[item.id] = item.slot_id;
    }
    return map;
  }, [cellarItems]);

  // Build placement map from cellar items + slot assignments
  const { placementMap, allPlacements, unassignedPlacements } = useMemo(() => {
    const map = new Map<SlotId, Placement>();
    const all: Placement[] = [];
    const unassigned: Placement[] = [];

    const validSlots = new Set<SlotId>();
    for (const rack of racks) {
      for (const slotId of computeAllSlots(rack)) {
        validSlots.add(slotId);
      }
    }

    for (const item of cellarItems) {
      const assignedSlot = slotAssignments[item.id];
      const placement = cellarItemToPlacement(item, assignedSlot);
      if (!placement) continue;

      all.push(placement);

      if (assignedSlot && validSlots.has(assignedSlot)) {
        map.set(assignedSlot, placement);
      } else {
        unassigned.push(placement);
      }
    }

    return { placementMap: map, allPlacements: all, unassignedPlacements: unassigned };
  }, [cellarItems, slotAssignments, racks]);

  const selectedPlacement = useMemo(
    () => (selectedSlotId ? placementMap.get(selectedSlotId) ?? null : null),
    [selectedSlotId, placementMap],
  );

  // --------------- Slot assignment mutations (optimistic + DB persist) ---------------

  const assignSlot = useCallback((cellarItemId: string, slotId: SlotId) => {
    // Clear any existing occupant of the target slot
    setCellarItems((prev) => prev.map((item) => {
      if (item.id === cellarItemId) return { ...item, slot_id: slotId };
      if (item.slot_id === slotId) {
        patchCellarItemSlot(item.id, null);
        return { ...item, slot_id: null };
      }
      return item;
    }));
    patchCellarItemSlot(cellarItemId, slotId);
  }, []);

  const unassignSlot = useCallback((slotId: SlotId) => {
    setCellarItems((prev) => prev.map((item) => {
      if (item.slot_id === slotId) {
        patchCellarItemSlot(item.id, null);
        return { ...item, slot_id: null };
      }
      return item;
    }));
  }, []);

  const moveBottle = useCallback((fromSlot: SlotId, toSlot: SlotId) => {
    setCellarItems((prev) => prev.map((item) => {
      if (item.slot_id === fromSlot) {
        patchCellarItemSlot(item.id, toSlot);
        return { ...item, slot_id: toSlot };
      }
      return item;
    }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filteredPlacements = useMemo(() => {
    const matching = allPlacements.filter((p) => matchesFilters(p, filters));
    return sortPlacements(matching, filters.sort);
  }, [allPlacements, filters]);

  const cellarCacheKey = `cellar-data:${userId}`;

  const refreshCellar = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(
        `/api/cellar?userId=${encodeURIComponent(userId)}`,
        { cache: 'no-cache' },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setCellarItems(data.items);
          try { sessionStorage.setItem(cellarCacheKey, JSON.stringify(data.items)); } catch {}
        }
      }
    } catch {
      // silent
    } finally {
      fetchingRef.current = false;
    }
  }, [userId, cellarCacheKey]);

  const value = useMemo<CellarRackContextValue>(() => ({
    racks,
    activeRackId,
    activeRack,
    setActiveRackId,
    createRack,
    updateRack,
    deleteRack,
    cellarItems,
    setCellarItems,
    placementMap,
    allPlacements,
    unassignedPlacements,
    assignSlot,
    unassignSlot,
    moveBottle,
    selectedSlotId,
    setSelectedSlotId,
    selectedPlacement,
    filters,
    setFilters,
    resetFilters,
    filteredPlacements,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    heatmapEnabled,
    setHeatmapEnabled,
    isRackBuilderOpen,
    setIsRackBuilderOpen,
    editingRack,
    setEditingRack,
    isPickerMode,
    setIsPickerMode,
    wineCardPlacement,
    setWineCardPlacement,
    userId,
    refreshCellar,
  }), [
    racks, activeRackId, activeRack, setActiveRackId, createRack, updateRack, deleteRack,
    cellarItems, placementMap, allPlacements, unassignedPlacements,
    assignSlot, unassignSlot, moveBottle,
    selectedSlotId, selectedPlacement,
    filters, resetFilters, filteredPlacements,
    viewMode, activeTab,
    heatmapEnabled, isRackBuilderOpen, editingRack, isPickerMode,
    wineCardPlacement,
    userId, refreshCellar,
  ]);

  return (
    <CellarRackContext.Provider value={value}>
      {children}
    </CellarRackContext.Provider>
  );
}
