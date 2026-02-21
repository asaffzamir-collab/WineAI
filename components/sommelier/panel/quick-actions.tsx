'use client';

import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { GlassWater, ShoppingBag, Heart, TrendingUp, UtensilsCrossed, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface QuickAction {
  id: string;
  icon: React.ElementType;
  labelKey: string;
  flow?: string;
  route?: string;
}

const FULL_ACCESS_ACTIONS: QuickAction[] = [
  { id: 'tonight', icon: GlassWater, labelKey: 'actionTonight', flow: 'tonight' },
  { id: 'buy', icon: ShoppingBag, labelKey: 'actionGoodBuy', flow: 'buying-intel' },
  { id: 'food', icon: UtensilsCrossed, labelKey: 'actionPairDinner', flow: 'food-pairing' },
  { id: 'love', icon: Heart, labelKey: 'actionFindLove', flow: 'wine-discovery' },
  { id: 'evolving', icon: TrendingUp, labelKey: 'actionEvolving', flow: 'taste-evolution' },
  { id: 'how', icon: HelpCircle, labelKey: 'actionHowItWorks', flow: 'how-it-works' },
];

export function QuickActions() {
  const { setActiveFlow, close } = useSommelier();
  const t = useTranslations('sommelier');
  const router = useRouter();

  const handleAction = (action: QuickAction) => {
    if (action.route) {
      close();
      router.push(action.route);
    } else if (action.flow) {
      setActiveFlow(action.flow);
    }
  };

  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {FULL_ACCESS_ACTIONS.map(action => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card p-3 transition-all hover:bg-bordeaux-50 hover:border-bordeaux-200 hover:shadow-soft active:scale-[0.97] dark:hover:bg-bordeaux-900/20 dark:hover:border-bordeaux-800"
            >
              <Icon className="h-5 w-5 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
              <span className="text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2 break-words">
                {t(action.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
