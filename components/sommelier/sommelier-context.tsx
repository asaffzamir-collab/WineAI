'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { SommelierPhase, ConversationItem, SommelierState } from '@/lib/sommelier-types';
import { createClient } from '@/lib/supabase/client';

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
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  return (
    <SommelierContext.Provider
      value={{
        isOpen, toggle, open, close,
        phase, maxUnlockedPhase, setPhase: updatePhase, precision, likedWinesCount, hasDiscoveryData, userId,
        conversationItems, addConversationItem, clearConversation,
        activeFlow, setActiveFlow,
        refreshState, isLoading,
      }}
    >
      {children}
    </SommelierContext.Provider>
  );
}
