'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Star, ExternalLink, Check, X, Wine, Thermometer, Clock, UtensilsCrossed, Heart } from 'lucide-react';
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
  const isClose = Math.abs(profileValue - wineValue) <= 7;

  return (
    <div className="py-1">
      <div className="flex items-center gap-2">
        <span className="w-12 text-end text-[11px] font-medium text-gray-500">{leftLabel}</span>
        <div className="relative flex-1 h-[7px] rounded-full bg-cream-200">
          {isClose ? (
            /* Merged "match" indicator — wine fill with gold ring */
            <div
              className="absolute top-1/2 h-4 w-4 rounded-full border-[2.5px] border-gold-500 bg-wine-700 shadow-sm z-[1]"
              style={{ left: `${Math.round((pLeft + wLeft) / 2)}%`, transform: 'translate(-50%, -50%)' }}
            />
          ) : (
            <>
              {/* Profile indicator (gold ring) */}
              <div
                className="absolute top-1/2 h-3 w-3 rounded-full border-[2.5px] border-gold-500 bg-white shadow-sm"
                style={{ left: `${pLeft}%`, transform: 'translate(-50%, -50%)' }}
              />
              {/* Wine indicator (solid dot) */}
              <div
                className="absolute top-1/2 h-3 w-3 rounded-full bg-wine-700 shadow-sm z-[1]"
                style={{ left: `${wLeft}%`, transform: 'translate(-50%, -50%)' }}
              />
            </>
          )}
        </div>
        <span className="w-12 text-[11px] font-medium text-gray-500">{rightLabel}</span>
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
    <div className="mb-2 rounded-lg bg-cream-50 p-3">
      <p className="mb-2 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400">
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
      {/* Legend */}
      <div className="mt-2.5 flex items-center justify-center gap-4 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-wine-700" />
          {t('wineSpectrum')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full border-[2px] border-gold-500 bg-white" />
          {t('profileSpectrum')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full border-[2px] border-gold-500 bg-wine-700" />
          {t('spectrumMatch')}
        </span>
      </div>
    </div>
  );
}

interface WineCardProps {
  wine: WineData;
  matchResult?: ProfileMatchResult;
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
  onAddToCellar,
  onAddToWishlist,
  onAddToProfile,
  isAddingToCellar,
  isAddingToWishlist,
  isAddingToProfile,
  uploadedImageUrl,
}: WineCardProps) {
  const t = useTranslations('wineCard');
  const [imageError, setImageError] = useState(false);

  // Reset image error when the wine or image URL changes
  useEffect(() => {
    setImageError(false);
  }, [wine.name, wine.winery, uploadedImageUrl, wine.image_url]);

  const wineTypeColors = {
    red: 'bg-red-900',
    white: 'bg-amber-100',
    rose: 'bg-pink-300',
    sparkling: 'bg-amber-50',
    dessert: 'bg-amber-600',
  };

  return (
    <Card className="overflow-hidden">
      {/* Wine Header */}
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start gap-4">
          {/* Wine Image - when user uploaded a bottle, use that; otherwise wine.image_url or color */}
          {(uploadedImageUrl || wine.image_url) && !imageError ? (
            <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <img
                src={uploadedImageUrl || wine.image_url}
                alt={wine.name}
                className="h-full w-full object-contain"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <a
              href={`https://www.vivino.com/search/wines?q=${encodeURIComponent(`${wine.winery} ${wine.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center gap-1 rounded-lg shadow-inner transition-colors hover:opacity-90',
                wineTypeColors[wine.wine_type] || 'bg-gray-200'
              )}
              title={t('seeOnVivino')}
            >
              <Wine className={cn(
                'h-8 w-8',
                wine.wine_type === 'white' || wine.wine_type === 'sparkling' ? 'text-gray-600' : 'text-white/70'
              )} />
              <span className="text-[10px] font-medium opacity-80 max-w-full truncate px-1">
                {t('seeOnVivino')}
              </span>
            </a>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-wine-900 line-clamp-2">
              {wine.name}
            </h2>
            <p className="text-gray-600">{wine.winery}</p>
            {wine.vintage && (
              <span className="text-sm text-gray-500">{wine.vintage}</span>
            )}
          </div>
        </div>

        {/* Vivino Rating (AI estimate — encourage verification) */}
        {wine.vivino_rating != null && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-wine-900 px-3 py-1 text-white">
              <Star className="h-4 w-4 fill-gold-500 text-gold-500" />
              <span className="font-semibold">{Number(wine.vivino_rating).toFixed(1)}</span>
            </div>
            <span className="text-sm text-gray-500">
              {wine.vivino_reviews != null ? (
                <>{wine.vivino_reviews.toLocaleString()} {t('reviews')}</>
              ) : (
                t('vivinoRating')
              )}
            </span>
            <a
              href={`https://www.vivino.com/search/wines?q=${encodeURIComponent(`${wine.winery} ${wine.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center text-wine-600 hover:text-wine-800 hover:underline"
              title={t('verifyOnVivino')}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Technical Details */}
        <section className="rounded-lg bg-cream-100 p-4">
          <h3 className="mb-3 font-semibold text-wine-900">{t('technicalDetails')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {wine.country && (
              <div>
                <span className="text-gray-500">{t('country')}:</span>{' '}
                <span className="font-medium">{wine.country}</span>
              </div>
            )}
            {wine.region && (
              <div>
                <span className="text-gray-500">{t('region')}:</span>{' '}
                <span className="font-medium">{wine.region}</span>
              </div>
            )}
            {wine.grapes && wine.grapes.length > 0 && (
              <div className="col-span-2">
                <span className="text-gray-500">{t('grape')}:</span>{' '}
                <span className="font-medium">{wine.grapes.join(', ')}</span>
              </div>
            )}
            {wine.alcohol && (
              <div>
                <span className="text-gray-500">{t('alcohol')}:</span>{' '}
                <span className="font-medium">{wine.alcohol}%</span>
              </div>
            )}
            {wine.volume_ml && (
              <div>
                <span className="text-gray-500">{t('volume')}:</span>{' '}
                <span className="font-medium">{wine.volume_ml}ml</span>
              </div>
            )}
            {wine.is_kosher !== undefined && (
              <div>
                <span className="text-gray-500">{t('kosher')}:</span>{' '}
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
            <h3 className="mb-2 font-semibold text-wine-900">{t('aboutWinery')}</h3>
            <p className="text-sm text-gray-600">{wine.winery_description}</p>
          </section>
        )}

        {/* Tasting Notes */}
        {wine.tasting_notes && (
          <section className="rounded-lg bg-cream-100 p-4">
            <h3 className="mb-3 font-semibold text-wine-900">{t('tastingProfile')}</h3>
            <div className="space-y-2 text-sm">
              {wine.tasting_notes.nose && (
                <div>
                  <span className="font-medium text-wine-800">{t('nose')}:</span>{' '}
                  {wine.tasting_notes.nose.join(', ')}
                </div>
              )}
              {wine.tasting_notes.palate && (
                <div>
                  <span className="font-medium text-wine-800">{t('palate')}:</span>{' '}
                  {wine.tasting_notes.palate.join(', ')}
                </div>
              )}
              {wine.tasting_notes.finish && (
                <div>
                  <span className="font-medium text-wine-800">{t('finish')}:</span>{' '}
                  {wine.tasting_notes.finish}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Serving Info */}
        {wine.serving && (
          <section>
            <h3 className="mb-3 font-semibold text-wine-900">{t('servingInfo')}</h3>
            <div className="flex flex-wrap gap-4 text-sm">
              {(wine.serving.drink_from || wine.serving.drink_until) && (
                <div className="flex items-center gap-2">
                  <Wine className="h-4 w-4 text-wine-700" />
                  <span>
                    {t('drinkWindow')}: {wine.serving.drink_from}-{wine.serving.drink_until}
                  </span>
                </div>
              )}
              {wine.serving.decant_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-wine-700" />
                  <span>
                    {t('decant')}: {wine.serving.decant_minutes} min
                  </span>
                </div>
              )}
              {wine.serving.temperature_celsius && (
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-wine-700" />
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
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-wine-900">
              <UtensilsCrossed className="h-4 w-4" />
              {t('foodPairings')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {wine.food_pairings.map((food, idx) => (
                <span
                  key={idx}
                  className="rounded-full bg-cream-200 px-3 py-1 text-sm"
                >
                  {food}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Profile Match - spectrum comparison */}
        {matchResult && (
          <section className="rounded-xl border-2 border-wine-100 bg-white p-5 shadow-sm">
            {/* Header with match percentage circle */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-wine-900">{t('matchToProfile')}</h3>
              <div className="relative h-14 w-14 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3e8e8" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={matchResult.match_percentage >= 70 ? '#4a1d1f' : matchResult.match_percentage >= 40 ? '#c2410c' : '#dc2626'}
                    strokeWidth="2.5"
                    strokeDasharray={`${matchResult.match_percentage} ${100 - matchResult.match_percentage}`}
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-wine-900">
                  {matchResult.match_percentage}%
                </span>
              </div>
            </div>

            {/* Explanation */}
            {matchResult.explanation && (
              <p className="mb-4 text-sm text-gray-600">{matchResult.explanation}</p>
            )}

            {/* Spectrum comparison chart */}
            {matchResult.wine_spectrum && matchResult.profile_spectrum && (
              <MatchSpectrumChart
                wineSpectrum={matchResult.wine_spectrum}
                profileSpectrum={matchResult.profile_spectrum}
                t={t}
              />
            )}

            {/* Positive matches & mismatches */}
            {(matchResult.positive_matches.length > 0 || matchResult.mismatches.length > 0) && (
              <ul className="mt-4 space-y-2 text-sm">
                {matchResult.positive_matches.map((match, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-green-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{match}</span>
                  </li>
                ))}
                {matchResult.mismatches.map((mismatch, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-orange-600">
                    <X className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>{mismatch}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Similar wines note */}
            {matchResult.similar_wines_note && (
              <p className="mt-3 text-sm italic text-gray-600">
                {matchResult.similar_wines_note}
              </p>
            )}
          </section>
        )}

        {/* Like this wine - adds to profile */}
        {onAddToProfile && (
          <Button
            variant="ghost"
            onClick={onAddToProfile}
            disabled={isAddingToProfile}
            className={cn(
              "w-full border-2 border-dashed",
              isAddingToProfile 
                ? "border-pink-300 bg-pink-50 text-pink-700" 
                : "border-wine-200 hover:border-wine-400 hover:bg-wine-50"
            )}
          >
            <Heart className={cn("me-2 h-4 w-4", isAddingToProfile && "fill-pink-500")} />
            {isAddingToProfile ? t('addedToProfile') : t('likeThisWine')}
          </Button>
        )}

        {/* Action Buttons */}
        {(onAddToCellar || onAddToWishlist) && (
          <div className="flex gap-3 pt-2">
            {onAddToCellar && (
              <Button
                onClick={onAddToCellar}
                disabled={isAddingToCellar}
                className={cn("flex-1", isAddingToCellar && "bg-green-600 hover:bg-green-600")}
              >
                {isAddingToCellar ? t('addedToCellar') : t('addToCellar')}
              </Button>
            )}
            {onAddToWishlist != null && (
              <Button
                variant="outline"
                onClick={onAddToWishlist}
                disabled={isAddingToWishlist}
                className={cn("flex-1", isAddingToWishlist && "border-pink-400 bg-pink-50 text-pink-700")}
              >
                {isAddingToWishlist ? t('addedToWishlist') : t('addToWishlist')}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
