'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { SommelierPhase, ConversationItem, SommelierState, ChatMessage, ChatWineCard } from '@/lib/sommelier-types';
import { createClient } from '@/lib/supabase/client';
import { safeId } from '@/lib/utils';
import { parseUsageLimitError } from '@/components/usage-limit-modal';

interface SommelierContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: (flow?: string) => void;
  close: () => void;
  phase: SommelierPhase;
  maxUnlockedPhase: SommelierPhase;
  setPhase: (phase: SommelierPhase) => void;
  precision: number;
  likedWinesCount: number;
  hasDiscoveryData: boolean;
  userId: string | null;
  conversationItems: ConversationItem[];
  addConversationItem: (item: ConversationItem) => void;
  clearConversation: () => void;
  activeFlow: string | null;
  setActiveFlow: (flow: string | null) => void;
  refreshState: () => Promise<void>;
  isLoading: boolean;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => Promise<void>;
  isChatLoading: boolean;
  clearChat: () => void;
  usageLimitInfo: { type: 'wine_search' | 'pier_message'; current: number; limit: number; tier: string } | null;
  setUsageLimitInfo: (info: { type: 'wine_search' | 'pier_message'; current: number; limit: number; tier: string } | null) => void;
  lastDiscoveryWines: unknown[] | null;
  setLastDiscoveryWines: (wines: unknown[] | null) => void;
}

const SommelierContext = createContext<SommelierContextValue | null>(null);

export function useSommelier() {
  const ctx = useContext(SommelierContext);
  if (!ctx) throw new Error('useSommelier must be used within SommelierProvider');
  return ctx;
}

