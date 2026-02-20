'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import {
  Users,
  Shield,
  ShieldOff,
  ShieldCheck,
  Trash2,
  KeyRound,
  Eraser,
  Search,
  ArrowLeft,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Wine,
  Heart,
  Sparkles,
  RefreshCw,
  Crown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface UserRow {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  lastSignIn: string | null;
  isAdmin: boolean;
  isPremium: boolean;
  onboardingCompleted: boolean;
  cellarCount: number;
  wishlistCount: number;
  tastingCount: number;
}

type ConfirmAction = {
  type: 'delete' | 'erase' | 'reset';
  userId: string;
  userEmail: string;
};

export function AdminPage({ adminEmail }: { adminEmail: string }) {
  const t = useTranslations('admin');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      console.error('Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [togglingAdmin, setTogglingAdmin] = useState<string | null>(null);
  const [togglingPremium, setTogglingPremium] = useState<string | null>(null);
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [premiumLoading, setPremiumLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.settings) setPremiumEnabled(data.settings.premium_enabled);
      })
      .catch(() => {})
      .finally(() => setPremiumLoading(false));
  }, []);

  const handleTogglePremiumGlobal = async () => {
    const newValue = !premiumEnabled;
    setPremiumEnabled(newValue);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premium_enabled: newValue }),
      });
      if (!res.ok) {
        setPremiumEnabled(!newValue);
        setToastMessage(t('actionFailed'));
      } else {
        setToastMessage(newValue ? t('premiumActivated') : t('premiumDeactivated'));
      }
    } catch {
      setPremiumEnabled(!newValue);
      setToastMessage(t('actionFailed'));
    }
  };

  const handleToggleUserPremium = async (userId: string, currentIsPremium: boolean) => {
    setTogglingPremium(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-premium`, { method: 'POST' });
      if (!res.ok) {
        setToastMessage(t('actionFailed'));
        return;
      }
      const data = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isPremium: data.subscription_tier === 'premium' } : u
        )
      );
      setToastMessage(data.subscription_tier === 'premium' ? t('premiumGranted') : t('premiumRevoked'));
    } catch {
      setToastMessage(t('actionFailed'));
    } finally {
      setTogglingPremium(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    setTogglingAdmin(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: !currentIsAdmin }),
      });
      if (!res.ok) {
        const data = await res.json();
        setToastMessage(data.error || t('actionFailed'));
        return;
      }
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isAdmin: !currentIsAdmin } : u
        )
      );
      setToastMessage(!currentIsAdmin ? t('adminGranted') : t('adminRevoked'));
    } catch {
      setToastMessage(t('actionFailed'));
    } finally {
      setTogglingAdmin(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    setActionLoading(true);

    try {
      if (confirmAction.type === 'delete') {
        const res = await fetch(`/api/admin/users/${confirmAction.userId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed');
        setUsers((prev) => prev.filter((u) => u.id !== confirmAction.userId));
        setToastMessage(t('userDeleted'));
      } else if (confirmAction.type === 'erase') {
        const res = await fetch(
          `/api/admin/users/${confirmAction.userId}/erase-data`,
          { method: 'POST' }
        );
        if (!res.ok) throw new Error('Failed');
        const eraseData = await res.json().catch(() => ({}));

        // Clear client-side storage for the erased user
        if (Array.isArray(eraseData.clearLocalStorage)) {
          for (const key of eraseData.clearLocalStorage) {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
          }
        }
        if (Array.isArray(eraseData.clearSessionStorage)) {
          for (const key of eraseData.clearSessionStorage) {
            try { sessionStorage.removeItem(key); } catch { /* ignore */ }
          }
        }

        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmAction.userId
              ? { ...u, cellarCount: 0, wishlistCount: 0, tastingCount: 0 }
              : u
          )
        );
        setToastMessage(t('dataErased'));
      } else if (confirmAction.type === 'reset') {
        const res = await fetch(
          `/api/admin/users/${confirmAction.userId}/reset-password`,
          { method: 'POST' }
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setNewPassword(data.newPassword);
        setActionLoading(false);
        return;
      }
    } catch {
      setToastMessage(t('actionFailed'));
    }

    setActionLoading(false);
    setConfirmAction(null);
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closePasswordModal = () => {
    setNewPassword(null);
    setConfirmAction(null);
    setCopied(false);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-ivory-200 pb-8 dark:bg-charcoal-900">
      {/* Header */}
      <header className="bg-charcoal-800 px-4 pb-6 pt-8 dark:bg-charcoal-900 dark:border-b dark:border-charcoal-700">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-charcoal-700">
                <Shield className="h-5 w-5 text-copper-400" />
              </div>
              <div>
                <h1 className="heading-serif text-xl text-white">{t('title')}</h1>
                <p className="text-xs text-charcoal-400">{adminEmail}</p>
              </div>
            </div>
            <Link href="/settings">
              <Button variant="outline" size="sm" className="border-charcoal-600 bg-charcoal-700 text-charcoal-200 hover:bg-charcoal-600 hover:text-white">
                <ArrowLeft className="h-4 w-4 me-1.5" />
                {t('backToSettings')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 mt-6 space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="mx-auto mb-1 h-5 w-5 text-bordeaux-500" strokeWidth={1.5} />
              <p className="heading-serif text-2xl text-bordeaux-600 dark:text-ivory-200">
                {isLoading ? '—' : users.length}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400">{t('totalUsers')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Shield className="mx-auto mb-1 h-5 w-5 text-copper-400" strokeWidth={1.5} />
              <p className="heading-serif text-2xl text-bordeaux-600 dark:text-ivory-200">
                {isLoading ? '—' : users.filter((u) => u.isAdmin).length}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400">{t('admins')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Sparkles className="mx-auto mb-1 h-5 w-5 text-green-600" strokeWidth={1.5} />
              <p className="heading-serif text-2xl text-bordeaux-600 dark:text-ivory-200">
                {isLoading
                  ? '—'
                  : users.filter((u) => u.onboardingCompleted).length}
              </p>
              <p className="text-xs text-stone-600 dark:text-stone-400">{t('onboarded')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Premium Paywall Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t('premiumPaywall')}</p>
                  <p className="text-xs text-muted-foreground">
                    {premiumEnabled ? t('premiumPaywallOnDesc') : t('premiumPaywallOffDesc')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleTogglePremiumGlobal}
                disabled={premiumLoading}
                className="transition-colors"
                aria-label="Toggle premium paywall"
              >
                {premiumLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                ) : premiumEnabled ? (
                  <ToggleRight className="h-8 w-8 text-amber-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-muted-foreground" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Search + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ivory-300 bg-white py-2.5 ps-10 pe-4 text-sm text-bordeaux-600 placeholder:text-stone-400 focus:border-bordeaux-300 focus:outline-none focus:ring-1 focus:ring-bordeaux-300 dark:border-charcoal-700 dark:bg-charcoal-800 dark:text-ivory-200 dark:placeholder:text-stone-500"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setIsLoading(true);
              fetchUsers();
            }}
            className="shrink-0 h-10 w-10 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-bordeaux-400" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-2 h-8 w-8 text-stone-300" />
              <p className="text-sm text-stone-500">{t('noUsersFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">
                          {user.displayName || user.email}
                        </p>
                        {user.isAdmin && (
                          <span className="shrink-0 rounded-full bg-copper-50 px-2 py-0.5 text-[10px] font-semibold text-copper-600 dark:bg-copper-700/20 dark:text-copper-400">
                            {t('adminBadge')}
                          </span>
                        )}
                        {user.isPremium && (
                          <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            {t('premiumBadge')}
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {user.email}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                        <span>{t('joined')} {formatDate(user.createdAt)}</span>
                        <span className="text-stone-300 dark:text-charcoal-600">|</span>
                        <span>{t('lastLogin')} {formatDate(user.lastSignIn)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-bordeaux-50 px-2 py-0.5 text-[11px] text-bordeaux-500 dark:bg-bordeaux-900/20 dark:text-bordeaux-300">
                          <Wine className="h-3 w-3" /> {user.cellarCount} {t('cellar')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-ruby-50 px-2 py-0.5 text-[11px] text-ruby-500 dark:bg-ruby-900/20 dark:text-ruby-400">
                          <Heart className="h-3 w-3" /> {user.wishlistCount} {t('wishlist')}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-copper-50 px-2 py-0.5 text-[11px] text-copper-600 dark:bg-copper-700/20 dark:text-copper-400">
                          <Sparkles className="h-3 w-3" /> {user.tastingCount} {t('tastings')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ivory-200 pt-3 dark:border-charcoal-700">
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.isAdmin)}
                      disabled={togglingAdmin === user.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        user.isAdmin
                          ? 'bg-copper-50 text-copper-600 hover:bg-copper-100 dark:bg-copper-700/20 dark:text-copper-400 dark:hover:bg-copper-700/30'
                          : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                      }`}
                    >
                      {togglingAdmin === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : user.isAdmin ? (
                        <ShieldOff className="h-3.5 w-3.5" />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                      {user.isAdmin ? t('removeAdmin') : t('makeAdmin')}
                    </button>
                    <button
                      onClick={() => handleToggleUserPremium(user.id, user.isPremium)}
                      disabled={togglingPremium === user.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        user.isPremium
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30'
                      }`}
                    >
                      {togglingPremium === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Crown className="h-3.5 w-3.5" />
                      )}
                      {user.isPremium ? t('removePremium') : t('grantPremium')}
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'reset',
                          userId: user.id,
                          userEmail: user.email,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ivory-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-ivory-200 transition-colors dark:bg-charcoal-700 dark:text-stone-300 dark:hover:bg-charcoal-600"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      {t('resetPassword')}
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          type: 'erase',
                          userId: user.id,
                          userEmail: user.email,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                      {t('eraseData')}
                    </button>
                    {!user.isAdmin && (
                      <button
                        onClick={() =>
                          setConfirmAction({
                            type: 'delete',
                            userId: user.id,
                            userEmail: user.email,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('deleteUser')}
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && !newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-page">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-bordeaux-600 dark:text-ivory-200">
                {confirmAction.type === 'delete' && t('confirmDeleteTitle')}
                {confirmAction.type === 'erase' && t('confirmEraseTitle')}
                {confirmAction.type === 'reset' && t('confirmResetTitle')}
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {confirmAction.type === 'delete' &&
                  t('confirmDeleteDesc', { email: confirmAction.userEmail })}
                {confirmAction.type === 'erase' &&
                  t('confirmEraseDesc', { email: confirmAction.userEmail })}
                {confirmAction.type === 'reset' &&
                  t('confirmResetDesc', { email: confirmAction.userEmail })}
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmAction(null)}
                  disabled={actionLoading}
                >
                  {t('cancel')}
                </Button>
                <Button
                  variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                  className={`flex-1 ${
                    confirmAction.type !== 'delete'
                      ? 'bg-bordeaux-600 text-white hover:bg-bordeaux-700'
                      : ''
                  }`}
                  onClick={handleConfirm}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t('confirm')
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New Password Modal */}
      {newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-page">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                <KeyRound className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-bordeaux-600 dark:text-ivory-200">
                {t('passwordResetSuccess')}
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {t('passwordResetDesc', {
                  email: confirmAction?.userEmail || '',
                })}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-charcoal-800 px-3 py-2 text-sm font-mono text-green-400 select-all">
                  {newPassword}
                </code>
                <button
                  onClick={copyPassword}
                  className="rounded-lg bg-charcoal-700 p-2 text-white hover:bg-charcoal-600 transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                className="mt-4 w-full bg-bordeaux-600 text-white hover:bg-bordeaux-700"
                onClick={closePasswordModal}
              >
                {t('done')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-page">
          <div className="rounded-xl bg-charcoal-800 px-4 py-2.5 text-sm text-white shadow-lg">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
