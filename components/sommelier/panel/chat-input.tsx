'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSommelier } from '../sommelier-context';
import { cn } from '@/lib/utils';

export function ChatInput() {
  const [value, setValue] = useState('');
  const { sendChatMessage, isChatLoading } = useSommelier();
  const t = useTranslations('sommelier');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = value.trim();
    if (!query || isChatLoading) return;

    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await sendChatMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border/50 px-4 py-3 flex-shrink-0">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('chatPlaceholder')}
        rows={1}
        className={cn(
          'flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm',
          'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring',
          'max-h-[120px] min-h-[44px]'
        )}
        disabled={isChatLoading}
      />
      <button
        type="submit"
        disabled={!value.trim() || isChatLoading}
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-bordeaux-600 text-white transition-colors hover:bg-bordeaux-700 disabled:opacity-40 flex-shrink-0"
      >
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
