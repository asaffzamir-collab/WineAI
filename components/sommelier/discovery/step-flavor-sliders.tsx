'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
          value={fruitySavory}
          onChange={setFruitySavory}
        />
        <SliderRow
          leftLabel={t('sliderSmooth')}
          rightLabel={t('sliderStructured')}
          value={smoothStructured}
          onChange={setSmoothStructured}
        />
        <SliderRow
          leftLabel={t('sliderLight')}
          rightLabel={t('sliderFullBodied')}
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

function SliderRow({ leftLabel, rightLabel, value, onChange }: { leftLabel: string; rightLabel: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-muted-foreground mb-2">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
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