export function SommelierProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<SommelierPhase>('discovery');
  const [maxUnlockedPhase, setMaxUnlockedPhase] = useState<SommelierPhase>('discovery');
  const [precision, setPrecision] = useState(0);
  const [likedWinesCount, setLikedWinesCount] = useState(0);
  const [hasDiscoveryData, setHasDiscoveryData] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [conversationItems, setConversationItems] = useState<ConversationItem[]>([]);
  const [activeFlow, setActiveFlowState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = sessionStorage.getItem('sommelierActiveFlow');
      if (saved === 'wine-discovery') {
        const hasWines = sessionStorage.getItem('lastDiscoveryWines');
        if (hasWines) return saved;
      }
      return null;
    } catch { return null; }
  });
  const setActiveFlow = useCallback((flow: string | null) => {
    setActiveFlowState(flow);
    try {
      if (flow) {
        sessionStorage.setItem('sommelierActiveFlow', flow);
      } else {
        sessionStorage.removeItem('sommelierActiveFlow');
      }
    } catch { /* quota or unavailable */ }
  }, []);
  const [isLoading, setIsLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [usageLimitInfo, setUsageLimitInfo] = useState<{ type: 'wine_search' | 'pier_message'; current: number; limit: number; tier: string } | null>(null);
  const [lastDiscoveryWines, setLastDiscoveryWinesState] = useState<unknown[] | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('lastDiscoveryWines');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const setLastDiscoveryWines = useCallback((wines: unknown[] | null) => {
    setLastDiscoveryWinesState(wines);
    try {
      if (wines) {
        sessionStorage.setItem('lastDiscoveryWines', JSON.stringify(wines));
      } else {
        sessionStorage.removeItem('lastDiscoveryWines');
      }
    } catch { /* quota or unavailable */ }
  }, []);
  const hasFetched = useRef(false);

  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/sommelier/state');
      if (!res.ok) {
        setIsLoading(false);
        return;
      }
      const state: SommelierState = await res.json();
      setPhase(state.phase);
      setMaxUnlockedPhase(state.maxUnlockedPhase ?? state.phase);
      setPrecision(state.precision);
      setLikedWinesCount(state.likedWinesCount);
      setHasDiscoveryData(state.hasDiscoveryData ?? false);
      if (state.conversationHistory?.length) {
        setConversationItems(state.conversationHistory);
      }
    } catch {
      // silently fail — user may not be logged in
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      refreshState();
      createClient().auth.getUser().then(({ data }) => {
        if (data?.user?.id) setUserId(data.user.id);
      });
    }
  }, [refreshState]);

  useEffect(() => {
    const handler = () => { refreshState(); };
    window.addEventListener('wine-profile-updated', handler);
    return () => window.removeEventListener('wine-profile-updated', handler);
  }, [refreshState]);

  const updatePhase = useCallback((newPhase: SommelierPhase) => {
    setPhase(newPhase);
    fetch('/api/sommelier/set-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phase: newPhase }),
    }).catch(() => {});
  }, []);

  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const open = useCallback((flow?: string) => {
    setIsOpen(true);
    if (flow) setActiveFlow(flow);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    setActiveFlow(null);
  }, []);

  const addConversationItem = useCallback((item: ConversationItem) => {
    setConversationItems(prev => [...prev, item]);
  }, []);

  const clearConversation = useCallback(() => {
    setConversationItems([]);
  }, []);

  const sendChatMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: safeId(),
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);

    const streamingId = safeId();
    setChatMessages(prev => [...prev, {
      id: streamingId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      created_at: new Date().toISOString(),
    }]);

    try {
      const history = chatMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      const res = await fetch('/api/sommelier/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history, stream: true }),
      });

      if (!res.ok) {
        let data;
        try { data = await res.json(); } catch { data = {}; }
        const usageErr = parseUsageLimitError(res.status, data);
        if (usageErr) {
          setUsageLimitInfo(usageErr);
          setChatMessages(prev => prev.filter(m => m.id !== streamingId));
          setIsChatLoading(false);
          return;
        }
        throw new Error('Chat request failed');
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let textAccum = '';
        let winesData: ChatWineCard[] | undefined;
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            const eventMatch = part.match(/^event:\s*(.+)$/m);
            const dataMatch = part.match(/^data:\s*(.+)$/m);
            if (!eventMatch || !dataMatch) continue;

            const eventType = eventMatch[1];
            let payload: unknown;
            try { payload = JSON.parse(dataMatch[1]); } catch { continue; }

            if (eventType === 'wines') {
              winesData = payload as ChatWineCard[];
              setChatMessages(prev =>
                prev.map(m => m.id === streamingId ? { ...m, wines: winesData } : m)
              );
            } else if (eventType === 'text') {
              textAccum += payload as string;
              setChatMessages(prev =>
                prev.map(m => m.id === streamingId ? { ...m, content: textAccum } : m)
              );
            } else if (eventType === 'done') {
              setChatMessages(prev =>
                prev.map(m =>
                  m.id === streamingId
                    ? { ...m, content: textAccum, wines: winesData, isStreaming: false }
                    : m
                )
              );
            }
          }
        }

        // Ensure streaming is marked complete even if no done event was received
        setChatMessages(prev =>
          prev.map(m =>
            m.id === streamingId && m.isStreaming
              ? { ...m, content: textAccum || m.content, wines: winesData ?? m.wines, isStreaming: false }
              : m
          )
        );
      } else {
        // Fallback: non-streaming JSON response
        const data = await res.json();
        setChatMessages(prev =>
          prev.map(m =>
            m.id === streamingId
              ? {
                  ...m,
                  content: data.message || data.content || '',
                  wines: data.wines,
                  actions: data.actions,
                  isStreaming: false,
                }
              : m
          )
        );
      }
    } catch {
      setChatMessages(prev =>
        prev.map(m =>
          m.id === streamingId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.', isStreaming: false }
            : m
        )
      );
    } finally {
      setIsChatLoading(false);
    }
  }, [chatMessages, isChatLoading]);

  const clearChat = useCallback(() => {
    setChatMessages([]);
  }, []);

  return (
    <SommelierContext.Provider
      value={{
        isOpen, toggle, open, close,
        phase, maxUnlockedPhase, setPhase: updatePhase, precision, likedWinesCount, hasDiscoveryData, userId,
        conversationItems, addConversationItem, clearConversation,
        activeFlow, setActiveFlow,
        refreshState, isLoading,
        chatMessages, sendChatMessage, isChatLoading, clearChat,
        usageLimitInfo, setUsageLimitInfo,
        lastDiscoveryWines, setLastDiscoveryWines,
      }}
    >
      {children}
    </SommelierContext.Provider>
  );
}
