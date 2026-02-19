'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn } from '@/lib/utils';
import { Loader2, Wine, Utensils, Sparkles, ArrowLeft, MapPin, Grape, AlertCircle } from 'lucide-react';
import { safeId } from '@/lib/utils';

type TonightStep = 'occasion' | 'food' | 'mood' | 'result';

const OCCASIONS = ['casual_dinner', 'date_night', 'hosting', 'solo_relaxing', 'celebration'];
const MOODS = ['casual', 'special'];

function ResultImage({ name, winery, imageUrl }: { name: string; winery?: string; imageUrl?: string | null }) {
  const [url, setUrl] = useState<string | null>(imageUrl || null);
  const fetched = useRef(false);
  useEffect(() => {
    if (url || fetched.current || !name) return;
    fetched.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(name)}&winery=${encodeURIComponent(winery || '')}`)
      .then(r => r.json()).then(d => { if (d.imageUrl) setUrl(d.imageUrl); }).catch(() => {});
  }, [name, winery, url]);
  if (url) {
    return (
      <div className="h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-ivory-300 shadow-soft dark:bg-charcoal-700">
        <img src={url} alt={name} className="h-full w-full object-contain" loading="lazy" onError={() => setUrl(null)} />
      </div>
    );
  }
  return (
    <div className="flex h-28 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
      <Wine className="h-8 w-8 text-bordeaux-500" strokeWidth={1.5} />
    </div>
  );
}

export function TonightMode() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [step, setStep] = useState<TonightStep>('occasion');
  const [occasion, setOccasion] = useState('');
  const [food, setFood] = useState('');
  const [result, setResult] = useState<{
    wine: string; winery?: string; region?: string; grape?: string; wine_type?: string;
    why: string; match: number; reasons?: string[]; image_url?: string | null;
    cellar_item_id?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const handleOccasion = (occ: string) => {
    setOccasion(occ);
    setStep('food');
  };

  const handleFoodSubmit = async (mood: string) => {
    setLoading(true);
    setError(false);
    setStep('result');
    try {
      const res = await fetch('/api/sommelier/tonight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion, food: food || undefined, mood }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        addConversationItem({
          id: safeId(),
          type: 'response',
          title: t('tonightResult'),
          content: data.why,
          confidence: 'high',
          reasons: data.reasons,
          actions: [
            { label: t('openBottle'), action: 'open', payload: { wine: data.wine, cellar_item_id: data.cellar_item_id } },
            { label: t('tryAnother'), action: 'retry' },
          ],
          created_at: new Date().toISOString(),
        });
      } else { setError(true); }
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  if (step === 'result') {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
          <p className="text-sm text-muted-foreground">{t('findingWine')}</p>
        </div>
      );
    }
    if (error && !result) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground text-center mb-4">{t('discoveryError')}</p>
          <button onClick={() => { setStep('occasion'); setResult(null); setError(false); setOccasion(''); setFood(''); }} className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors">
            {t('tryAgain')}
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col pt-4 px-4 pb-6">
        <button
          onClick={() => { setStep('occasion'); setResult(null); setOccasion(''); setFood(''); }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>

        <div className="flex flex-col items-center">
          <Sparkles className="h-8 w-8 text-bordeaux-500 mb-3" />
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-4">{t('tonightSuggestion')}</h3>
        </div>

        {result && (
          <div className="rounded-xl border border-border/50 bg-card p-4 shadow-soft">
            <div className="flex items-start gap-4">
              <ResultImage name={result.wine} winery={result.winery} imageUrl={result.image_url} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{result.wine}</p>
                    {result.winery && <p className="text-xs text-muted-foreground">{result.winery}</p>}
                  </div>
                  {result.match > 0 && (
                    <span className="rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/30 px-2.5 py-1 text-xs font-bold text-bordeaux-600 dark:text-bordeaux-300 flex-shrink-0">
                      {result.match}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                  {result.grape && (
                    <span className="flex items-center gap-0.5"><Grape className="h-3 w-3" />{result.grape}</span>
                  )}
                  {result.region && (
                    <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{result.region}</span>
                  )}
                </div>
                {result.wine_type && (
                  <span className="mt-1.5 inline-block rounded-full bg-bordeaux-100 dark:bg-bordeaux-900/30 px-2 py-0.5 text-[10px] font-medium text-bordeaux-700 dark:text-bordeaux-300">
                    {result.wine_type}
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-3">{result.why}</p>
            {result.reasons && result.reasons.length > 0 && (
              <ul className="mt-2 space-y-1">
                {result.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-bordeaux-400 flex-shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => { setStep('occasion'); setResult(null); setOccasion(''); setFood(''); }}
            className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors"
          >
            {t('tryAnother')}
          </button>
          <button
            onClick={() => setActiveFlow(null)}
            className="flex-1 rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors"
          >
            {t('done')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-4 px-4 pb-6">
      <button
        onClick={() => step === 'occasion' ? setActiveFlow(null) : setStep('occasion')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </button>

      {step === 'occasion' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-6">{t('tonightOccasion')}</h3>
          <div className="space-y-2.5">
            {OCCASIONS.map(occ => (
              <button key={occ} onClick={() => handleOccasion(occ)} className="w-full rounded-xl border border-border/50 p-4 text-sm font-medium text-start hover:bg-bordeaux-50 dark:hover:bg-bordeaux-900/20 transition-colors">
                {t(`occasion_${occ}`)}
              </button>
            ))}
          </div>
        </>
      )}

      {step === 'food' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('tonightFood')}</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">{t('tonightFoodOptional')}</p>
          <div className="flex items-center gap-2 mb-4">
            <Utensils className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={food}
              onChange={e => setFood(e.target.value)}
              placeholder={t('tonightFoodPlaceholder')}
              className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <h3 className="text-sm font-semibold text-foreground text-center mb-4 mt-6">{t('tonightMood')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => handleFoodSubmit(m)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 border-border/50 p-5 transition-all',
                  'hover:border-bordeaux-400 hover:shadow-soft active:scale-[0.97]'
                )}
              >
                <span className="text-sm font-semibold">{t(`mood_${m}`)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
