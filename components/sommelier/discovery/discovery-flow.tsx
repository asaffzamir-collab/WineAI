'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import type { DiscoveryData, PreliminaryProfile } from '@/lib/sommelier-types';
import { StepEnergy } from './step-energy';
import { StepFlavorSliders } from './step-flavor-sliders';
import { StepOccasions } from './step-occasions';
import { StepRecognition } from './step-recognition';
import { StepProfileReveal } from './step-profile-reveal';
import { FeedbackLoop } from './feedback-loop';
import { ArrowLeft } from 'lucide-react';

type Step = 'energy' | 'sliders' | 'occasions' | 'recognition' | 'reveal' | 'feedback';
const STEPS: Step[] = ['energy', 'sliders', 'occasions', 'recognition', 'reveal'];
const STEP_NUMBER: Record<Step, number> = { energy: 1, sliders: 2, occasions: 3, recognition: 4, reveal: 5, feedback: 5 };

export function DiscoveryFlow() {
  const t = useTranslations('sommelier');
  const { setActiveFlow, refreshState, addConversationItem } = useSommelier();
  const [step, setStep] = useState<Step>('energy');
  const [data, setData] = useState<DiscoveryData>({});
  const [profile, setProfile] = useState<PreliminaryProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const canGoBack = stepIndex > 0 && step !== 'feedback';

  const goBack = () => {
    if (step === 'feedback') { setStep('reveal'); return; }
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]);
  };

  const goNext = useCallback(async (updates?: Partial<DiscoveryData>) => {
    const newData = updates ? { ...data, ...updates } : data;
    if (updates) setData(newData);

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setStep(STEPS[nextIndex]);
    }

    // When moving to reveal, call API
    if (STEPS[nextIndex] === 'reveal' && !profile) {
      setLoading(true);
      try {
        const res = await fetch('/api/sommelier/discovery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData),
        });
        if (res.ok) {
          const result = await res.json();
          setProfile(result.profile);
          setData(prev => ({ ...prev, preliminary_profile: result.profile }));
        }
      } catch { /* handled by reveal showing error */ }
      finally { setLoading(false); }
    }
  }, [data, stepIndex, profile]);

  const handleRevealComplete = () => setStep('feedback');

  const handleFeedbackComplete = async (feedback: 'yes' | 'close' | 'not_really') => {
    if (feedback === 'yes') {
      addConversationItem({
        id: crypto.randomUUID(),
        type: 'insight',
        title: t('discoveryComplete'),
        content: t('discoveryCompleteDesc'),
        created_at: new Date().toISOString(),
      });
      await refreshState();
      setActiveFlow(null);
    } else {
      setLoading(true);
      try {
        const res = await fetch('/api/sommelier/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedback, currentProfile: profile, discoveryData: data }),
        });
        if (res.ok) {
          const result = await res.json();
          setProfile(result.profile);
        }
      } catch { /* keep current profile */ }
      finally { setLoading(false); }
      setStep('reveal');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-3">
        {canGoBack && (
          <button onClick={goBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 flex gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= (step === 'feedback' ? 4 : stepIndex) ? 'bg-bordeaux-500' : 'bg-muted'}`} />
          ))}
        </div>
        <span className="text-xs text-muted-foreground font-medium">
          {STEP_NUMBER[step]}/5
        </span>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {step === 'energy' && <StepEnergy data={data} onNext={goNext} />}
        {step === 'sliders' && <StepFlavorSliders data={data} onNext={goNext} />}
        {step === 'occasions' && <StepOccasions data={data} onNext={goNext} />}
        {step === 'recognition' && <StepRecognition data={data} onNext={goNext} />}
        {step === 'reveal' && <StepProfileReveal profile={profile} loading={loading} onComplete={handleRevealComplete} />}
        {step === 'feedback' && <FeedbackLoop profile={profile} loading={loading} onComplete={handleFeedbackComplete} />}
      </div>
    </div>
  );
}
