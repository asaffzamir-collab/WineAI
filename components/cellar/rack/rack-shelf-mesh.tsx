'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

interface RackShelfMeshProps {
  position: [number, number, number];
  width: number;
  depth: number;
  rows: number;
  cellHeight: number;
}

const SHELF_THICKNESS = 0.06;
const WOOD_COLOR = '#6B5B4F';
const WOOD_SIDE_COLOR = '#5A4A3E';

export function RackShelfMesh({ position, width, depth, rows, cellHeight }: RackShelfMeshProps) {
  const shelves = useMemo(() => {
    const result: { y: number }[] = [];
    // Bottom shelf
    result.push({ y: 0 });
    // Intermediate shelves
    for (let i = 1; i <= rows; i++) {
      result.push({ y: i * cellHeight });
    }
    return result;
  }, [rows, cellHeight]);

  return (
    <group position={position}>
      {/* Horizontal shelf planks */}
      {shelves.map((shelf, i) => (
        <mesh key={i} position={[width / 2, shelf.y, -depth / 2]} castShadow receiveShadow>
          <boxGeometry args={[width, SHELF_THICKNESS, depth]} />
          <meshStandardMaterial
            color={WOOD_COLOR}
            roughness={0.8}
            metalness={0.05}
          />
        </mesh>
      ))}

      {/* Left vertical support */}
      <mesh position={[0, (rows * cellHeight) / 2, -depth / 2]} castShadow>
        <boxGeometry args={[SHELF_THICKNESS, rows * cellHeight, depth]} />
        <meshStandardMaterial color={WOOD_SIDE_COLOR} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Right vertical support */}
      <mesh position={[width, (rows * cellHeight) / 2, -depth / 2]} castShadow>
        <boxGeometry args={[SHELF_THICKNESS, rows * cellHeight, depth]} />
        <meshStandardMaterial color={WOOD_SIDE_COLOR} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Back panel */}
      <mesh position={[width / 2, (rows * cellHeight) / 2, -depth + SHELF_THICKNESS / 2]}>
        <boxGeometry args={[width, rows * cellHeight, SHELF_THICKNESS]} />
        <meshStandardMaterial color={WOOD_SIDE_COLOR} roughness={0.9} metalness={0.02} opacity={0.5} transparent />
      </mesh>
    </group>
  );
}
