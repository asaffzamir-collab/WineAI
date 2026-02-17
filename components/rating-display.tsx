import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingDisplayProps {
  rating: number;
  maxRating?: number;
  reviews?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function RatingDisplay({
  rating,
  maxRating = 5,
  reviews,
  size = 'md',
  showLabel = true,
  className,
}: RatingDisplayProps) {
  const normalizedRating = Math.min(rating, maxRating);
  const fullStars = Math.floor(normalizedRating);
  const hasHalfStar = normalizedRating - fullStars >= 0.3;
  const emptyStars = maxRating - fullStars - (hasHalfStar ? 1 : 0);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const textSize = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of ${maxRating}`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star
            key={`full-${i}`}
            className={cn(sizeClasses[size], 'fill-copper-400 text-copper-400')}
          />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className={cn(sizeClasses[size], 'text-muted-foreground/30')} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <Star className={cn(sizeClasses[size], 'fill-copper-400 text-copper-400')} />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star
            key={`empty-${i}`}
            className={cn(sizeClasses[size], 'text-muted-foreground/30')}
          />
        ))}
      </div>
      {showLabel && (
        <span className={cn(textSize[size], 'font-medium text-foreground')}>
          {rating.toFixed(1)}
        </span>
      )}
      {reviews !== undefined && (
        <span className={cn(textSize[size], 'text-muted-foreground')}>
          ({reviews.toLocaleString()})
        </span>
      )}
    </div>
  );
}
