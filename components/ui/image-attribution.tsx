'use client';

const SOURCE_LABELS: Record<string, string> = {
  vivino: 'Vivino',
  'wine-searcher': 'Wine-Searcher',
  'wine.com': 'Wine.com',
  totalwine: 'Total Wine',
  klwines: 'K&L Wines',
  winelibrary: 'Wine Library',
  jamesuckling: 'James Suckling',
  winespectator: 'Wine Spectator',
  wineenthusiast: 'Wine Enthusiast',
  web: 'Web',
};

export function ImageAttribution({ source }: { source?: string | null }) {
  if (!source || source === 'selfhosted') return null;
  const label = SOURCE_LABELS[source] || source;
  return (
    <span className="block text-center text-[9px] leading-tight text-stone-400 dark:text-stone-500">
      Image: {label}
    </span>
  );
}
