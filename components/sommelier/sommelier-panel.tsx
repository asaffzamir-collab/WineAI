'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';
import { PanelHeader } from './panel/panel-header';
import { StatusBanner } from './panel/status-banner';
import { QuickActions } from './panel/quick-actions';
import { ConversationFeed } from './panel/conversation-feed';
import { PanelInput } from './panel/panel-input';
import { DiscoveryFlow } from './discovery/discovery-flow';
import { SmartRefinement } from './learning/smart-refinement';
import { PalateGame } from './learning/palate-game';
import { TonightMode } from './personalized/tonight-mode';
import { BuyingIntelligence } from './personalized/buying-intelligence';
import { FoodPairing } from './personalized/food-pairing';
import { WineDiscovery } from './personalized/wine-discovery';
import { TasteEvolution } from './personalized/taste-evolution';

export function SommelierPanel() {
  const { isOpen, close, activeFlow } = useSommelier();

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  }, [close]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEsc]);

  if (!isOpen) return null;

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
      default: return null;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 animate-in fade-in-0 duration-200"
        onClick={close}
        aria-hidden
      />

      {/* Desktop: Right drawer */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-background shadow-lift',
          // Desktop
          'hidden md:flex md:inset-y-0 md:end-0 md:w-[460px] md:border-s md:border-border/50',
          'md:animate-slide-in-right',
        )}
      >
        <PanelHeader />
        <div className="flex-1 overflow-y-auto">
          {activeFlow ? (
            renderActiveFlow()
          ) : (
            <>
              <StatusBanner />
              <QuickActions />
              <ConversationFeed />
            </>
          )}
        </div>
        {!activeFlow && <PanelInput />}
      </div>

      {/* Mobile: Bottom sheet */}
      <div
        className={cn(
          'fixed z-50 flex flex-col bg-background rounded-t-2xl shadow-lift md:hidden',
          'inset-x-0 bottom-0 max-h-[90vh]',
          'animate-slide-in-bottom',
        )}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2">
          <div className="h-1.5 w-12 rounded-full bg-muted" />
        </div>
        <PanelHeader />
        <div className="flex-1 overflow-y-auto">
          {activeFlow ? (
            renderActiveFlow()
          ) : (
            <>
              <StatusBanner />
              <QuickActions />
              <ConversationFeed />
            </>
          )}
        </div>
        {!activeFlow && <PanelInput />}
      </div>
    </>
  );
}
