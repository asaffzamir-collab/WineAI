'use client';

import { useCallback, useState } from 'react';
import { useSommelier } from '../sommelier-context';
import { ResponseCard } from '../response-card';
import { InsightCard } from '../insight-card';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';

function markBottleAsOpened(userId: string, cellarItemId: string) {
  try {
    const key = `cellar-opened:${userId}`;
    const raw = localStorage.getItem(key);
    const data: Record<string, string> = raw ? JSON.parse(raw) : {};
    data[cellarItemId] = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function ConversationFeed() {
  const { conversationItems, setActiveFlow, userId } = useSommelier();
  const t = useTranslations('sommelier');
  const [markedOpen, setMarkedOpen] = useState<Set<string>>(new Set());

  const handleAction = useCallback((action: string, payload?: Record<string, unknown>) => {
    switch (action) {
      case 'open': {
        const cellarItemId = payload?.cellar_item_id as string | undefined;
        if (cellarItemId && userId) {
          markBottleAsOpened(userId, cellarItemId);
          setMarkedOpen(prev => new Set(prev).add(cellarItemId));
        }
        break;
      }
      case 'search':
        setActiveFlow('search');
        break;
      case 'retry':
        setActiveFlow('tonight');
        break;
      case 'discover':
      case 'find-similar':
        setActiveFlow('wine-discovery');
        break;
      case 'refine':
        setActiveFlow('refinement');
        break;
      case 'cellar':
        setActiveFlow('cellar-context');
        break;
      default:
        break;
    }
  }, [setActiveFlow, userId]);

  if (conversationItems.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{t('emptyFeed')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {conversationItems.map(item => {
        if (item.type === 'insight') {
          return <InsightCard key={item.id} item={item} />;
        }
        const openActionId = item.actions?.find(a => a.action === 'open')?.payload?.cellar_item_id as string | undefined;
        const isOpened = openActionId ? markedOpen.has(openActionId) : false;
        return (
          <ResponseCard
            key={item.id}
            item={isOpened ? {
              ...item,
              actions: item.actions?.map(a =>
                a.action === 'open' ? { ...a, label: t('bottleOpened'), action: '__noop' } : a
              ),
            } : item}
            onAction={handleAction}
            openedActionIcon={isOpened ? <Check className="h-3 w-3 text-green-600 me-1" /> : undefined}
          />
        );
      })}
    </div>
  );
}
