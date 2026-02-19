'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface RadarChartProps {
  values: { body: number; tannin: number; sweetness: number; acidity: number };
  labels?: { body: string; tannin: string; sweetness: string; acidity: string };
  size?: number;
  color?: string;
  className?: string;
  animated?: boolean;
}

const DEFAULT_LABELS = { body: 'Body', tannin: 'Tannin', sweetness: 'Sweet', acidity: 'Acidity' };

export function RadarChart({
  values,
  labels = DEFAULT_LABELS,
  size = 200,
  color = 'rgb(90, 30, 42)',
  className,
  animated = true,
}: RadarChartProps) {
  const pad = size * 0.18;
  const svgSize = size + pad * 2;
  const center = svgSize / 2;
  const radius = size * 0.38;
  const axes = ['body', 'tannin', 'sweetness', 'acidity'] as const;
  const angles = axes.map((_, i) => (Math.PI * 2 * i) / axes.length - Math.PI / 2);

  const getPoint = (angle: number, value: number) => ({
    x: center + radius * (value / 100) * Math.cos(angle),
    y: center + radius * (value / 100) * Math.sin(angle),
  });

  const gridLevels = [25, 50, 75, 100];

  const dataPoints = useMemo(
    () => axes.map((axis, i) => getPoint(angles[i], values[axis])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [values.body, values.tannin, values.sweetness, values.acidity, size]
  );

  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className={cn('relative inline-block', className)}>
      <svg width={size} height={size} viewBox={`0 0 ${svgSize} ${svgSize}`}>
        {/* Grid */}
        {gridLevels.map(level => {
          const points = angles.map(a => getPoint(a, level));
          const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
          return (
            <path
              key={level}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {angles.map((a, i) => {
          const end = getPoint(a, 100);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={1}
            />
          );
        })}

        {/* Data polygon */}
        <path
          d={polygonPath}
          fill={color}
          fillOpacity={0.15}
          stroke={color}
          strokeWidth={2}
          className={animated ? 'transition-all duration-700 ease-premium' : ''}
        />

        {/* Data points */}
        {dataPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={color}
            className={animated ? 'transition-all duration-700 ease-premium' : ''}
          />
        ))}

        {/* Labels */}
        {axes.map((axis, i) => {
          const labelPoint = getPoint(angles[i], 125);
          const isTop = i === 0;
          const isBottom = i === 2;
          return (
            <text
              key={axis}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline={isTop ? 'auto' : isBottom ? 'hanging' : 'middle'}
              className="fill-muted-foreground text-[11px] font-medium"
            >
              {labels[axis]}
            </text>
          );
        })}

        {/* Value labels */}
        {axes.map((axis, i) => {
          const valPoint = getPoint(angles[i], values[axis] + 15);
          return (
            <text
              key={`val-${axis}`}
              x={valPoint.x}
              y={valPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[10px] font-bold"
            >
              {values[axis]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
