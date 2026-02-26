export type StackingStyle = 'aligned' | 'shifted-left' | 'shifted-right';
export type WineCategory = 'red' | 'white' | 'rose' | 'sparkling' | 'other';
export type ReadinessTag = 'ready' | 'hold' | 'past-peak';
export type ShelfZone = 'everyday' | 'special' | 'aging' | 'whites' | 'reds' | 'sparkling' | 'custom';

export interface Rack {
  id: string;
  name: string;
  columns: number;
  rows: number;
  depth: number;
  shelves: Shelf[];
  stackingStyle: StackingStyle;
  createdAt: string;
  updatedAt: string;
}

export interface Shelf {
  id: string;
  name: string;
  yStartRow: number;
  heightRows: number;
  labelColor?: string;
  zone?: ShelfZone;
}

export type SlotId = string;

export interface SlotPosition {
  rackId: string;
  shelfId: string;
  layer: number;
  row: number;
  col: number;
}

export interface Placement {
  slotId: SlotId;
  cellarItemId: string;
  wineId: string;
  wineType: WineCategory;
  wineName: string;
  winery: string;
  quantity: number;
  addedAt: string;
  notes?: string;
  purchasePrice?: number;
  readinessTag?: ReadinessTag;
  drinkFrom?: string | null;
  drinkUntil?: string | null;
  openedAt?: string | null;
  consumedAt?: string | null;
  isGift?: boolean;
  imageUrl?: string;
  rating?: number;
  region?: string;
  country?: string;
  grapes?: string[];
}

export interface CellarFilters {
  search: string;
  types: WineCategory[];
  readiness: ReadinessTag[];
  minRating: number;
  regions: string[];
  sort: SortOption;
}

export type SortOption = 'name' | 'date-added' | 'price' | 'rating' | 'readiness';

export const DEFAULT_FILTERS: CellarFilters = {
  search: '',
  types: [],
  readiness: [],
  minRating: 0,
  regions: [],
  sort: 'date-added',
};

export function createDefaultRack(name: string): Rack {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    columns: 6,
    rows: 6,
    depth: 1,
    shelves: [
      { id: crypto.randomUUID(), name: 'Main', yStartRow: 0, heightRows: 6, zone: 'custom' },
    ],
    stackingStyle: 'aligned',
    createdAt: now,
    updatedAt: now,
  };
}

export function buildSlotId(pos: SlotPosition): SlotId {
  return `${pos.rackId}:${pos.shelfId}:${pos.layer}:${pos.row}:${pos.col}`;
}

export function parseSlotId(slotId: SlotId): SlotPosition | null {
  const parts = slotId.split(':');
  if (parts.length !== 5) return null;
  return {
    rackId: parts[0],
    shelfId: parts[1],
    layer: parseInt(parts[2], 10),
    row: parseInt(parts[3], 10),
    col: parseInt(parts[4], 10),
  };
}

export function computeAllSlots(rack: Rack): SlotId[] {
  const slots: SlotId[] = [];
  for (const shelf of rack.shelves) {
    for (let layer = 0; layer < rack.depth; layer++) {
      for (let row = shelf.yStartRow; row < shelf.yStartRow + shelf.heightRows; row++) {
        for (let col = 0; col < rack.columns; col++) {
          slots.push(buildSlotId({ rackId: rack.id, shelfId: shelf.id, layer, row, col }));
        }
      }
    }
  }
  return slots;
}

export const WINE_TYPE_COLORS: Record<WineCategory, string> = {
  red: '#722F37',
  white: '#F5E6B8',
  rose: '#E8B4B8',
  sparkling: '#C0C0C0',
  other: '#9E9E9E',
};

export const WINE_TYPE_BG_CLASSES: Record<WineCategory, string> = {
  red: 'bg-[#722F37]',
  white: 'bg-[#F5E6B8]',
  rose: 'bg-[#E8B4B8]',
  sparkling: 'bg-[#C0C0C0]',
  other: 'bg-[#9E9E9E]',
};

export function normalizeWineType(type?: string): WineCategory {
  if (!type) return 'other';
  const lower = type.toLowerCase();
  if (lower === 'red') return 'red';
  if (lower === 'white') return 'white';
  if (lower === 'rose' || lower === 'rosé') return 'rose';
  if (lower === 'sparkling') return 'sparkling';
  return 'other';
}
