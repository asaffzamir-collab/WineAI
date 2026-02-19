'use client';

import { useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { ChatBubble } from './chat-message';
import { Wine } from 'lucide-react';

export function ChatFeed() {
  const { chatMessages } = useSommelier();
  const t = useTranslations('sommelier');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  if (chatMessages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 mb-4">
          <Wine className="h-7 w-7 text-bordeaux-500 dark:text-bordeaux-400" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium text-foreground mb-1">{t('chatWelcomeTitle')}</p>
        <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
          {t('chatWelcomeDesc')}
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      {chatMessages.map(msg => (
        <ChatBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
