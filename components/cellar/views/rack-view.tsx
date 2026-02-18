'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Wine } from 'lucide-react';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { UnassignedBin } from '@/components/cellar/unassigned-bin';
import { EmptyState } from '@/components/ui/empty-state';
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
  const t = useTranslations('cellar');
  const { activeRack, setIsRackBuilderOpen, setEditingRack } = useCellarRack();

  if (!activeRack) {
    return (
      <EmptyState
        icon={Wine}
        title={t('noRack')}
        description={t('noRackDesc')}
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
    </div>
  );
}
