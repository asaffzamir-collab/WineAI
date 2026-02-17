'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, Wine, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface OnboardingQuizProps {
  userId: string;
}

type QuestionType = 'choice' | 'slider' | 'text';

interface Question {
  id: string;
  type: QuestionType;
  options?: { id: string; label: string }[];
  scaleLabels?: string;
  placeholder?: string;
}

export function OnboardingQuiz({ userId }: OnboardingQuizProps) {
  const t = useTranslations('onboarding');
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const questions: Question[] = [
    {
      id: 'preferredType',
      type: 'choice',
      options: [
        { id: 'red', label: t('answer1_red') },
        { id: 'white', label: t('answer1_white') },
        { id: 'rose', label: t('answer1_rose') },
        { id: 'all', label: t('answer1_all') },
      ],
    },
    {
      id: 'tanninPreference',
      type: 'slider',
      scaleLabels: t('tanninScale'),
    },
    {
      id: 'fruityEarthy',
      type: 'slider',
      scaleLabels: t('fruityEarthyScale'),
    },
    {
      id: 'bodyPreference',
      type: 'choice',
      options: [
        { id: 'light', label: t('answer4_light') },
        { id: 'medium', label: t('answer4_medium') },
        { id: 'full', label: t('answer4_full') },
        { id: 'varies', label: t('answer4_varies') },
      ],
    },
    {
      id: 'acidityImportance',
      type: 'slider',
      scaleLabels: t('acidityScale'),
    },
    {
      id: 'favoriteRegions',
      type: 'text',
      placeholder: t('regionsPlaceholder'),
    },
  ];

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (value: string | number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, answers }),
      });

      if (response.ok) {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Error saving onboarding:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQuestionTitle = (index: number) => {
    const titles = [
      t('question1'),
      t('question2'),
      t('question3'),
      t('question4'),
      t('question5'),
      t('question6'),
    ];
    return titles[index] || '';
  };

  const canProceed =
    currentQuestion.type === 'text' || answers[currentQuestion.id] !== undefined;

  return (
    <div className="min-h-screen bg-gradient-to-b from-bordeaux-600 to-bordeaux-900 px-4 py-8">
      <div className="mx-auto max-w-md lg:max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <Wine className="mx-auto mb-4 h-12 w-12 text-copper-400" />
          <h1 className="text-2xl font-bold text-white">{t('welcome')}</h1>
          <p className="mt-2 text-bordeaux-200">{t('subtitle')}</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <Progress value={progress} className="h-2" />
          <p className="mt-2 text-center text-sm text-bordeaux-200">
            {currentStep + 1} / {questions.length}
          </p>
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{getQuestionTitle(currentStep)}</CardTitle>
            {currentQuestion.scaleLabels && (
              <CardDescription>{currentQuestion.scaleLabels}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Choice Question */}
            {currentQuestion.type === 'choice' && currentQuestion.options && (
              <div className="grid grid-cols-2 gap-3">
                {currentQuestion.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option.id)}
                    className={cn(
                      'rounded-lg border-2 p-4 text-center transition-all',
                      answers[currentQuestion.id] === option.id
                        ? 'border-bordeaux-500 bg-bordeaux-50 text-bordeaux-600'
                        : 'border-border hover:border-bordeaux-300 hover:bg-surface-raised'
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}

            {/* Slider Question */}
            {currentQuestion.type === 'slider' && (
              <div className="space-y-6 py-4">
                <Slider
                  value={[Number(answers[currentQuestion.id]) || 3]}
                  onValueChange={([value]) => handleAnswer(value)}
                  min={1}
                  max={5}
                  step={1}
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            )}

            {/* Text Question */}
            {currentQuestion.type === 'text' && (
              <Input
                value={(answers[currentQuestion.id] as string) || ''}
                onChange={(e) => handleAnswer(e.target.value)}
                placeholder={currentQuestion.placeholder}
              />
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                {t('skipQuestion')}
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canProceed || isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('creatingProfile')}
                  </>
                ) : currentStep === questions.length - 1 ? (
                  t('finishSetup')
                ) : (
                  <>
                    {t('next')}
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
