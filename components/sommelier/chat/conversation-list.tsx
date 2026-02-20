'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageSquarePlus, MessageCircle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface ConversationSummary {
  id: string;
  title: string | null;
  messageCount: number;
  lastMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({ onSelect, onNew }: ConversationListProps) {
  const t = useTranslations('sommelier');
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/sommelier/conversations');
      if (!res.ok) return;
      const data = await res.json();
      setConversations(data.conversations || []);
    } catch {
      // silent fail
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`/api/sommelier/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // silent fail
    } finally {
      setDeletingId(null);
    }
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3">
        <Button onClick={onNew} className="w-full gap-2" variant="default">
          <MessageSquarePlus className="h-4 w-4" />
          {t('newConversation')}
        </Button>
      </div>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-bordeaux-50 dark:bg-bordeaux-900/20 mb-4">
            <MessageCircle className="h-7 w-7 text-bordeaux-500 dark:text-bordeaux-400" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{t('noConversations')}</p>
          <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
            {t('noConversationsDesc')}
          </p>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {conversations.map((conv) => (
            <li key={conv.id}>
              <button
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'w-full text-start rounded-xl border border-border/50 bg-card p-3 transition-colors',
                  'hover:bg-accent/50 active:bg-accent'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {conv.title || t('untitledConversation')}
                    </p>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground/70">
                      {formatTime(conv.updatedAt)}
                    </span>
                    <button
                      onClick={(e) => handleDelete(e, conv.id)}
                      disabled={deletingId === conv.id}
                      className="p-1 rounded-lg text-muted-foreground/50 hover:text-destructive transition-colors"
                      aria-label="Delete conversation"
                    >
                      {deletingId === conv.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
