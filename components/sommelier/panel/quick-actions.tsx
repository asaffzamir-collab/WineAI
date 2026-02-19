'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { Compass, Search, HelpCircle, Sparkles, SlidersHorizontal, Wine, Target, PlusCircle, GlassWater, ShoppingBag, UtensilsCrossed, Heart, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  flow?: string;
  route?: string;
}

const DISCOVERY_ACTIONS: QuickAction[] = [
  { id: 'map', icon: Compass, labelKey: 'actionMapTaste', flow: 'discovery' },
  { id: 'search', icon: Search, labelKey: 'actionSearchWine', flow: 'search' },
  { id: 'how', icon: HelpCircle, labelKey: 'actionHowItWorks', flow: 'how-it-works' },
  { id: 'surprise', icon: Sparkles, labelKey: 'actionSurpriseMe', flow: 'wine-discovery' },
];

const LEARNING_ACTIONS: QuickAction[] = [
  { id: 'refine', icon: SlidersHorizontal, labelKey: 'actionRefineTaste', flow: 'refinement' },
  { id: 'similar', icon: Wine, labelKey: 'actionFindSimilar', flow: 'wine-discovery' },
  { id: 'accuracy', icon: Target, labelKey: 'actionImproveAccuracy', flow: 'palate-game' },
  { id: 'add', icon: PlusCircle, labelKey: 'actionAddWine', flow: 'search' },
];

const PERSONALIZED_ACTIONS: QuickAction[] = [
  { id: 'tonight', icon: GlassWater, labelKey: 'actionTonight', flow: 'tonight' },
  { id: 'buy', icon: ShoppingBag, labelKey: 'actionGoodBuy', flow: 'buying-intel' },
  { id: 'pair', icon: UtensilsCrossed, labelKey: 'actionPairDinner', flow: 'food-pairing' },
  { id: 'love', icon: Heart, labelKey: 'actionFindLove', flow: 'wine-discovery' },
  { id: 'evolving', icon: TrendingUp, labelKey: 'actionEvolving', flow: 'taste-evolution' },
];

export function QuickActions() {
  const { phase, hasDiscoveryData, setActiveFlow, close } = useSommelier();
  const t = useTranslations('sommelier');
  const router = useRouter();

  let actions: QuickAction[];
  if (phase === 'discovery') {
    actions = hasDiscoveryData
      ? DISCOVERY_ACTIONS.filter(a => a.id !== 'map')
      : DISCOVERY_ACTIONS;
  } else if (phase === 'learning') {
    actions = LEARNING_ACTIONS;
  } else {
    actions = PERSONALIZED_ACTIONS;
  }

  const handleAction = (action: QuickAction) => {
    if (action.route) {
      close();
      router.push(action.route);
    } else if (action.flow) {
      setActiveFlow(action.flow);
    }
  };

  const isWide = phase === 'personalization';

  return (
    <div className="px-4 py-4">
      <div className={cn(
        'grid gap-2',
        isWide ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2'
      )}>
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card p-3 transition-all hover:bg-accent hover:shadow-soft active:scale-[0.97]"
            >
              <Icon className="h-5 w-5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-foreground text-center leading-tight">
                {t(action.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
