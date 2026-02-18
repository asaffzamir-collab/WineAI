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

  userId: string;
  refreshCellar: () => Promise<void>;
}

const CellarRackContext = createContext<CellarRackContextValue | null>(null);

export function useCellarRack() {
  const ctx = useContext(CellarRackContext);
  if (!ctx) throw new Error('useCellarRack must be used within CellarRackProvider');
  return ctx;
}

function loadRacks(userId: string): Rack[] {
  try {
    const raw = localStorage.getItem(`cellar-racks:${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRacks(userId: string, racks: Rack[]) {
  try {
    localStorage.setItem(`cellar-racks:${userId}`, JSON.stringify(racks));
  } catch {
    // Storage full or unavailable
  }
}

function loadSlotAssignments(userId: string): Record<string, SlotId> {
  try {
    const raw = localStorage.getItem(`cellar-slots:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveSlotAssignments(userId: string, assignments: Record<string, SlotId>) {
  try {
    localStorage.setItem(`cellar-slots:${userId}`, JSON.stringify(assignments));
  } catch {
    // Storage full or unavailable
  }
}

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
  const [cellarItems, setCellarItems] = useState<CellarItem[]>(initialItems);
  const [slotAssignments, setSlotAssignments] = useState<Record<string, SlotId>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);
  const [filters, setFilters] = useState<CellarFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [activeTab, setActiveTab] = useState<TabId>('rack');
  const [heatmapEnabled, setHeatmapEnabled] = useState(false);
  const [isRackBuilderOpen, setIsRackBuilderOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const fetchingRef = useRef(false);
  const initializedRef = useRef(false);

  // Load persisted state on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const savedRacks = loadRacks(userId);
    if (savedRacks.length > 0) {
      setRacks(savedRacks);
      setActiveRackIdState(savedRacks[0].id);
    } else {
      const defaultRack = createDefaultRack('My Wine Rack');
      setRacks([defaultRack]);
      setActiveRackIdState(defaultRack.id);
      saveRacks(userId, [defaultRack]);
    }

    setSlotAssignments(loadSlotAssignments(userId));

    const savedView = localStorage.getItem(`cellar-view:${userId}`);
    if (savedView === '3d' || savedView === '2d') setViewMode(savedView);
  }, [userId]);

  // Persist racks on change
  useEffect(() => {
    if (initializedRef.current && racks.length > 0) {
      saveRacks(userId, racks);
    }
  }, [racks, userId]);

  // Persist slot assignments on change
  useEffect(() => {
    if (initializedRef.current) {
      saveSlotAssignments(userId, slotAssignments);
    }
  }, [slotAssignments, userId]);

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

  const createRack = useCallback((rack: Rack) => {
    setRacks((prev) => [...prev, rack]);
    setActiveRackIdState(rack.id);
  }, []);

  const updateRack = useCallback((rack: Rack) => {
    setRacks((prev) => prev.map((r) => (r.id === rack.id ? rack : r)));
  }, []);

  const deleteRack = useCallback((id: string) => {
    setRacks((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (next.length === 0) {
        const defaultRack = createDefaultRack('My Wine Rack');
        setActiveRackIdState(defaultRack.id);
        return [defaultRack];
      }
      return next;
    });
    if (activeRackId === id) {
      setRacks((prev) => {
        if (prev.length > 0) setActiveRackIdState(prev[0].id);
        return prev;
      });
    }
  }, [activeRackId]);

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

  const assignSlot = useCallback((cellarItemId: string, slotId: SlotId) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      for (const [existingItemId, existingSlotId] of Object.entries(next)) {
        if (existingSlotId === slotId && existingItemId !== cellarItemId) {
          delete next[existingItemId];
        }
      }
      next[cellarItemId] = slotId;
      return next;
    });
  }, []);

  const unassignSlot = useCallback((slotId: SlotId) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      for (const [itemId, sid] of Object.entries(next)) {
        if (sid === slotId) {
          delete next[itemId];
          break;
        }
      }
      return next;
    });
  }, []);

  const moveBottle = useCallback((fromSlot: SlotId, toSlot: SlotId) => {
    setSlotAssignments((prev) => {
      const next = { ...prev };
      for (const [itemId, sid] of Object.entries(next)) {
        if (sid === fromSlot) {
          next[itemId] = toSlot;
          break;
        }
      }
      return next;
    });
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const filteredPlacements = useMemo(() => {
    const matching = allPlacements.filter((p) => matchesFilters(p, filters));
    return sortPlacements(matching, filters.sort);
  }, [allPlacements, filters]);

  const refreshCellar = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const res = await fetch(
        `/api/cellar?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`,
        { cache: 'no-store' },
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.items)) {
          setCellarItems(data.items);
        }
      }
    } catch {
      // silent
    } finally {
      fetchingRef.current = false;
    }
  }, [userId]);

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
    userId, refreshCellar,
  ]);

  return (
    <CellarRackContext.Provider value={value}>
      {children}
    </CellarRackContext.Provider>
  );
}
