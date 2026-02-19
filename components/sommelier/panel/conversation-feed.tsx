'use client';

import { useCallback } from 'react';
import { useSommelier } from '../sommelier-context';
import { ResponseCard } from '../response-card';
import { InsightCard } from '../insight-card';
import { useTranslations } from 'next-intl';

export function ConversationFeed() {
  const { conversationItems, setActiveFlow } = useSommelier();
  const t = useTranslations('sommelier');

  const handleAction = useCallback((action: string) => {
    switch (action) {
      case 'open':
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
  }, [setActiveFlow]);

  if (conversationItems.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-xs text-muted-foreground">{t('emptyFeed')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {conversationItems.map(item => (
        item.type === 'insight'
          ? <InsightCard key={item.id} item={item} />
          : <ResponseCard key={item.id} item={item} onAction={handleAction} />
      ))}
    </div>
  );
}
