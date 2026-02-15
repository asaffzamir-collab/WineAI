'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Star, ExternalLink, Check, X, Wine, Thermometer, Clock, UtensilsCrossed, Heart } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { WineData, ProfileMatchResult } from '@/lib/openai';

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

        {/* Profile Match - below wine profile */}
        {matchResult && (
          <section className="rounded-lg border-2 border-wine-100 p-4">
            <h3 className="mb-3 font-semibold text-wine-900">{t('matchToProfile')}</h3>
            <div className="mb-4 flex items-center gap-3">
              <Progress value={matchResult.match_percentage} className="flex-1" />
              <span className="text-lg font-bold text-wine-900">
                {matchResult.match_percentage}% {t('match')}
              </span>
            </div>
            <ul className="space-y-2 text-sm">
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
