'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useCellarRack } from '@/lib/cellar/cellar-rack-context';
import { RackShelfMesh } from './rack-shelf-mesh';
import { BottleInstances } from './bottle-instances';
import { SlotTargets } from './slot-targets';
import type { Rack, SlotId } from '@/lib/cellar/types';
import { buildSlotId } from '@/lib/cellar/types';
import { trackCellar } from '@/lib/cellar/analytics';

const CELL_WIDTH = 0.8;
const CELL_HEIGHT = 1.0;
const LAYER_DEPTH = 0.9;

interface RackSceneProps {
  rack: Rack;
}

export function RackScene({ rack }: RackSceneProps) {
  const {
    placementMap, selectedSlotId, setSelectedSlotId,
    heatmapEnabled, filters, isPickerMode,
  } = useCellarRack();
  const { invalidate } = useThree();

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const slotPositions = useMemo(() => {
    const positions: { slotId: SlotId; x: number; y: number; z: number; row: number }[] = [];
    for (const shelf of rack.shelves) {
      for (let layer = 0; layer < rack.depth; layer++) {
        for (let row = shelf.yStartRow; row < shelf.yStartRow + shelf.heightRows; row++) {
          for (let col = 0; col < rack.columns; col++) {
            const slotId = buildSlotId({
              rackId: rack.id, shelfId: shelf.id, layer, row, col,
            });
            let xOffset = 0;
            if (rack.stackingStyle !== 'aligned' && row % 2 === 1) {
              xOffset = rack.stackingStyle === 'shifted-right'
                ? CELL_WIDTH * 0.25
                : -CELL_WIDTH * 0.25;
            }
            positions.push({
              slotId,
              x: col * CELL_WIDTH + xOffset,
              y: row * CELL_HEIGHT,
              z: -layer * LAYER_DEPTH,
              row,
            });
          }
        }
      }
    }
    return positions;
  }, [rack]);

  const handleSlotClick = useCallback((slotId: SlotId) => {
    setSelectedSlotId(selectedSlotId === slotId ? null : slotId);
    trackCellar('slot_clicked', { filled: placementMap.has(slotId) ? 'true' : 'false' });
    invalidate();
  }, [selectedSlotId, setSelectedSlotId, placementMap, invalidate]);

  // Shelf geometry
  const shelfGeometry = useMemo(() => {
    return rack.shelves.map((shelf) => ({
      id: shelf.id,
      name: shelf.name,
      x: -0.5,
      y: shelf.yStartRow * CELL_HEIGHT - 0.15,
      z: 0.5,
      width: rack.columns * CELL_WIDTH + 0.4,
      depth: rack.depth * LAYER_DEPTH + 0.4,
      rows: shelf.heightRows,
    }));
  }, [rack]);

  return (
    <group>
      {/* Rack frame / shelves */}
      {shelfGeometry.map((s) => (
        <RackShelfMesh
          key={s.id}
          position={[s.x, s.y, s.z]}
          width={s.width}
          depth={s.depth}
          rows={s.rows}
          cellHeight={CELL_HEIGHT}
        />
      ))}

      {/* Bottle instances */}
      <BottleInstances
        slotPositions={slotPositions}
        placementMap={placementMap}
        selectedSlotId={selectedSlotId}
        heatmapEnabled={heatmapEnabled}
      />

      {/* Invisible slot targets for click detection */}
      <SlotTargets
        slotPositions={slotPositions}
        placementMap={placementMap}
        selectedSlotId={selectedSlotId}
        isPickerMode={isPickerMode}
        onSlotClick={handleSlotClick}
      />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rack.columns * CELL_WIDTH / 2 - CELL_WIDTH / 2, -0.2, 0]} receiveShadow>
        <planeGeometry args={[rack.columns * CELL_WIDTH + 3, rack.depth * LAYER_DEPTH + 3]} />
        <meshStandardMaterial color={isDark ? '#2a2a2e' : '#e8e4df'} opacity={0.3} transparent />
      </mesh>
    </group>
  );
}

export { CELL_WIDTH, CELL_HEIGHT, LAYER_DEPTH };
