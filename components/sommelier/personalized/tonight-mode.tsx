'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn } from '@/lib/utils';
import { Loader2, Wine, Utensils, Sparkles } from 'lucide-react';

type TonightStep = 'occasion' | 'food' | 'mood' | 'result';

const OCCASIONS = ['casual_dinner', 'date_night', 'hosting', 'solo_relaxing', 'celebration'];
const MOODS = ['casual', 'special'];

export function TonightMode() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem } = useSommelier();
  const [step, setStep] = useState<TonightStep>('occasion');
  const [occasion, setOccasion] = useState('');
  const [food, setFood] = useState('');
  const [mood, setMood] = useState('');
  const [result, setResult] = useState<{ wine: string; why: string; match: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOccasion = (occ: string) => {
    setOccasion(occ);
    setStep('food');
  };

  const handleFood = (f: string) => {
    setFood(f);
    setStep('mood');
  };

  const handleMood = async (m: string) => {
    setMood(m);
    setLoading(true);
    setStep('result');
    try {
      const res = await fetch('/api/sommelier/tonight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ occasion, food: food || undefined, mood: m }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        addConversationItem({
          id: crypto.randomUUID(),
          type: 'response',
          title: t('tonightResult'),
          content: data.why,
          confidence: 'high',
          reasons: data.reasons,
          actions: [
            { label: t('openBottle'), action: 'open', payload: { wine: data.wine } },
            { label: t('tryAnother'), action: 'retry' },
          ],
          created_at: new Date().toISOString(),
        });
      }
    } catch { /* ignore */ }
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
    return (
      <div className="flex flex-col items-center pt-8 px-4">
        <Sparkles className="h-8 w-8 text-bordeaux-500 mb-3" />
        <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('tonightSuggestion')}</h3>
        {result && (
          <div className="w-full rounded-xl border border-border/60 bg-card p-5 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Wine className="h-5 w-5 text-bordeaux-500" />
              <span className="text-base font-semibold">{result.wine}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{result.why}</p>
            {result.match > 0 && (
              <div className="mt-3 text-xs font-semibold text-bordeaux-600">{result.match}% {t('match')}</div>
            )}
          </div>
        )}
        <button onClick={() => setActiveFlow(null)} className="mt-6 rounded-xl bg-bordeaux-600 px-6 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
          {t('done')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-6 px-4">
      {step === 'occasion' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-6">{t('tonightOccasion')}</h3>
          <div className="space-y-2.5">
            {OCCASIONS.map(occ => (
              <button key={occ} onClick={() => handleOccasion(occ)} className="w-full rounded-xl border border-border/50 p-4 text-sm font-medium text-start hover:bg-accent transition-colors">
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
          <button onClick={() => handleFood(food)} className="w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white hover:bg-bordeaux-700 transition-colors">
            {food ? t('continue') : t('skipFood')}
          </button>
        </>
      )}

      {step === 'mood' && (
        <>
          <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-6">{t('tonightMood')}</h3>
          <div className="grid grid-cols-2 gap-4">
            {MOODS.map(m => (
              <button
                key={m}
                onClick={() => handleMood(m)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border-2 border-border/50 p-6 transition-all',
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
