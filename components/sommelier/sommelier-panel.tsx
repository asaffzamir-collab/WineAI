'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';
import { PanelHeader } from './panel/panel-header';
import { StatusBanner } from './panel/status-banner';
import { QuickActions } from './panel/quick-actions';
import { ConversationFeed } from './panel/conversation-feed';
import { PanelInput } from './panel/panel-input';
import { ChatFeed } from './panel/chat-feed';
import { ChatInput } from './panel/chat-input';
import { DiscoveryFlow } from './discovery/discovery-flow';
import { SmartRefinement } from './learning/smart-refinement';
import { PalateGame } from './learning/palate-game';
import { TonightMode } from './personalized/tonight-mode';
import { BuyingIntelligence } from './personalized/buying-intelligence';
import { FoodPairing } from './personalized/food-pairing';
import { WineDiscovery } from './personalized/wine-discovery';
import { TasteEvolution } from './personalized/taste-evolution';
import { CellarActions, FillRackFlow } from './personalized/cellar-actions';
import { HowItWorks } from './how-it-works';
import { SearchFlow } from './search-flow';

function useVisualViewportHeight() {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => setHeight(vv.height);
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return height;
}

function useLockBodyScroll(locked: boolean) {
  const scrollY = useRef(0);

  useEffect(() => {
    if (locked) {
      scrollY.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const y = scrollY.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, y);
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [locked]);
}

export function SommelierPanel() {
  const { isOpen, close, activeFlow } = useSommelier();
  const vpHeight = useVisualViewportHeight();

  useLockBodyScroll(isOpen);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

  const mobileMaxH = vpHeight ? `${Math.min(vpHeight * 0.9, vpHeight)}px` : '90dvh';

  const renderActiveFlow = () => {
    switch (activeFlow) {
      case 'discovery': return <DiscoveryFlow />;
      case 'refinement': return <SmartRefinement />;
      case 'palate-game': return <PalateGame />;
      case 'tonight': return <TonightMode />;
      case 'buying-intel': return <BuyingIntelligence />;
      case 'food-pairing': return <FoodPairing />;
      case 'wine-discovery': return <WineDiscovery />;
      case 'taste-evolution': return <TasteEvolution />;
      case 'cellar-context': return <CellarActions />;
      case 'fill-rack': return <FillRackFlow />;
      case 'how-it-works': return <HowItWorks />;
      case 'search': return <SearchFlow />;
      default: return null;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/40 animate-in fade-in-0 duration-200"
        onClick={close}
        aria-hidden
      />

      {/* Desktop: Right drawer */}
      <div
        className={cn(
          'fixed z-[60] flex flex-col bg-background shadow-lift',
          'hidden md:flex md:inset-y-0 md:end-0 md:w-[460px] md:border-s md:border-border/50',
          'md:animate-slide-in-right',
        )}
      >
        <PanelHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeFlow ? (
            renderActiveFlow()
          ) : (
            <>
              <StatusBanner />
              <QuickActions />
              <ChatFeed />
              <ConversationFeed />
            </>
          )}
        </div>
        {!activeFlow && <ChatInput />}
      </div>

      {/* Mobile: Bottom sheet */}
      <div
        className={cn(
          'fixed z-[60] flex flex-col bg-background rounded-t-2xl shadow-lift md:hidden',
          'inset-x-0 bottom-0',
          'animate-slide-in-bottom',
        )}
        style={{ maxHeight: mobileMaxH }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </div>
        <PanelHeader />
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeFlow ? (
            renderActiveFlow()
          ) : (
            <>
              <StatusBanner />
              <QuickActions />
              <ChatFeed />
              <ConversationFeed />
            </>
          )}
        </div>
        {!activeFlow && <ChatInput />}
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
