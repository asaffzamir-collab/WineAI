'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { PreliminaryProfile, WineSuggestion } from '@/lib/sommelier-types';
import { RadarChart } from '../radar-chart';
import { Loader2, MapPin, Sparkles, Wine, ChevronRight, ArrowLeft } from 'lucide-react';
import { ImageAttribution } from '@/components/ui/image-attribution';

interface Props {
  profile: PreliminaryProfile | null;
  loading: boolean;
  onFeedback: (feedback: 'yes' | 'close' | 'not_really' | 'skip') => void;
}

function SuggestionImage({ name, winery }: { name: string; winery?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [imgSource, setImgSource] = useState<string | null>(null);
  const fetched = useRef(false);
  useEffect(() => {
    if (fetched.current || !name) return;
    fetched.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(name)}&winery=${encodeURIComponent(winery || '')}`)
      .then(r => r.json()).then(d => {
        if (d.imageUrl) {
          setUrl(d.imageUrl);
          if (d.imageSource) setImgSource(d.imageSource);
        }
      }).catch(() => {});
  }, [name, winery]);

  if (url) {
    return (
      <div className="flex flex-shrink-0 flex-col items-center gap-0.5">
        <div className="h-10 w-10 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
          <img src={url} alt={name} className="h-full w-full object-contain" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <ImageAttribution source={imgSource} />
      </div>
    );
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
      <Wine className="h-5 w-5 text-bordeaux-500" strokeWidth={1.5} />
    </div>
  );
}

export function StepProfileReveal({ profile, loading, onFeedback }: Props) {
  const t = useTranslations('sommelier');
  const [selectedWine, setSelectedWine] = useState<WineSuggestion | null>(null);

  if (loading || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('generatingProfile')}</p>
      </div>
    );
  }

  if (selectedWine) {
    return (
      <div className="flex flex-col pt-4">
        <button
          onClick={() => setSelectedWine(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <SuggestionImage name={selectedWine.name} winery={selectedWine.winery} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{selectedWine.name}</p>
              <p className="text-xs text-muted-foreground">{selectedWine.winery}</p>
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{selectedWine.region}</span>
            </div>
            {selectedWine.grape && (
              <p className="font-medium text-foreground">{selectedWine.grape}</p>
            )}
            {selectedWine.description && (
              <p className="leading-relaxed pt-1">{selectedWine.description}</p>
            )}
            {selectedWine.why_match && (
              <p className="leading-relaxed pt-1 italic">{selectedWine.why_match}</p>
            )}
          </div>
        </div>
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
        {profile.traits?.map(trait => (
          <span key={trait} className="rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30 px-3 py-1 text-xs font-medium text-bordeaux-700 dark:text-bordeaux-300">
            {trait}
          </span>
        ))}
      </div>

      {/* Regions */}
      {(profile.regions?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span>{profile.regions?.join(' · ')}</span>
        </div>
      )}

      {/* Wine suggestion - clickable card */}
      {profile.wine_suggestion && (
        <div className="w-full mt-6">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-bordeaux-500" />
            <span className="text-sm font-semibold">{t('suggestedWine')}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedWine(profile.wine_suggestion)}
            className="w-full text-start rounded-xl border border-border/50 bg-card p-3.5 transition-colors hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20"
          >
            <div className="flex items-center gap-3">
              <SuggestionImage name={profile.wine_suggestion.name} winery={profile.wine_suggestion.winery} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{profile.wine_suggestion.name}</p>
                <p className="text-xs text-muted-foreground">{profile.wine_suggestion.winery} · {profile.wine_suggestion.region}</p>
                {profile.wine_suggestion.grape && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">{profile.wine_suggestion.grape}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{profile.wine_suggestion.why_match}</p>
          </button>
        </div>
      )}

      {/* Alternatives - clickable list */}
      {(profile.alternatives?.length ?? 0) > 0 && (
        <div className="w-full mt-3 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">{t('alternatives')}</p>
          {profile.alternatives?.map((alt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedWine(alt)}
              className="w-full text-start flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 transition-colors hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20"
            >
              <SuggestionImage name={alt.name} winery={alt.winery} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{alt.name}</p>
                <p className="text-[11px] text-muted-foreground">{alt.winery} · {alt.region}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
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
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20"
        >
          {t('revealRetry')}
        </button>
        <button
          onClick={() => onFeedback('skip')}
          className="w-full rounded-xl border-2 border-border/60 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20"
        >
          {t('revealSkip')}
        </button>
      </div>
    </div>
  );
}
