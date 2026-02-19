'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useTranslations } from 'next-intl';
import { WineOff } from 'lucide-react';
import { RackScene } from './rack-scene';
import type { Rack, Placement, ReadinessTag } from '@/lib/cellar/types';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';
import { formatCurrency } from '@/lib/utils';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';

const OPEN_WINE_DAYS: Record<string, number> = {
  red: 5, white: 3, rose: 3, sparkling: 1, dessert: 14,
};

function getOpenedData(userId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(`cellar-opened:${userId}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function WineTooltip({ placement, openedAt }: { placement: Placement; openedAt?: string | null }) {
  const t = useTranslations('cellar');

  const readinessConfig: Record<ReadinessTag, { color: string; label: string }> = {
    ready: { color: 'bg-green-500', label: t('filterReady') },
    hold: { color: 'bg-yellow-500', label: t('filterHold') },
    'past-peak': { color: 'bg-red-500', label: t('filterPastPeak') },
  };

  const readiness = placement.readinessTag ? readinessConfig[placement.readinessTag] : null;

  const openedInfo = openedAt ? (() => {
    const maxDays = OPEN_WINE_DAYS[placement.wineType] ?? 5;
    const elapsed = Math.floor((Date.now() - new Date(openedAt).getTime()) / 86400000);
    const remaining = maxDays - elapsed;
    return { remaining, isExpired: remaining <= 0 };
  })() : null;

  return (
    <div className="bg-card/95 backdrop-blur-sm rounded-xl shadow-lg border border-border/50 p-3 min-w-[200px] max-w-[260px]">
      <div className="flex items-start gap-2">
        <div
          className="h-3 w-3 rounded-full mt-0.5 flex-shrink-0"
          style={{ backgroundColor: WINE_TYPE_COLORS[placement.wineType] }}
        />
        <div className="min-w-0">
          <p className="font-semibold text-sm text-foreground leading-tight">
            {placement.wineName}
          </p>
          <p className="text-xs text-muted-foreground">
            {placement.winery}
          </p>
        </div>
      </div>

      {(placement.region || placement.country) && (
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {[placement.region, placement.country].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {placement.purchasePrice != null && placement.purchasePrice > 0 && (
          <span className="text-xs font-medium text-foreground">
            {formatCurrency(placement.purchasePrice)}
          </span>
        )}
        {readiness && (
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${readiness.color}`} />
            {readiness.label}
          </span>
        )}
      </div>

      {openedInfo && (
        <div className={`flex items-center gap-1.5 mt-2 rounded-md px-2 py-1 ${
          openedInfo.isExpired
            ? 'bg-red-50 dark:bg-red-950/40'
            : 'bg-amber-50 dark:bg-amber-950/40'
        }`}>
          <WineOff className={`h-3 w-3 flex-shrink-0 ${
            openedInfo.isExpired ? 'text-red-500' : 'text-amber-500'
          }`} strokeWidth={1.5} />
          <span className={`text-[11px] font-medium ${
            openedInfo.isExpired
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-700 dark:text-amber-400'
          }`}>
            {openedInfo.isExpired ? t('openedExpired') : t('openedTimeLeft', { days: openedInfo.remaining })}
          </span>
        </div>
      )}
    </div>
  );
}

interface Rack3DCanvasProps {
  rack: Rack;
}

export function Rack3DCanvas({ rack }: Rack3DCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [hoveredPlacement, setHoveredPlacement] = useState<Placement | null>(null);
  const { userId } = useCellarRack();
  const [openedMap, setOpenedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!userId) return;
    setOpenedMap(getOpenedData(userId));
    const onStorage = (e: StorageEvent) => {
      if (e.key === `cellar-opened:${userId}`) setOpenedMap(getOpenedData(userId));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${e.clientX + 16}px`;
      tooltipRef.current.style.top = `${e.clientY - 8}px`;
    }
  }, []);

  const cameraPosition = useMemo<[number, number, number]>(() => {
    const maxDim = Math.max(rack.columns, rack.rows);
    const dist = maxDim * 1.2 + 4;
    return [dist * 0.7, dist * 0.5, dist * 0.7];
  }, [rack.columns, rack.rows]);

  const targetPosition = useMemo<[number, number, number]>(() => {
    return [rack.columns / 2, rack.rows / 2, 0];
  }, [rack.columns, rack.rows]);

  return (
    <>
      <div
        ref={canvasRef}
        role="img"
        aria-label={rack.name}
        className="w-full h-[400px] md:h-[500px] lg:h-[560px] rounded-2xl bg-card shadow-soft overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPlacement(null)}
      >
        <Canvas
          frameloop="demand"
          dpr={[1, 1.5]}
          gl={{ antialias: true, alpha: true }}
          style={{ background: 'transparent' }}
        >
          <PerspectiveCamera
            makeDefault
            position={cameraPosition}
            fov={45}
            near={0.1}
            far={200}
          />

          <OrbitControls
            target={targetPosition}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={Math.max(rack.columns, rack.rows) * 3}
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={0.2}
            dampingFactor={0.1}
            enableDamping={true}
          />

          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />
          <directionalLight position={[-5, 8, -5]} intensity={0.3} />

          <Suspense>
            <RackScene rack={rack} onBottleHover={setHoveredPlacement} openedMap={openedMap} />
          </Suspense>
        </Canvas>
      </div>

      {hoveredPlacement && (
        <div
          ref={tooltipRef}
          className="fixed pointer-events-none z-50"
          style={{ left: mouseRef.current.x + 16, top: mouseRef.current.y - 8 }}
        >
          <WineTooltip
            placement={hoveredPlacement}
            openedAt={openedMap[hoveredPlacement.cellarItemId] ?? null}
          />
        </div>
      )}
    </>
  );
}
