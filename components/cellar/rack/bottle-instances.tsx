'use client';

import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import type { SlotId, Placement, WineCategory } from '@/lib/cellar/types';
import { WINE_TYPE_COLORS } from '@/lib/cellar/types';

const READINESS_EMISSIVE: Record<string, string> = {
  ready: '#22c55e',
  hold: '#000000',
  'past-peak': '#ef4444',
};

/**
 * Wine-bottle profile revolved around Y axis via LatheGeometry.
 * The bottle stands upright (along Y) and is rotated into place by the instance matrix.
 * Total height ≈ 0.75, body radius ≈ 0.10, neck radius ≈ 0.035.
 */
function createBottleGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [
    // Punt (bottom recess)
    new THREE.Vector2(0.00, 0.00),
    new THREE.Vector2(0.06, 0.01),
    new THREE.Vector2(0.09, 0.02),
    // Body
    new THREE.Vector2(0.10, 0.04),
    new THREE.Vector2(0.10, 0.38),
    // Shoulder curve
    new THREE.Vector2(0.095, 0.41),
    new THREE.Vector2(0.08, 0.44),
    new THREE.Vector2(0.06, 0.47),
    new THREE.Vector2(0.045, 0.49),
    // Neck
    new THREE.Vector2(0.035, 0.51),
    new THREE.Vector2(0.033, 0.64),
    // Collar / lip
    new THREE.Vector2(0.038, 0.66),
    new THREE.Vector2(0.040, 0.68),
    new THREE.Vector2(0.038, 0.70),
    new THREE.Vector2(0.035, 0.71),
    // Top
    new THREE.Vector2(0.033, 0.73),
    new THREE.Vector2(0.00, 0.74),
  ];
  const geom = new THREE.LatheGeometry(pts, 12);
  geom.computeVertexNormals();
  return geom;
}

let _sharedGeom: THREE.LatheGeometry | null = null;
function getBottleGeometry(): THREE.LatheGeometry {
  if (!_sharedGeom) _sharedGeom = createBottleGeometry();
  return _sharedGeom;
}

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
  const bottleGeom = useMemo(() => getBottleGeometry(), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Bottle lies on its side pointing along +Z (outward from rack).
      // Rotate -90° around X so Y-up bottle points along Z.
      dummy.position.set(item.x, item.y + 0.10, item.z + 0.35);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

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
    <instancedMesh ref={meshRef} args={[bottleGeom, undefined, items.length]} castShadow>
      <meshStandardMaterial
        color={color}
        roughness={isLight ? 0.25 : 0.4}
        metalness={isLight ? 0.15 : 0.08}
        transparent
        opacity={0.92}
      />
    </instancedMesh>
  );
}
