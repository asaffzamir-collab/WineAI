'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wine, Clock, Lightbulb, Sparkles, ArrowLeft, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useSommelier } from '@/components/sommelier/sommelier-context';

const CELLAR_ACTIONS = [
  { id: 'tonight', icon: Clock, labelKey: 'cellarActionTonight', flow: 'tonight' },
  { id: 'organize', icon: Lightbulb, labelKey: 'cellarActionOrganize', flow: null },
  { id: 'gaps', icon: Search, labelKey: 'cellarActionGaps', flow: null },
  { id: 'suggestions', icon: Sparkles, labelKey: 'cellarActionSuggestions', flow: 'wine-discovery' },
] as const;

export function CellarActions() {
  const t = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: typeof CELLAR_ACTIONS[number]) => {
    if (action.flow) {
      setActiveFlow(action.flow);
    } else {
      setLoading(action.id);
      // Simulate a brief delay for non-flow actions
      setTimeout(() => setLoading(null), 500);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setActiveFlow(null)}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div>
          <h3 className="text-heading text-foreground">{t('cellarActionsTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('cellarActionsSubtitle')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {CELLAR_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Card
              key={action.id}
              className="cursor-pointer card-hover"
              onClick={() => handleAction(action)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-garnet-500/10 flex-shrink-0">
                  {loading === action.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-garnet-600" />
                  ) : (
                    <Icon className="h-5 w-5 text-garnet-600 dark:text-garnet-400" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t(action.labelKey)}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export function FillRackFlow() {
  const t = useTranslations('sommelier');
  const { setActiveFlow } = useSommelier();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setActiveFlow(null)}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
        </Button>
        <div>
          <h3 className="text-heading text-foreground">{t('fillRackTitle')}</h3>
          <p className="text-xs text-muted-foreground">{t('fillRackSubtitle')}</p>
        </div>
      </div>

      <div className="flex items-center justify-center py-8">
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-garnet-500/10">
            <Wine className="h-8 w-8 text-garnet-600 dark:text-garnet-400" strokeWidth={1} />
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            {t('fillRackDesc')}
          </p>
          <Button
            className="gap-1.5"
            onClick={() => setActiveFlow('wine-discovery')}
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} />
            {t('fillRackCta')}
          </Button>
        </div>
      </div>
    </div>
  );
}
