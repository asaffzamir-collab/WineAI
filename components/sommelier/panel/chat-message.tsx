'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Wine, Loader2, ChevronRight } from 'lucide-react';
import type { ChatMessage, ChatWineCard } from '@/lib/sommelier-types';
import { useSommelier } from '../sommelier-context';
import { PierHeadAvatar } from '../sommelier-trigger';

function WineMiniCard({ wine }: { wine: ChatWineCard }) {
  const { setActiveFlow, setPendingSearchQuery } = useSommelier();
  const [lazyUrl, setLazyUrl] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (wine.image_url || lazyUrl || fetched.current || !wine.name) return;
    fetched.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(wine.name)}&winery=${encodeURIComponent(wine.winery)}`)
      .then((r) => r.json())
      .then((d) => { if (d.imageUrl) setLazyUrl(d.imageUrl); })
      .catch(() => {});
  }, [wine.name, wine.winery, wine.image_url, lazyUrl]);

  const imgSrc = wine.image_url || lazyUrl;

  const handleClick = () => {
    const q = `${wine.name} ${wine.winery}`.trim();
    setPendingSearchQuery(q);
    setActiveFlow('search');
  };

  return (
    <button
      onClick={handleClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-background p-3 text-start transition-colors hover:bg-accent/50 hover:border-bordeaux-200 dark:hover:border-bordeaux-800 cursor-pointer"
    >
      {imgSrc ? (
        <div className="h-10 w-8 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
          <img src={imgSrc} alt="" className="h-full w-full object-contain" loading="lazy" />
        </div>
      ) : (
        <div className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
          <Wine className="h-4 w-4 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{wine.name}</p>
        <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
        {wine.reason && (
          <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">{wine.reason}</p>
        )}
      </div>
      {wine.match != null && (
        <span className="flex-shrink-0 rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 px-2 py-0.5 text-xs font-semibold text-bordeaux-600 dark:text-bordeaux-300">
          {wine.match}%
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
    </button>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';

  if (message.isStreaming && !message.content) {
    return (
      <div className="flex justify-start items-start gap-2.5">
        <PierHeadAvatar className="h-7 w-7 flex-shrink-0 mt-0.5 rounded-full" />
        <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-card border border-border/50 px-4 py-3 shadow-soft">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-bordeaux-500" />
            <span className="text-sm text-muted-foreground animate-pulse">Pier is thinking...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start items-start gap-2.5')}>
      {!isUser && (
        <PierHeadAvatar className="h-7 w-7 flex-shrink-0 mt-0.5 rounded-full" />
      )}
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3 shadow-soft',
          isUser
            ? 'rounded-br-md bg-bordeaux-600 text-white dark:bg-bordeaux-700'
            : 'rounded-tl-md bg-card border border-border/50 text-foreground'
        )}
      >
        <p className={cn(
          'text-sm leading-relaxed whitespace-pre-wrap',
          isUser ? 'text-white' : 'text-foreground'
        )}>
          {message.content}
        </p>

        {message.wines && message.wines.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.wines.map((wine, i) => (
              <WineMiniCard key={`${wine.name}-${i}`} wine={wine} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
