'use client';

import dynamic from 'next/dynamic';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { Rack2DGrid } from '@/components/cellar/rack/rack-2d-grid';
import { UnassignedBin } from '@/components/cellar/unassigned-bin';
import { Skeleton } from '@/components/ui/skeleton';

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
  const { activeRack, viewMode } = useCellarRack();

  if (!activeRack) {
    return null;
  }

  return (
    <div className="space-y-4">
      <UnassignedBin />
      {viewMode === '3d' ? (
        <Rack3DCanvas rack={activeRack} />
      ) : (
        <Rack2DGrid rack={activeRack} />
      )}
    </div>
  );
}
