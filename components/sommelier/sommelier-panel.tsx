'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useSommelier } from './sommelier-context';
import { PanelHeader } from './panel/panel-header';
import { StatusBanner } from './panel/status-banner';
import { QuickActions } from './panel/quick-actions';
import { ConversationFeed } from './panel/conversation-feed';
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
import { FullScreenChat } from './chat/full-screen-chat';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';

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

type ChatView = 'closed' | { conversationId: string | null };

export function SommelierPanel() {
  const { isOpen, close, activeFlow } = useSommelier();
  const vpHeight = useVisualViewportHeight();
  const t = useTranslations('sommelier');
  const [chatView, setChatView] = useState<ChatView>('closed');

  useLockBodyScroll(isOpen);

  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (chatView !== 'closed') {
        setChatView('closed');
      } else {
        close();
      }
    }
  }, [close, chatView]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, handleEsc]);

  useEffect(() => {
    if (!isOpen) setChatView('closed');
  }, [isOpen]);

  if (!isOpen) return null;

  if (typeof chatView === 'object') {
    return (
      <FullScreenChat
        conversationId={chatView.conversationId}
        onBack={() => setChatView('closed')}
      />
    );
  }

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

  const renderChatButton = () => {
    return (
      <div className="px-4 py-3">
        <button
          onClick={() => setChatView({ conversationId: null })}
          className="w-full flex items-center gap-3 rounded-xl border border-bordeaux-200 dark:border-bordeaux-800 bg-gradient-to-r from-bordeaux-50 to-transparent dark:from-bordeaux-900/20 dark:to-transparent p-3.5 transition-all hover:shadow-soft hover:border-bordeaux-300 dark:hover:border-bordeaux-700 active:scale-[0.98]"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bordeaux-500 text-white flex-shrink-0">
            <span className="text-sm font-bold">P</span>
          </div>
          <div className="text-start flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{t('pierGreeting')}</p>
            <p className="text-xs text-muted-foreground">{t('chatPlaceholder')}</p>
          </div>
          <MessageCircle className="h-5 w-5 text-bordeaux-400 flex-shrink-0" />
        </button>
      </div>
    );
  };

  const panelContent = activeFlow ? (
    renderActiveFlow()
  ) : (
    <>
      <StatusBanner />
      {renderChatButton()}
      <QuickActions />
      <ConversationFeed />
    </>
  );

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
          {panelContent}
        </div>
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
          {panelContent}
        </div>
        <div className="pb-[env(safe-area-inset-bottom)]" />
      </div>
    </>
  );
}
