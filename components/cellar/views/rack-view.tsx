'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/user-context';
import { Wine } from 'lucide-react';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { UnassignedBin } from '@/components/cellar/unassigned-bin';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { LocationPickerModal } from '@/components/cellar/location-picker/location-picker-modal';
import { trackCellar } from '@/lib/cellar/analytics';

const Rack3DCanvas = dynamic(
  () => import('@/components/cellar/rack/rack-3d-canvas').then((m) => m.Rack3DCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] md:h-[500px] lg:h-[560px] rounded-2xl bg-card shadow-soft flex items-center justify-center">
        <Skeleton className="w-full h-full rounded-2xl" />
      </div>
    ),
  },
);

export function RackView() {
  const t = useTranslations('cellar');
  const { gender } = useUser();
  const g = { gender };
  const {
    activeRack, setIsRackBuilderOpen, setEditingRack,
    placingItemId, setPlacingItemId, racks, placementMap, assignSlot,
    racksReady,
  } = useCellarRack();

  const autoPickerShown = useRef(false);
  const showAutoPlace = !!placingItemId && racks.length > 0 && !autoPickerShown.current;

  useEffect(() => {
    if (placingItemId && racks.length > 0) {
      autoPickerShown.current = false;
    }
  }, [placingItemId, racks.length]);

  if (!racksReady) {
    return (
      <div className="rounded-2xl bg-card shadow-soft p-4">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/5] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!activeRack) {
    return (
      <EmptyState
        icon={Wine}
        title={t('noRack')}
        description={t('noRackDesc', g)}
        actionLabel={t('createRack')}
        onAction={() => {
          setEditingRack(null);
          setIsRackBuilderOpen(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <UnassignedBin />
      <Rack3DCanvas rack={activeRack} />

      {showAutoPlace && (
        <LocationPickerModal
          open
          onClose={() => {
            autoPickerShown.current = true;
            setPlacingItemId(null);
          }}
          onSelectSlot={(slotId) => {
            autoPickerShown.current = true;
            assignSlot(placingItemId!, slotId);
            trackCellar('bottle_added_to_slot');
            setPlacingItemId(null);
          }}
          racks={racks}
          placementMap={placementMap}
        />
      )}
    </div>
  );
}
