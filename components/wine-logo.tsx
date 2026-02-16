import { cn } from '@/lib/utils';

interface WineLogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom WineJourney logo – a stylized wine glass with gold accent.
 * Rendered as inline SVG so it scales to any size without asset files.
 */
export function WineLogo({ className, size = 48 }: WineLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Glass bowl */}
      <path
        d="M18 8h28l-4 24a12 12 0 0 1-11.9 10.5h-0.2A12 12 0 0 1 18.1 32L14 8h4Z"
        fill="url(#wineGradient)"
        opacity="0.15"
      />
      {/* Wine liquid */}
      <path
        d="M21.5 20h21l-2.8 12a9 9 0 0 1-8.8 7.2h-0.2A9 9 0 0 1 22 32.2L19.5 20Z"
        fill="url(#wineGradient)"
        opacity="0.85"
      />
      {/* Glass outline */}
      <path
        d="M18 8h28l-4 24a12 12 0 0 1-11.9 10.5h-0.2A12 12 0 0 1 18.1 32L14 8h4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Stem */}
      <line
        x1="32"
        y1="42.5"
        x2="32"
        y2="54"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base */}
      <path
        d="M24 54h16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Gold accent – small sparkle on the glass */}
      <circle cx="38" cy="14" r="1.8" fill="url(#goldAccent)" />
      <circle cx="41" cy="11" r="1" fill="url(#goldAccent)" opacity="0.7" />

      <defs>
        <linearGradient id="wineGradient" x1="32" y1="8" x2="32" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a8254f" />
          <stop offset="100%" stopColor="#722040" />
        </linearGradient>
        <radialGradient id="goldAccent" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#d4a21a" />
        </radialGradient>
      </defs>
    </svg>
  );
}
