'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Info } from 'lucide-react';
import type { DiscoveryData } from '@/lib/sommelier-types';

interface Props {
  data: DiscoveryData;
  onNext: (updates: Partial<DiscoveryData>) => void;
}

export function StepFlavorSliders({ data, onNext }: Props) {
  const t = useTranslations('sommelier');
  const [fruitySavory, setFruitySavory] = useState(data.flavor_sliders?.fruity_savory ?? 50);
  const [smoothStructured, setSmoothStructured] = useState(data.flavor_sliders?.smooth_structured ?? 50);
  const [lightFull, setLightFull] = useState(data.flavor_sliders?.light_fullbodied ?? 50);

  const handleNext = () => {
    onNext({
      flavor_sliders: {
        fruity_savory: fruitySavory,
        smooth_structured: smoothStructured,
        light_fullbodied: lightFull,
      },
    });
  };

  return (
    <div className="flex flex-col pt-6">
      <h3 className="text-lg font-serif font-semibold text-foreground text-center mb-2">
        {t('slidersTitle')}
      </h3>
      <p className="text-sm text-muted-foreground text-center mb-8">
        {t('slidersSubtitle')}
      </p>

      <div className="space-y-8">
        <SliderRow
          leftLabel={t('sliderFruity')}
          rightLabel={t('sliderSavory')}
          hint={t('sliderFruityHint')}
          value={fruitySavory}
          onChange={setFruitySavory}
        />
        <SliderRow
          leftLabel={t('sliderSmooth')}
          rightLabel={t('sliderStructured')}
          hint={t('sliderSmoothHint')}
          value={smoothStructured}
          onChange={setSmoothStructured}
        />
        <SliderRow
          leftLabel={t('sliderLight')}
          rightLabel={t('sliderFullBodied')}
          hint={t('sliderBodyHint')}
          value={lightFull}
          onChange={setLightFull}
        />
      </div>

      <button
        onClick={handleNext}
        className="mt-8 w-full rounded-xl bg-bordeaux-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-bordeaux-700"
      >
        {t('continue')}
      </button>
    </div>
  );
}

function SliderRow({ leftLabel, rightLabel, hint, value, onChange }: { leftLabel: string; rightLabel: string; hint: string; value: number; onChange: (v: number) => void }) {
  const [showHint, setShowHint] = useState(false);

  return (
    <div>
      <div className="flex justify-between items-center text-xs font-medium text-muted-foreground mb-2">
        <span>{leftLabel}</span>
        <button
          type="button"
          onClick={() => setShowHint(!showHint)}
          className="p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          aria-label="More info"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
        <span>{rightLabel}</span>
      </div>
      {showHint && (
        <p className="text-[11px] text-muted-foreground mb-2 px-1 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {hint}
        </p>
      )}
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-bordeaux-200 to-olive-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-bordeaux-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
      />
    </div>
  );
}
