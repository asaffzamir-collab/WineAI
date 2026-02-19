'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import type { PreliminaryProfile, WineSuggestion } from '@/lib/sommelier-types';
import type { WineData } from '@/lib/openai';
import { RadarChart } from '../radar-chart';
import { Loader2, MapPin, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" /></div> }
);

function suggestionToWineData(s: WineSuggestion): WineData {
  return {
    name: s.name,
    winery: s.winery,
    wine_type: 'red',
    country: 'Israel',
    region: s.region,
    grapes: s.grape ? [s.grape] : [],
    winery_description: s.why_match,
  };
}

interface Props {
  profile: PreliminaryProfile | null;
  loading: boolean;
  onFeedback: (feedback: 'yes' | 'close' | 'not_really' | 'skip') => void;
}

export function StepProfileReveal({ profile, loading, onFeedback }: Props) {
  const t = useTranslations('sommelier');
  const [expandedAlt, setExpandedAlt] = useState<number | null>(null);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('generatingProfile')}</p>
      </div>
    );
  }

  const mainWine = suggestionToWineData(profile.wine_suggestion);

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

      {/* Wine suggestion - full WineCard */}
      <div className="w-full mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-bordeaux-500" />
          <span className="text-sm font-semibold">{t('suggestedWine')}</span>
        </div>
        <WineCard wine={mainWine} />
      </div>

      {/* Alternatives */}
      {profile.alternatives.length > 0 && (
        <div className="w-full mt-4 space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{t('alternatives')}</p>
          {profile.alternatives.map((alt, i) => {
            const altWine = suggestionToWineData(alt);
            const isExpanded = expandedAlt === i;
            return (
              <div key={i} className="rounded-xl border border-border/50 overflow-hidden">
                <button
                  onClick={() => setExpandedAlt(isExpanded ? null : i)}
                  className="w-full flex items-center justify-between p-3 text-start"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{alt.name}</p>
                    <p className="text-[11px] text-muted-foreground">{alt.winery} · {alt.region}</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {isExpanded && (
                  <div className="border-t border-border/30 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                    <WineCard wine={altWine} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Three feedback options */}
      <div className="w-full mt-6 space-y-3">
        <button
          onClick={() => onFeedback('yes')}
          className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
        >
          {t('revealConfirm')}
        </button>
        <button
          onClick={() => onFeedback('not_really')}
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          {t('revealRetry')}
        </button>
        <button
          onClick={() => onFeedback('skip')}
          className="w-full rounded-xl border-2 border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent"
        >
          {t('revealSkip')}
        </button>
      </div>
    </div>
  );
}
