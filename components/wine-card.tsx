'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useUser } from '@/lib/user-context';
import { Star, ExternalLink, Check, X, Wine, Thermometer, Clock, UtensilsCrossed, Heart, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult, TasteSpectrum } from '@/lib/openai';

/* ─── Comparison spectrum bar: two indicators on one track ─── */
function ComparisonSpectrumBar({
  profileValue,
  wineValue,
  leftLabel,
  rightLabel,
}: {
  profileValue: number;
  wineValue: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const clamp = (v: number) => Math.max(3, Math.min(97, v));
  const pLeft = clamp(profileValue);
  const wLeft = clamp(wineValue);
  const isClose = Math.abs(profileValue - wineValue) <= 3;

  return (
    <div className="py-1">
      <div className="flex items-center gap-2" dir="ltr">
        <span className="w-12 text-end text-[11px] font-medium text-stone-600 dark:text-stone-400">{leftLabel}</span>
        <div className="relative flex-1 h-[7px] rounded-full bg-ivory-300 dark:bg-charcoal-700">
          {isClose ? (
            <div
              className="absolute top-1/2 h-4 w-4 rounded-full border-[2.5px] border-copper-400 bg-bordeaux-500 shadow-sm z-[1]"
              style={{ left: `${Math.round((pLeft + wLeft) / 2)}%`, transform: 'translate(-50%, -50%)' }}
            />
          ) : (
            <>
              <div
                className="absolute top-1/2 h-3 w-3 rounded-full border-[2.5px] border-copper-400 bg-white shadow-sm dark:bg-charcoal-800"
                style={{ left: `${pLeft}%`, transform: 'translate(-50%, -50%)' }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 rounded-full bg-bordeaux-500 shadow-sm z-[1]"
                style={{ left: `${wLeft}%`, transform: 'translate(-50%, -50%)' }}
              />
            </>
          )}
        </div>
        <span className="w-12 text-[11px] font-medium text-stone-600 dark:text-stone-400">{rightLabel}</span>
      </div>
    </div>
  );
}

/* ─── Match spectrum chart: 4 comparison bars with legend ─── */
function MatchSpectrumChart({
  wineSpectrum,
  profileSpectrum,
  t,
}: {
  wineSpectrum: TasteSpectrum;
  profileSpectrum: TasteSpectrum;
  t: (key: string) => string;
}) {
  const axes = [
    { key: 'body', leftKey: 'spectrumBodyLeft', rightKey: 'spectrumBodyRight' },
    { key: 'tannin', leftKey: 'spectrumTanninLeft', rightKey: 'spectrumTanninRight' },
    { key: 'sweetness', leftKey: 'spectrumSweetnessLeft', rightKey: 'spectrumSweetnessRight' },
    { key: 'acidity', leftKey: 'spectrumAcidityLeft', rightKey: 'spectrumAcidityRight' },
  ] as const;

  return (
    <div className="mb-2 rounded-xl bg-ivory-200 p-3 dark:bg-charcoal-700/50">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-stone-600 dark:text-stone-400">
        {t('spectrumCompareTitle')}
      </p>
      <div className="space-y-0.5">
        {axes.map((axis) => (
          <ComparisonSpectrumBar
            key={axis.key}
            profileValue={profileSpectrum[axis.key]}
            wineValue={wineSpectrum[axis.key]}
            leftLabel={t(axis.leftKey)}
            rightLabel={t(axis.rightKey)}
          />
        ))}
      </div>
      <div className="mt-2.5 flex items-center justify-center gap-4 text-xs text-stone-600 dark:text-stone-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-bordeaux-500" />
          {t('wineSpectrum')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-[2px] border-copper-400 bg-white dark:bg-charcoal-800" />
          {t('profileSpectrum')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-[2px] border-copper-400 bg-bordeaux-500" />
          {t('spectrumMatch')}
        </span>
      </div>
    </div>
  );
}

interface WineCardProps {
  wine: WineData;
  matchResult?: ProfileMatchResult;
  matchLoading?: boolean;
  onAddToCellar?: () => void;
  onAddToWishlist?: () => void;
  onAddToProfile?: () => void;
  isAddingToCellar?: boolean;
  isAddingToWishlist?: boolean;
  isAddingToProfile?: boolean;
  uploadedImageUrl?: string;
}

export function WineCard({
  wine,
  matchResult,
  matchLoading,
  onAddToCellar,
  onAddToWishlist,
  onAddToProfile,
  isAddingToCellar,
  isAddingToWishlist,
  isAddingToProfile,
  uploadedImageUrl,
}: WineCardProps) {
  const t = useTranslations('wineCard');
  const { gender } = useUser();
  const g = { gender };
  const [imageError, setImageError] = useState(false);
  const [lazyImageUrl, setLazyImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const lazyFetchDone = useRef(false);

  useEffect(() => {
    setImageError(false);
    setLazyImageUrl(null);
    lazyFetchDone.current = false;
  }, [wine.name, wine.winery, uploadedImageUrl, wine.image_url]);

  // Lazy-fetch wine image from Vivino when no image is available
  useEffect(() => {
    const hasImage = wine.image_url || uploadedImageUrl;
    if (hasImage && !imageError) return;
    if (lazyImageUrl || isLoadingImage || lazyFetchDone.current) return;
    if (!wine.name) return;

    let cancelled = false;
    setIsLoadingImage(true);
    lazyFetchDone.current = true;
    fetch(`/api/wine-image?name=${encodeURIComponent(wine.name)}&winery=${encodeURIComponent(wine.winery)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.imageUrl) setLazyImageUrl(data.imageUrl);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsLoadingImage(false); });

    return () => { cancelled = true; };
  }, [wine.name, wine.winery, uploadedImageUrl, wine.image_url, imageError, lazyImageUrl, isLoadingImage]);

  const wineTypeColors = {
    red: 'bg-bordeaux-600',
    white: 'bg-gold-100',
    rose: 'bg-bordeaux-200',
    sparkling: 'bg-gold-50',
    dessert: 'bg-copper-400',
  };

  return (
    <Card className="overflow-hidden card-hover">
      {/* Wine Header */}
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start gap-4">
          {((wine.image_url || uploadedImageUrl) && !imageError) || lazyImageUrl ? (
            <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-ivory-300 shadow-soft dark:bg-charcoal-700">
              <img
                src={(imageError ? (lazyImageUrl || uploadedImageUrl) : (wine.image_url || uploadedImageUrl || lazyImageUrl)) as string}
                alt={`${wine.name} by ${wine.winery}`}
                className="absolute inset-0 h-full w-full object-contain"
                loading="lazy"
                onError={() => {
                  if (lazyImageUrl) {
                    setLazyImageUrl(null);
                  }
                  setImageError(true);
                  if (wine.name) {
                    fetch(`/api/wine-image?name=${encodeURIComponent(wine.name)}&winery=${encodeURIComponent(wine.winery)}`, { method: 'DELETE' }).catch(() => {});
                  }
                }}
              />
            </div>
          ) : isLoadingImage ? (
            <div className="relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-ivory-300 shadow-soft dark:bg-charcoal-700">
              <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-ivory-200 to-ivory-400 dark:from-charcoal-600 dark:to-charcoal-800" />
            </div>
          ) : (
            <a
              href={`https://www.vivino.com/search/wines?q=${encodeURIComponent(`${wine.winery} ${wine.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-20 w-20 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl shadow-inner-soft transition-all duration-200 hover:opacity-80',
                wineTypeColors[wine.wine_type] || 'bg-ivory-400'
              )}
              title={t('seeOnVivino', g)}
            >
              <Wine className={cn(
                'h-8 w-8',
                wine.wine_type === 'white' || wine.wine_type === 'sparkling' ? 'text-stone-600' : 'text-white/80'
              )} strokeWidth={1.5} />
              <span className="text-[10px] font-medium opacity-70 max-w-full truncate px-1">
                {t('seeOnVivino', g)}
              </span>
            </a>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="heading-serif text-xl text-bordeaux-600 line-clamp-2 dark:text-ivory-200">
              {wine.name}
            </h2>
            <p className="mt-1 text-stone-600 dark:text-stone-400">{wine.winery}</p>
            {wine.vintage && (
              <span className="text-sm text-stone-600/70 dark:text-stone-400/70">{wine.vintage}</span>
            )}
          </div>
        </div>

        {/* Rating badge */}
        {wine.vivino_rating != null && (() => {
          const rating = Number(wine.vivino_rating);
          const low = Math.max(1.0, rating - 0.2);
          const high = Math.min(5.0, rating + 0.2);
          const rangeText = `${low.toFixed(1)}-${high.toFixed(1)}`;
          return (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full bg-bordeaux-600 px-3.5 py-1.5 text-white shadow-soft dark:bg-bordeaux-500">
                <Star className="h-3.5 w-3.5 fill-copper-400 text-copper-400" />
                <span className="text-sm font-semibold">{rangeText}</span>
              </div>
              <span className="text-sm text-stone-600 dark:text-stone-400">
                {t('ratingEstimate')}
              </span>
              <a
                href={`https://www.vivino.com/search/wines?q=${encodeURIComponent(`${wine.winery} ${wine.name}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-bordeaux-400 hover:text-bordeaux-600 transition-colors duration-200 dark:text-bordeaux-300 dark:hover:text-bordeaux-200"
                title={t('verifyOnVivino')}
              >
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
              </a>
            </div>
          );
        })()}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Technical Details */}
        <section className="rounded-xl bg-ivory-200 p-4 dark:bg-charcoal-700/50">
          <h3 className="mb-3 font-semibold text-bordeaux-600 dark:text-ivory-200">{t('technicalDetails')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {wine.country && (
              <div>
                <span className="text-stone-600 dark:text-stone-400">{t('country')}:</span>{' '}
                <span className="font-medium">{wine.country}</span>
              </div>
            )}
            {wine.region && (
              <div>
                <span className="text-stone-600 dark:text-stone-400">{t('region')}:</span>{' '}
                <span className="font-medium">{wine.region}</span>
              </div>
            )}
            {wine.grapes && wine.grapes.length > 0 && (
              <div className="col-span-2">
                <span className="text-stone-600 dark:text-stone-400">{t('grape')}:</span>{' '}
                <span className="font-medium">{wine.grapes.join(', ')}</span>
              </div>
            )}
            {wine.alcohol && (
              <div>
                <span className="text-stone-600 dark:text-stone-400">{t('alcohol')}:</span>{' '}
                <span className="font-medium">{wine.alcohol}%</span>
              </div>
            )}
            {wine.volume_ml && (
              <div>
                <span className="text-stone-600 dark:text-stone-400">{t('volume')}:</span>{' '}
                <span className="font-medium">{wine.volume_ml}ml</span>
              </div>
            )}
            {wine.is_kosher !== undefined && (
              <div>
                <span className="text-stone-600 dark:text-stone-400">{t('kosher')}:</span>{' '}
                <span className="font-medium">
                  {wine.is_kosher ? '✓' : '✗'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Winery Description */}
        {wine.winery_description && (
          <section>
            <h3 className="mb-2 font-semibold text-bordeaux-600 dark:text-ivory-200">{t('aboutWinery')}</h3>
            <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{wine.winery_description}</p>
          </section>
        )}

        {/* Tasting Notes */}
        {wine.tasting_notes && (
          <section className="rounded-xl bg-ivory-200 p-4 dark:bg-charcoal-700/50">
            <h3 className="mb-3 font-semibold text-bordeaux-600 dark:text-ivory-200">{t('tastingProfile')}</h3>
            <div className="space-y-2.5 text-sm">
              {wine.tasting_notes.nose && (
                <div>
                  <span className="font-medium text-bordeaux-500 dark:text-bordeaux-300">{t('nose')}:</span>{' '}
                  <span className="text-stone-600 dark:text-stone-400">{wine.tasting_notes.nose.join(', ')}</span>
                </div>
              )}
              {wine.tasting_notes.palate && (
                <div>
                  <span className="font-medium text-bordeaux-500 dark:text-bordeaux-300">{t('palate')}:</span>{' '}
                  <span className="text-stone-600 dark:text-stone-400">{wine.tasting_notes.palate.join(', ')}</span>
                </div>
              )}
              {wine.tasting_notes.finish && (
                <div>
                  <span className="font-medium text-bordeaux-500 dark:text-bordeaux-300">{t('finish')}:</span>{' '}
                  <span className="text-stone-600 dark:text-stone-400">{wine.tasting_notes.finish}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Serving Info */}
        {wine.serving && (
          <section>
            <h3 className="mb-3 font-semibold text-bordeaux-600 dark:text-ivory-200">{t('servingInfo')}</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {(wine.serving.drink_from || wine.serving.drink_until) && (
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                  <Wine className="h-4 w-4 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                  <span>
                    {t('drinkWindow')}: {wine.serving.drink_from}-{wine.serving.drink_until}
                  </span>
                </div>
              )}
              {wine.serving.decant_minutes && (
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                  <Clock className="h-4 w-4 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                  <span>
                    {t('decant')}: {wine.serving.decant_minutes} min
                  </span>
                </div>
              )}
              {wine.serving.temperature_celsius && (
                <div className="flex items-center gap-2 text-stone-600 dark:text-stone-400">
                  <Thermometer className="h-4 w-4 text-bordeaux-500 dark:text-bordeaux-300" strokeWidth={1.5} />
                  <span>
                    {t('temperature')}: {wine.serving.temperature_celsius}°C
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Food Pairings */}
        {wine.food_pairings && wine.food_pairings.length > 0 && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-bordeaux-600 dark:text-ivory-200">
              <UtensilsCrossed className="h-4 w-4" strokeWidth={1.5} />
              {t('foodPairings')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {wine.food_pairings.map((food, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-ivory-300 px-3 py-1 text-sm text-stone-600 dark:bg-charcoal-700 dark:text-stone-400"
                >
                  {food}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Profile Match */}
        {matchResult ? (
          <section className="rounded-2xl border border-bordeaux-100 bg-white p-5 shadow-soft dark:border-charcoal-700 dark:bg-charcoal-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-bordeaux-600 dark:text-ivory-200">{t('matchToProfile')}</h3>
              <div className="relative h-14 w-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-ivory-300 dark:text-charcoal-700" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    className={cn(
                      matchResult.match_percentage >= 70
                        ? 'text-bordeaux-600 dark:text-bordeaux-300'
                        : matchResult.match_percentage >= 40
                        ? 'text-copper-400'
                        : 'text-ruby-500'
                    )}
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeDasharray={`${matchResult.match_percentage} ${100 - matchResult.match_percentage}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-bordeaux-600 dark:text-ivory-200">
                  {matchResult.match_percentage}%
                </span>
              </div>
            </div>

            {matchResult.explanation && (
              <p className="mb-4 text-sm leading-relaxed text-stone-600 dark:text-stone-400">{matchResult.explanation}</p>
            )}

            {matchResult.wine_spectrum && matchResult.profile_spectrum && (
              <MatchSpectrumChart
                wineSpectrum={matchResult.wine_spectrum}
                profileSpectrum={matchResult.profile_spectrum}
                t={t}
              />
            )}

            {(matchResult.positive_matches.length > 0 || matchResult.mismatches.length > 0) && (
              <ul className="mt-4 space-y-2 text-sm">
                {matchResult.positive_matches.map((match, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-green-700 dark:text-green-400">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                    <span>{match}</span>
                  </li>
                ))}
                {matchResult.mismatches.map((mismatch, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-copper-400 dark:text-copper-300">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0" strokeWidth={1.5} />
                    <span>{mismatch}</span>
                  </li>
                ))}
              </ul>
            )}

            {matchResult.why_drink_it && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-copper-50 dark:bg-copper-900/20 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0 text-copper-500 dark:text-copper-400" strokeWidth={1.5} />
                <div>
                  <p className="text-xs font-semibold text-copper-600 dark:text-copper-400 mb-1">{t('whyDrinkIt')}</p>
                  <p className="text-sm leading-relaxed text-stone-600 dark:text-stone-400">{matchResult.why_drink_it}</p>
                </div>
              </div>
            )}

            {matchResult.similar_wines_note && (
              <p className="mt-3 text-sm italic text-stone-600 dark:text-stone-400">
                {matchResult.similar_wines_note}
              </p>
            )}
          </section>
        ) : matchLoading ? (
          <section className="rounded-2xl border border-bordeaux-100 bg-white p-5 shadow-soft dark:border-charcoal-700 dark:bg-charcoal-800 animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-5 w-36 rounded bg-ivory-300 dark:bg-charcoal-700" />
              <div className="h-14 w-14 rounded-full bg-ivory-300 dark:bg-charcoal-700" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-ivory-300 dark:bg-charcoal-700" />
              <div className="h-3 w-4/5 rounded bg-ivory-300 dark:bg-charcoal-700" />
            </div>
            <div className="mt-4 space-y-3">
              <div className="h-2 w-full rounded bg-ivory-300 dark:bg-charcoal-700" />
              <div className="h-2 w-full rounded bg-ivory-300 dark:bg-charcoal-700" />
              <div className="h-2 w-full rounded bg-ivory-300 dark:bg-charcoal-700" />
              <div className="h-2 w-full rounded bg-ivory-300 dark:bg-charcoal-700" />
            </div>
          </section>
        ) : null}

        {/* Like this wine */}
        {onAddToProfile && (
          <div>
            <Button
              variant="ghost"
              onClick={onAddToProfile}
              disabled={isAddingToProfile}
              className={cn(
                "w-full border-2 border-dashed rounded-xl",
                isAddingToProfile
                  ? "border-bordeaux-200 bg-bordeaux-50 text-bordeaux-500 dark:border-bordeaux-800 dark:bg-bordeaux-900/30 dark:text-bordeaux-300"
                  : "border-ivory-400 hover:border-bordeaux-300 hover:bg-bordeaux-50 dark:border-charcoal-700 dark:hover:border-bordeaux-800"
              )}
            >
              <Heart className={cn("me-2 h-4 w-4", isAddingToProfile && "fill-bordeaux-400")} strokeWidth={1.5} />
              {isAddingToProfile ? t('addedToProfile') : t('likeThisWine', g)}
            </Button>
            <p className="text-[10px] text-muted-foreground/70 text-center mt-1 leading-tight">{t('likeHint')}</p>
          </div>
        )}

        {/* Action Buttons */}
        {(onAddToCellar || onAddToWishlist) && (
          <div>
            <div className="flex gap-3 pt-2">
              {onAddToCellar && (
                <Button
                  onClick={onAddToCellar}
                  disabled={isAddingToCellar}
                  className={cn("flex-1", isAddingToCellar && "bg-green-600 hover:bg-green-600")}
                >
                  {isAddingToCellar ? t('addedToCellar') : t('addToCellar', g)}
                </Button>
              )}
              {onAddToWishlist != null && (
                <Button
                  variant="outline"
                  onClick={onAddToWishlist}
                  disabled={isAddingToWishlist}
                  className={cn("flex-1", isAddingToWishlist && "border-bordeaux-300 bg-bordeaux-50 text-bordeaux-500")}
                >
                  {isAddingToWishlist ? t('addedToWishlist') : t('addToWishlist', g)}
                </Button>
              )}
            </div>
            {onAddToWishlist != null && (
              <p className="text-[10px] text-muted-foreground/70 text-center mt-1 leading-tight">{t('wishlistHint')}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
