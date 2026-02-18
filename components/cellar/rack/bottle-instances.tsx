'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { SlotId, Placement, WineCategory } from '@/lib/cellar/types';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';

const BOTTLE_RADIUS = 0.12;
const BOTTLE_HEIGHT = 0.7;
const NECK_RADIUS = 0.06;
const NECK_HEIGHT = 0.2;

const READINESS_EMISSIVE: Record<string, string> = {
  ready: '#22c55e',
  hold: '#000000',
  'past-peak': '#ef4444',
};

interface BottleInstancesProps {
  slotPositions: { slotId: SlotId; x: number; y: number; z: number }[];
  placementMap: Map<SlotId, Placement>;
  selectedSlotId: SlotId | null;
  heatmapEnabled: boolean;
}

const CATEGORY_ORDER: WineCategory[] = ['red', 'white', 'rose', 'sparkling', 'other'];

export function BottleInstances({
  slotPositions, placementMap, selectedSlotId, heatmapEnabled,
}: BottleInstancesProps) {
  const groups = useMemo(() => {
    const result: Record<WineCategory, { slotId: SlotId; x: number; y: number; z: number; placement: Placement }[]> = {
      red: [], white: [], rose: [], sparkling: [], other: [],
    };
    for (const pos of slotPositions) {
      const p = placementMap.get(pos.slotId);
      if (p) {
        const cat = p.wineType || 'other';
        result[cat].push({ ...pos, placement: p });
      }
    }
    return result;
  }, [slotPositions, placementMap]);

  return (
    <>
      {CATEGORY_ORDER.map((cat) => {
        const items = groups[cat];
        if (items.length === 0) return null;
        return (
          <BottleCategoryGroup
            key={cat}
            category={cat}
            items={items}
            selectedSlotId={selectedSlotId}
            heatmapEnabled={heatmapEnabled}
          />
        );
      })}
    </>
  );
}

interface BottleCategoryGroupProps {
  category: WineCategory;
  items: { slotId: SlotId; x: number; y: number; z: number; placement: Placement }[];
  selectedSlotId: SlotId | null;
  heatmapEnabled: boolean;
}

function BottleCategoryGroup({ category, items, selectedSlotId, heatmapEnabled }: BottleCategoryGroupProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = WINE_TYPE_COLORS[category];
  const isLight = category === 'white' || category === 'sparkling';

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      dummy.position.set(item.x, item.y + BOTTLE_RADIUS + 0.05, item.z);
      dummy.rotation.set(Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Color per instance
      const isSelected = item.slotId === selectedSlotId;
      if (isSelected) {
        tempColor.set('#d4a050');
      } else if (heatmapEnabled && item.placement.readinessTag) {
        tempColor.set(READINESS_EMISSIVE[item.placement.readinessTag] || color);
      } else {
        tempColor.set(color);
      }
      mesh.setColorAt(i, tempColor);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items, selectedSlotId, heatmapEnabled, dummy, tempColor, color]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, items.length]} castShadow>
      <capsuleGeometry args={[BOTTLE_RADIUS, BOTTLE_HEIGHT, 4, 8]} />
      <meshStandardMaterial
        color={color}
        roughness={isLight ? 0.3 : 0.5}
        metalness={isLight ? 0.1 : 0.05}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}
