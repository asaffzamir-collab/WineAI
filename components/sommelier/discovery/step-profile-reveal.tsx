'use client';

import { useTranslations } from 'next-intl';
import type { PreliminaryProfile } from '@/lib/sommelier-types';
import { RadarChart } from '../radar-chart';
import { Loader2, MapPin, Sparkles } from 'lucide-react';

interface Props {
  profile: PreliminaryProfile | null;
  loading: boolean;
  onFeedback: (feedback: 'yes' | 'close' | 'not_really') => void;
}

export function StepProfileReveal({ profile, loading, onFeedback }: Props) {
  const t = useTranslations('sommelier');

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('generatingProfile')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center pt-4">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-1">
        {t('revealTitle')}
      </h3>
      <p className="text-xs text-muted-foreground mb-4">{t('revealSubtitle')}</p>

      <RadarChart
        values={profile.radar}
        size={180}
        labels={{
          body: t('radarBody'),
          tannin: t('radarTannin'),
          sweetness: t('radarSweetness'),
          acidity: t('radarAcidity'),
        }}
      />

      {/* Traits */}
      <div className="flex flex-wrap justify-center gap-2 mt-4">
        {profile.traits.map(trait => (
          <span key={trait} className="rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30 px-3 py-1 text-xs font-medium text-bordeaux-700 dark:text-bordeaux-300">
            {trait}
          </span>
        ))}
      </div>

      {/* Regions */}
      {profile.regions.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{profile.regions.join(' · ')}</span>
        </div>
      )}

      {/* Wine suggestion */}
      <div className="w-full mt-6 rounded-xl border border-border/60 bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-4 w-4 text-bordeaux-500" />
          <span className="text-sm font-semibold">{t('suggestedWine')}</span>
        </div>
        <p className="text-sm font-medium text-foreground">{profile.wine_suggestion.name}</p>
        <p className="text-xs text-muted-foreground">{profile.wine_suggestion.winery} · {profile.wine_suggestion.region}</p>
        <p className="text-xs text-muted-foreground mt-1">{profile.wine_suggestion.why_match}</p>
      </div>

      {/* Alternatives */}
      {profile.alternatives.length > 0 && (
        <div className="w-full mt-3 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{t('alternatives')}</p>
          {profile.alternatives.map((alt, i) => (
            <div key={i} className="rounded-lg border border-border/40 p-3">
              <p className="text-xs font-medium">{alt.name}</p>
              <p className="text-[11px] text-muted-foreground">{alt.winery} · {alt.region}</p>
            </div>
          ))}
        </div>
      )}

      {/* Three feedback options directly on the reveal screen */}
      <div className="w-full mt-6 space-y-3">
        <button
          onClick={() => onFeedback('yes')}
          className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
        >
          {t('revealConfirm')}
        </button>
        <button
          onClick={() => onFeedback('close')}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {t('revealClose')}
        </button>
        <button
          onClick={() => onFeedback('not_really')}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent"
        >
          {t('revealRetry')}
        </button>
      </div>
    </div>
  );
}
