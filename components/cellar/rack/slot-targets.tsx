'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useThree } from '@react-three/fiber';
import type { SlotId, Placement } from '@/lib/cellar/types';

interface SlotTargetsProps {
  slotPositions: { slotId: SlotId; x: number; y: number; z: number }[];
  placementMap: Map<SlotId, Placement>;
  selectedSlotId: SlotId | null;
  isPickerMode: boolean;
  onSlotClick: (slotId: SlotId) => void;
}

const TARGET_WIDTH = 0.7;
const TARGET_HEIGHT = 0.85;

export function SlotTargets({
  slotPositions, placementMap, selectedSlotId, isPickerMode, onSlotClick,
}: SlotTargetsProps) {
  const [hoveredSlot, setHoveredSlot] = useState<SlotId | null>(null);
  const { invalidate } = useThree();

  useEffect(() => {
    return () => { document.body.style.cursor = 'auto'; };
  }, []);

  return (
    <group>
      {slotPositions.map(({ slotId, x, y, z }) => {
        const hasBottle = placementMap.has(slotId);
        const isSelected = slotId === selectedSlotId;
        const isHovered = slotId === hoveredSlot;
        const showHighlight = isPickerMode && !hasBottle;

        return (
          <mesh
            key={slotId}
            position={[x, y + TARGET_HEIGHT / 2 + 0.05, z + 0.01]}
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick(slotId);
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredSlot(slotId);
              document.body.style.cursor = 'pointer';
              invalidate();
            }}
            onPointerOut={() => {
              setHoveredSlot(null);
              document.body.style.cursor = 'auto';
              invalidate();
            }}
          >
            <planeGeometry args={[TARGET_WIDTH, TARGET_HEIGHT]} />
            <meshBasicMaterial
              color={
                isSelected
                  ? '#d4a050'
                  : showHighlight
                    ? '#a6192e'
                    : isHovered
                      ? '#888888'
                      : '#ffffff'
              }
              transparent
              opacity={
                isSelected
                  ? 0.25
                  : showHighlight
                    ? 0.15
                    : isHovered
                      ? 0.1
                      : 0
              }
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
