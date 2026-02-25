'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Send, Wine, Loader2, History, X, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { safeId } from '@/lib/utils';
import { ChatBubble } from '../panel/chat-message';
import { PierHeadAvatar } from '../sommelier-trigger';
import { UsageLimitModal, parseUsageLimitError } from '@/components/usage-limit-modal';
import type { ChatMessage } from '@/lib/sommelier-types';
import type { ConversationSummary } from './conversation-list';

/** Tracks window.visualViewport for pixel-accurate height on iOS Safari. */
function useVisualViewport() {
  const [height, setHeight] = useState<number | null>(null);
  const [offsetTop, setOffsetTop] = useState(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setHeight(vv.height);
      setOffsetTop(vv.offsetTop);
      // Keyboard is likely open when the visual viewport is significantly
      // shorter than the layout viewport (address bar alone is ~50-70 px).
      setKeyboardOpen(window.innerHeight - vv.height > 100);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  return { height, offsetTop, keyboardOpen };
}

interface FullScreenChatProps {
  conversationId: string | null;
  onBack: () => void;
  initialSidebarOpen?: boolean;
}

export function FullScreenChat({ conversationId, onBack, initialSidebarOpen }: FullScreenChatProps) {
  const t = useTranslations('sommelier');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [value, setValue] = useState('');
  const [title, setTitle] = useState<string | null>(null);
  const [convId, setConvId] = useState<string | null>(conversationId);
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen ?? false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleGenerated = useRef(false);
  const { height: vpHeight, offsetTop: vpOffsetTop, keyboardOpen } = useVisualViewport();
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ type: 'wine_search' | 'pier_message'; current: number; limit: number; tier: string } | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [value]);

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

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/sommelier/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent
    } finally {
      setConversationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (sidebarOpen && !conversationsLoaded) {
      loadConversations();
    }
  }, [sidebarOpen, conversationsLoaded, loadConversations]);

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

  const handleSend = async (text?: string) => {
    const trimmed = (text ?? value).trim();
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

      const data = await res.json();
      const usageErr = parseUsageLimitError(res.status, data);
      if (usageErr) {
        setUsageLimitInfo(usageErr);
        setMessages((prev) => prev.filter((m) => m.id !== streamingId));
        setIsSending(false);
        return;
      }
      if (!res.ok) throw new Error('Chat request failed');

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

  const handleNewConversation = () => {
    setMessages([]);
    setConvId(null);
    setTitle(null);
    titleGenerated.current = false;
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conv: ConversationSummary) => {
    setMessages([]);
    setConvId(conv.id);
    setTitle(conv.title);
    titleGenerated.current = !!conv.title;
    setSidebarOpen(false);
    setIsLoading(true);
    fetch(`/api/sommelier/conversations/${conv.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) {
          const msgs = Array.isArray(data.conversation.messages) ? data.conversation.messages as ChatMessage[] : [];
          setMessages(msgs);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await fetch(`/api/sommelier/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (convId === id) handleNewConversation();
    } catch {
      // silent
    }
  };

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

  const suggestions = [
    t('chatSuggestion1'),
    t('chatSuggestion2'),
    t('chatSuggestion3'),
    t('chatSuggestion4'),
  ];

  const showWelcome = messages.length === 0 && !isLoading;

  const containerStyle: React.CSSProperties = vpHeight
    ? { height: `${vpHeight}px`, top: `${vpOffsetTop}px` }
    : { height: '100dvh', top: 0 };

  return (
    <>
      <div
        className="fixed inset-x-0 z-[70] flex flex-col bg-background"
        style={containerStyle}
      >
        {/* History sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-[71] bg-black/40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 end-0 z-[72] w-[280px] flex flex-col bg-card border-s border-border/50 shadow-lift animate-in slide-in-from-right duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-foreground">{t('chatHistory')}</h3>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleNewConversation}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                    aria-label={t('newConversation')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {!conversationsLoaded ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="px-4 py-6 text-xs text-muted-foreground text-center">
                    {t('noConversations')}
                  </p>
                ) : (
                  <ul className="py-2 space-y-0.5 px-2">
                    {conversations.map((conv) => (
                      <li key={conv.id}>
                        <button
                          onClick={() => handleSelectConversation(conv)}
                          className={cn(
                            'w-full text-start rounded-lg px-3 py-2.5 text-sm transition-colors group',
                            conv.id === convId
                              ? 'bg-accent text-foreground'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                          )}
                        >
                          <p className="truncate font-medium text-[13px]">
                            {conv.title || t('untitledConversation')}
                          </p>
                          <div className="flex items-center justify-between mt-0.5">
                            {conv.lastMessage && (
                              <p className="text-[11px] text-muted-foreground/70 truncate flex-1 pe-2">
                                {conv.lastMessage}
                              </p>
                            )}
                            <button
                              onClick={(e) => handleDeleteConversation(e, conv.id)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground/50 hover:text-destructive transition-all flex-shrink-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}

        {/* Header */}
        <header className="flex items-center border-b border-border/50 px-3 h-12 flex-shrink-0">
          <button
            onClick={onBack}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
            aria-label={t('back')}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2 px-2">
          <PierHeadAvatar className="h-8 w-8 flex-shrink-0 rounded-full" />
            <h2 className="text-sm font-semibold text-foreground truncate">
              {title || t('pierGreeting')}
            </h2>
          </div>

          <button
            onClick={() => { if (!conversationsLoaded) loadConversations(); setSidebarOpen(!sidebarOpen); }}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent transition-colors flex-shrink-0"
            aria-label={t('chatHistory')}
          >
            <History className="h-5 w-5" />
          </button>
        </header>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : showWelcome ? (
            <div className="flex flex-col items-center justify-center h-full px-6 pb-4">
              <div className="flex flex-col items-center text-center max-w-sm">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 mb-5">
                  <Wine className="h-8 w-8 text-bordeaux-500 dark:text-bordeaux-400" strokeWidth={1.5} />
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-1">{t('chatWelcomeTitle')}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-8">
                  {t('chatWelcomeDesc')}
                </p>
                <div className="grid grid-cols-2 gap-2 w-full">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      disabled={isSending}
                      className="rounded-xl border border-border/60 bg-card px-3 py-3 text-start text-xs text-foreground transition-colors hover:bg-accent/50 hover:border-bordeaux-200 dark:hover:border-bordeaux-800 leading-snug"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
              {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar — stays at flex bottom, 100dvh handles keyboard */}
        <div className="flex-shrink-0 border-t border-border/50 bg-background">
          <div className="max-w-2xl mx-auto px-3 py-2">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex items-end gap-2"
            >
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 300);
                }}
                placeholder={t('chatPlaceholder')}
                rows={1}
                inputMode="text"
                enterKeyHint="send"
                className={cn(
                  'flex-1 resize-none rounded-xl border border-border/60 bg-background px-3 py-2.5 text-sm',
                  'placeholder:text-muted-foreground/60 focus:outline-none focus:border-bordeaux-300 dark:focus:border-bordeaux-700',
                  'max-h-[120px] min-h-[44px]',
                )}
                disabled={isSending}
              />
              <button
                type="submit"
                disabled={!value.trim() || isSending}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-bordeaux-600 text-white transition-colors hover:bg-bordeaux-700 disabled:opacity-40 flex-shrink-0"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
          {!keyboardOpen && <div className="pb-[env(safe-area-inset-bottom)]" />}
        </div>
      </div>
      {usageLimitInfo && (
        <UsageLimitModal info={usageLimitInfo} onClose={() => setUsageLimitInfo(null)} />
      )}
    </>
  );
}
