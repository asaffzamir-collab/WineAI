'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Wine, Loader2, ChevronDown, Grape, MapPin } from 'lucide-react';
import type { ChatMessage, ChatWineCard } from '@/lib/sommelier-types';
import type { WineData, ProfileMatchResult } from '@/lib/openai';
import { useSommelier } from '../sommelier-context';
import { PierHeadAvatar } from '../sommelier-trigger';
import { AddToCellarDialog } from '@/components/add-to-cellar-dialog';

const WineCard = dynamic(
  () => import('@/components/wine-card').then((m) => m.WineCard),
  { loading: () => <div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-bordeaux-500" /></div> }
);

function chatWineToWineData(wine: ChatWineCard): WineData {
  return {
    name: wine.name,
    winery: wine.winery,
    wine_type: (wine.wine_type as WineData['wine_type']) || 'red',
    country: wine.country || '',
    region: wine.region,
    grapes: wine.grape ? [wine.grape] : [],
    food_pairings: wine.food_pairings,
    alcohol: wine.alcohol ? Number(wine.alcohol) : undefined,
    vivino_rating: wine.vivino_rating,
    vivino_reviews: wine.vivino_reviews,
    tasting_notes: wine.tasting_notes ? {
      nose: wine.tasting_notes.nose || [],
      palate: wine.tasting_notes.palate || [],
      finish: wine.tasting_notes.finish || '',
    } : wine.tasting_note ? { nose: [], palate: [], finish: wine.tasting_note } : undefined,
    serving: wine.serving ? {
      drink_from: wine.serving.drink_from,
      drink_until: wine.serving.drink_until,
      decant_minutes: wine.serving.decant_minutes,
      temperature_celsius: wine.serving.temperature_celsius != null ? String(wine.serving.temperature_celsius) : undefined,
    } : undefined,
    winery_description: wine.reason,
    image_url: wine.image_url,
  };
}

function chatWineToMatchResult(wine: ChatWineCard): ProfileMatchResult | undefined {
  if (wine.match == null) return undefined;
  return {
    match_percentage: wine.match,
    explanation: wine.reason,
    positive_matches: wine.positive_matches || [],
    mismatches: wine.mismatches || [],
    wine_spectrum: wine.wine_spectrum,
    profile_spectrum: wine.profile_spectrum,
  };
}

function ChatWineCardComponent({ wine, index }: { wine: ChatWineCard; index: number }) {
  const { userId, refreshState } = useSommelier();
  const [expanded, setExpanded] = useState(false);
  const [lazyUrl, setLazyUrl] = useState<string | null>(null);
  const [addToCellarWine, setAddToCellarWine] = useState<WineData | null>(null);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [isAddingToProfile, setIsAddingToProfile] = useState(false);
  const [isAddingToCellar, setIsAddingToCellar] = useState(false);
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

  const wineDataWithImg: ChatWineCard = imgSrc && !wine.image_url
    ? { ...wine, image_url: imgSrc }
    : wine;

  const handleAddToWishlist = async () => {
    if (!userId || isAddingToWishlist) return;
    setIsAddingToWishlist(true);
    try {
      const res = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wine: {
            name: wine.name,
            winery: wine.winery,
            wine_type: wine.wine_type || 'red',
            country: wine.country || '',
            region: wine.region || '',
            grapes: wine.grape ? [wine.grape] : [],
            image_url: imgSrc || undefined,
          },
        }),
      });
      if (!res.ok) setIsAddingToWishlist(false);
    } catch { setIsAddingToWishlist(false); }
  };

  const handleAddToProfile = async () => {
    if (!userId || isAddingToProfile) return;
    setIsAddingToProfile(true);
    try {
      const res = await fetch('/api/profile/add-wine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wine: {
            name: wine.name,
            winery: wine.winery,
            wine_type: wine.wine_type || 'red',
            country: wine.country || '',
            region: wine.region || '',
            grapes: wine.grape ? [wine.grape] : [],
            image_url: imgSrc || undefined,
          },
          liked: true,
        }),
      });
      if (res.ok) {
        await refreshState();
        window.dispatchEvent(new Event('wine-profile-updated'));
      } else {
        setIsAddingToProfile(false);
      }
    } catch { setIsAddingToProfile(false); }
  };

  const handleAddToCellar = () => {
    setIsAddingToCellar(true);
    setAddToCellarWine(chatWineToWineData(wineDataWithImg));
  };

  if (expanded) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setExpanded(false)}
          className="mb-2 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ChevronDown className="h-3 w-3 rotate-180" />
          Collapse
        </button>
        <WineCard
          wine={chatWineToWineData(wineDataWithImg)}
          matchResult={chatWineToMatchResult(wineDataWithImg)}
          onAddToCellar={handleAddToCellar}
          onAddToWishlist={handleAddToWishlist}
          onAddToProfile={handleAddToProfile}
          isAddingToCellar={isAddingToCellar}
          isAddingToWishlist={isAddingToWishlist}
          isAddingToProfile={isAddingToProfile}
        />
        {userId && (
          <AddToCellarDialog
            wine={addToCellarWine}
            userId={userId}
            onClose={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
            onAdded={() => { setAddToCellarWine(null); setIsAddingToCellar(false); }}
          />
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => setExpanded(true)}
      className="flex w-full items-start gap-3 rounded-xl border border-border/50 bg-background p-3 text-start transition-colors hover:bg-accent/50 hover:border-bordeaux-200 dark:hover:border-bordeaux-800 cursor-pointer animate-fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {imgSrc ? (
        <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-ivory-300 dark:bg-charcoal-700">
          <img src={imgSrc} alt="" className="h-full w-full object-contain" loading="lazy" />
        </div>
      ) : (
        <div className="flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20">
          <Wine className="h-5 w-5 text-primary" strokeWidth={1.5} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{wine.name}</p>
            <p className="text-xs text-muted-foreground truncate">{wine.winery}</p>
          </div>
          {wine.match != null && (
            <span className="flex-shrink-0 rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 px-2 py-0.5 text-xs font-semibold text-bordeaux-600 dark:text-bordeaux-300">
              {wine.match}%
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          {wine.grape && (
            <span className="flex items-center gap-0.5">
              <Grape className="h-3 w-3" />
              {wine.grape}
            </span>
          )}
          {wine.region && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" />
              {wine.region}
            </span>
          )}
        </div>
        {wine.tasting_note && (
          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{wine.tasting_note}</p>
        )}
        <p className="text-[10px] text-bordeaux-500 dark:text-bordeaux-300 mt-1 font-medium">
          Tap for full details
        </p>
      </div>
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
        <PierHeadAvatar className="h-8 w-8 flex-shrink-0 mt-0.5 rounded-full" />
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
        <PierHeadAvatar className="h-8 w-8 flex-shrink-0 mt-0.5 rounded-full" />
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
              <ChatWineCardComponent key={`${wine.name}-${i}`} wine={wine} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
