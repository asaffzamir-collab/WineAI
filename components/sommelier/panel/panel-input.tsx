'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn, safeId } from '@/lib/utils';

export function PanelInput() {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const { addConversationItem } = useSommelier();
  const t = useTranslations('sommelier');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (!query || loading) return;

    setLoading(true);
    setValue('');

    try {
      const res = await fetch('/api/sommelier/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (res.ok) {
        const data = await res.json();
        addConversationItem({
          id: safeId(),
          type: 'response',
          title: data.title || query,
          content: data.content || '',
          reasons: data.reasons,
          confidence: data.confidence,
          actions: data.actions,
          created_at: new Date().toISOString(),
        });
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border/50 px-4 py-3 flex-shrink-0">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={t('inputPlaceholder')}
        className={cn(
          'flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm',
          'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring'
        )}
        disabled={loading}
      />
      <button
        type="submit"
        disabled={!value.trim() || loading}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-bordeaux-600 text-white transition-colors hover:bg-bordeaux-700 disabled:opacity-40"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
