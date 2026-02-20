'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Send, Wine, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeId } from '@/lib/utils';
import { ChatBubble } from '../panel/chat-message';
import type { ChatMessage } from '@/lib/sommelier-types';

interface FullScreenChatProps {
  conversationId: string | null;
  onBack: () => void;
}

export function FullScreenChat({ conversationId, onBack }: FullScreenChatProps) {
  const t = useTranslations('sommelier');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [value, setValue] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleGenerated = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

  // Load existing conversation
  useEffect(() => {
    if (!conversationId) return;
    setIsLoading(true);
    fetch(`/api/sommelier/conversations/${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        const conv = data.conversation;
        if (conv) {
          setTitle(conv.title);
          const msgs = Array.isArray(conv.messages) ? conv.messages as ChatMessage[] : [];
          setMessages(msgs);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [conversationId]);

  const saveMessages = useCallback(
    async (id: string, msgs: ChatMessage[]) => {
      try {
        await fetch(`/api/sommelier/conversations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: msgs }),
        });
      } catch {
        // best-effort
      }
    },
    [],
  );

  const generateTitle = useCallback(
    async (id: string, msgs: ChatMessage[]) => {
      if (titleGenerated.current) return;
      titleGenerated.current = true;
      try {
        const snippet = msgs.slice(0, 4).map((m) => `${m.role}: ${m.content.slice(0, 200)}`).join('\n');
        const res = await fetch('/api/sommelier/conversations/generate-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: id, snippet }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.title) setTitle(data.title);
        }
      } catch {
        // silent
      }
    },
    [],
  );

  const handleSend = async () => {
    const trimmed = value.trim();
    if (!trimmed || isSending) return;

    setValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg: ChatMessage = {
      id: safeId(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    const streamingId = safeId();
    const assistantPlaceholder: ChatMessage = {
      id: streamingId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, assistantPlaceholder]);
    setIsSending(true);

    // Create conversation on first message if needed
    let activeId = convId;
    if (!activeId) {
      try {
        const res = await fetch('/api/sommelier/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        activeId = data.conversation?.id ?? null;
        if (activeId) setConvId(activeId);
      } catch {
        // continue without persistence
      }
    }

    try {
      const history = messages.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await fetch('/api/sommelier/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      });

      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();

      const updatedMessages = (prev: ChatMessage[]) =>
        prev.map((m) =>
          m.id === streamingId
            ? {
                ...m,
                content: data.message || data.content || '',
                wines: data.wines,
                actions: data.actions,
                isStreaming: false,
              }
            : m,
        );

      setMessages(updatedMessages);

      // Persist and auto-title
      const finalMessages = updatedMessages([...messages, userMsg, assistantPlaceholder]);
      if (activeId) {
        await saveMessages(activeId, finalMessages);
        if (finalMessages.length >= 4 && !title) {
          generateTitle(activeId, finalMessages);
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === streamingId
            ? { ...m, content: t('chatError'), isStreaming: false }
            : m,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-save on exit
  useEffect(() => {
    return () => {
      if (convId && messages.length > 0) {
        const payload = JSON.stringify({ messages });
        navigator.sendBeacon?.(
          `/api/sommelier/conversations/${convId}`,
          new Blob([payload], { type: 'application/json' }),
        );
      }
    };
  }, [convId, messages]);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-border/50 px-4 py-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent transition-colors"
          aria-label={t('back')}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground truncate">
            {title || t('newConversation')}
          </h2>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 mb-4">
              <Wine className="h-7 w-7 text-bordeaux-500 dark:text-bordeaux-400" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">{t('chatWelcomeTitle')}</p>
            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
              {t('chatWelcomeDesc')}
            </p>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <ChatBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border/50 px-4 py-3 flex-shrink-0 pb-[env(safe-area-inset-bottom)]">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex items-end gap-2"
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('chatPlaceholder')}
            rows={1}
            className={cn(
              'flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm',
              'placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring',
              'max-h-[120px] min-h-[44px]',
            )}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!value.trim() || isSending}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-bordeaux-600 text-white transition-colors hover:bg-bordeaux-700 disabled:opacity-40 flex-shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
