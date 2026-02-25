'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { WineData } from '@/lib/openai';

interface AddToCellarDialogProps {
  wine: WineData | null;
  userId: string;
  bottlePhotoUrl?: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddToCellarDialog({
  wine,
  userId,
  bottlePhotoUrl,
  onClose,
  onAdded,
}: AddToCellarDialogProps) {
  const tCellar = useTranslations('cellar');
  const tCommon = useTranslations('common');
  const tWineCard = useTranslations('wineCard');
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [priceNis, setPriceNis] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (wine) {
      setQuantity(1);
      setPriceNis('');
      setError('');
    }
  }, [wine]);

  const handleConfirm = async () => {
    if (!wine) return;
    setError('');
    setIsSubmitting(true);
    try {
      const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
      const priceStr = priceNis.trim().replace(/,/g, '.');
      const purchasePrice = priceStr === '' ? undefined : parseFloat(priceStr);
      const body: Record<string, unknown> = { userId, wine, quantity: qty };

      if (purchasePrice != null && !Number.isNaN(purchasePrice) && purchasePrice >= 0) {
        body.purchasePrice = purchasePrice;
      }
      if (bottlePhotoUrl) {
        body.bottlePhotoUrl = bottlePhotoUrl;
      }

      const response = await fetch('/api/cellar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data?.error === 'string' ? data.error : 'Failed to add to cellar';
        setError(message);
        return;
      }

      onClose();
      onAdded();
      window.dispatchEvent(new Event('cellar-updated'));

      if (data.cellarItemId) {
        router.push(`/cellar?place=${data.cellarItemId}`);
      }
    } catch (err) {
      console.error('Failed to add to cellar:', err);
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={!!wine} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-sm z-[100]">
        {wine && (
          <>
            <h3 className="heading-serif text-lg text-bordeaux-600 dark:text-ivory-200 pe-8">
              {tCellar('addWine')}: {wine.name}
            </h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 pe-8">{wine.winery}</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  {tCellar('quantity')}
                </label>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-stone-600 dark:text-stone-400">
                  {tCellar('purchasePriceNis')}
                </label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0"
                  value={priceNis}
                  onChange={(e) => setPriceNis(e.target.value)}
                  className="w-full"
                />
                <p className="mt-1 text-xs text-stone-600/70 dark:text-stone-400/70">{tCellar('priceOptional')}</p>
              </div>
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}
            <div className="mt-6 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={handleConfirm}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  tWineCard('addToCellar')
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
