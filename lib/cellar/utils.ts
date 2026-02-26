import type { CellarItem } from '@/components/pages/cellar-page';
import type {
  Placement, ReadinessTag, WineCategory, CellarFilters, Rack, SlotId,
} from './types';
import { normalizeWineType, computeAllSlots } from './types';

export function computeReadiness(
  drinkFrom?: string | null,
  drinkUntil?: string | null,
): ReadinessTag {
  const now = new Date().getFullYear();
  const from = drinkFrom ? new Date(drinkFrom).getFullYear() : 0;
  const until = drinkUntil ? new Date(drinkUntil).getFullYear() : 9999;
  if (now > until) return 'past-peak';
  if (now >= from && now <= until) return 'ready';
  return 'hold';
}

function getWineFromItem(item: CellarItem) {
  return Array.isArray(item.wines) ? item.wines[0] ?? null : item.wines;
}

export function cellarItemToPlacement(
  item: CellarItem,
  slotId?: string,
): Placement | null {
  const wine = getWineFromItem(item);
  if (!wine) return null;
  // Skip fully consumed items from active cellar views
  if (item.consumed_at && item.quantity <= 0) return null;
  return {
    slotId: slotId || '',
    cellarItemId: item.id,
    wineId: wine.id,
    wineType: normalizeWineType(wine.wine_type) as WineCategory,
    wineName: wine.name,
    winery: wine.winery,
    quantity: item.quantity,
    addedAt: item.purchase_date || '',
    notes: item.notes,
    purchasePrice: item.purchase_price,
    readinessTag: computeReadiness(item.drink_from, item.drink_until),
    drinkFrom: item.drink_from,
    drinkUntil: item.drink_until,
    openedAt: item.opened_at,
    consumedAt: item.consumed_at,
    isGift: item.is_gift,
    imageUrl: wine.image_url,
    rating: wine.vivino_rating,
    region: wine.region,
    country: wine.country,
    grapes: wine.grapes,
  };
}

export function matchesFilters(
  placement: Placement,
  filters: CellarFilters,
): boolean {
  if (filters.search) {
    const q = filters.search.toLowerCase();
    const searchable = [
      placement.wineName,
      placement.winery,
      placement.region,
      placement.country,
      ...(placement.grapes || []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(q)) return false;
  }

  if (filters.types.length > 0 && !filters.types.includes(placement.wineType)) {
    return false;
  }

  if (filters.readiness.length > 0) {
    const tag = placement.readinessTag || 'hold';
    if (!filters.readiness.includes(tag)) return false;
  }

  if (filters.minRating > 0 && (placement.rating ?? 0) < filters.minRating) {
    return false;
  }

  if (filters.regions.length > 0) {
    const region = (placement.region || placement.country || '').toLowerCase();
    if (!filters.regions.some((r) => region.includes(r.toLowerCase()))) return false;
  }

  return true;
}

export function sortPlacements(
  placements: Placement[],
  sort: CellarFilters['sort'],
): Placement[] {
  const sorted = [...placements];
  switch (sort) {
    case 'name':
      sorted.sort((a, b) => a.wineName.localeCompare(b.wineName));
      break;
    case 'date-added':
      sorted.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      break;
    case 'price':
      sorted.sort((a, b) => (b.purchasePrice ?? 0) - (a.purchasePrice ?? 0));
      break;
    case 'rating':
      sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case 'readiness': {
      const order: Record<string, number> = { ready: 0, hold: 1, 'past-peak': 2 };
      sorted.sort(
        (a, b) =>
          (order[a.readinessTag || 'hold'] ?? 1) - (order[b.readinessTag || 'hold'] ?? 1),
      );
      break;
    }
  }
  return sorted;
}

export function getEmptySlots(
  rack: Rack,
  placementMap: Map<SlotId, Placement>,
): SlotId[] {
  return computeAllSlots(rack).filter((id) => !placementMap.has(id));
}

export function getUniqueRegions(placements: Placement[]): string[] {
  const regions = new Set<string>();
  for (const p of placements) {
    if (p.region) regions.add(p.region);
    if (p.country) regions.add(p.country);
  }
  return Array.from(regions).sort();
}
