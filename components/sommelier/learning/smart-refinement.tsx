'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn, safeId } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface Choice {
  id: 'a' | 'b';
  title: string;
  description: string;
}

export function SmartRefinement() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, addConversationItem, refreshState } = useSommelier();
  const [choices, setChoices] = useState<Choice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        const res = await fetch('/api/sommelier/refine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'generate' }) });
        if (res.ok) {
          const data = await res.json();
          setChoices(data.choices);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    };
    fetchChoices();
  }, []);

  const handleChoice = async (choiceId: 'a' | 'b') => {
    setChoosing(true);
    try {
      const res = await fetch('/api/sommelier/refine', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'choose', choice: choiceId }) });
      if (res.ok) {
        const data = await res.json();
        addConversationItem({
          id: safeId(),
          type: 'insight',
          title: t('refinementResult'),
          content: data.insight || t('refinementUpdated'),
          created_at: new Date().toISOString(),
        });
        await refreshState();
        window.dispatchEvent(new Event('wine-profile-updated'));
      }
    } catch { /* ignore */ }
    finally { setActiveFlow(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-bordeaux-500 mb-4" />
        <p className="text-sm text-muted-foreground">{t('generatingChoices')}</p>
      </div>
    );
  }

  if (!choices) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">{t('errorLoadingChoices')}</p>
        <button onClick={() => setActiveFlow(null)} className="mt-4 text-sm text-bordeaux-600 underline">{t('goBack')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col pt-6 px-4">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">{t('refinementTitle')}</h3>
      <p className="text-sm text-muted-foreground text-center mb-8">{t('refinementSubtitle')}</p>

      <div className="space-y-4">
        {choices.map(choice => (
          <button
            key={choice.id}
            onClick={() => handleChoice(choice.id)}
            disabled={choosing}
            className={cn(
              'w-full rounded-xl border-2 border-border/50 p-5 text-start transition-all',
              'hover:border-bordeaux-400 hover:shadow-soft active:scale-[0.98]',
              choosing && 'opacity-50 pointer-events-none'
            )}
          >
            <p className="text-sm font-semibold text-foreground mb-1">{choice.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{choice.description}</p>
          </button>
        ))}
      </div>

      {choosing && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Loader2 className="h-4 w-4 animate-spin text-bordeaux-500" />
          <span className="text-sm text-muted-foreground">{t('updatingProfile')}</span>
        </div>
      )}
    </div>
  );
}
