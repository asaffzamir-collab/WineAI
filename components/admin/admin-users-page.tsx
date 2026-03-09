'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Loader2,
  Shield,
  ShieldOff,
  ShieldCheck,
  Crown,
  Trash2,
  KeyRound,
  Eraser,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  Wine,
  MessageSquare,
  BookOpen,
  GlassWater,
  Heart,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Activity,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TierStatus {
  tier: string;
  wineSearchPct: number;
  pierMessagePct: number;
  wineSearchStatus: 'ok' | 'warning' | 'critical' | 'exceeded';
  pierMessageStatus: 'ok' | 'warning' | 'critical' | 'exceeded';
}

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
  wineSearches: number;
  pierMessages: number;
  totalSearchesAllTime: number;
  totalMessagesAllTime: number;
  sommelierPhase: string | null;
  conversationCount: number;
  engagementScore: number;
  segment: 'power' | 'regular' | 'light' | 'dormant';
  lastActiveAt: string | null;
  daysSinceLastActive: number;
  tierStatus: TierStatus;
  apiCostThisMonth: number;
}

type Segment = UserRow['segment'];

type SortKey =
  | 'engagement'
  | 'lastActive'
  | 'joined'
  | 'wineSearches'
  | 'cellar';

type ConfirmAction = {
  type: 'delete' | 'erase' | 'reset';
  userId: string;
  userEmail: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEGMENTS: { key: Segment | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'power', label: 'Power' },
  { key: 'regular', label: 'Regular' },
  { key: 'light', label: 'Light' },
  { key: 'dormant', label: 'Dormant' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'engagement', label: 'Engagement score' },
  { key: 'lastActive', label: 'Last active' },
  { key: 'joined', label: 'Join date' },
  { key: 'wineSearches', label: 'Wine searches' },
  { key: 'cellar', label: 'Cellar size' },
];

const SEGMENT_STYLES: Record<Segment, { dot: string; bg: string; text: string; ring: string }> = {
  power: {
    dot: 'bg-green-500',
    bg: 'bg-green-50 dark:bg-green-900/20',
    text: 'text-green-700 dark:text-green-400',
    ring: 'ring-green-500/30',
  },
  regular: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-400',
    ring: 'ring-blue-500/30',
  },
  light: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
  dormant: {
    dot: 'bg-stone-400',
    bg: 'bg-stone-100 dark:bg-stone-800/40',
    text: 'text-stone-500 dark:text-stone-400',
    ring: 'ring-stone-400/30',
  },
};

const TIER_STATUS_COLORS: Record<TierStatus['wineSearchStatus'], string> = {
  ok: 'bg-green-500',
  warning: 'bg-amber-500',
  critical: 'bg-orange-500',
  exceeded: 'bg-red-500',
};

const TIER_BADGE_STYLES: Record<TierStatus['wineSearchStatus'], string> = {
  ok: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  critical: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  exceeded: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function relativeTime(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  if (days < 60) return '1 month ago';
  return `${Math.floor(days / 30)} months ago`;
}

function worstStatus(
  a: TierStatus['wineSearchStatus'],
  b: TierStatus['wineSearchStatus'],
): TierStatus['wineSearchStatus'] {
  const order: TierStatus['wineSearchStatus'][] = ['ok', 'warning', 'critical', 'exceeded'];
  return order[Math.max(order.indexOf(a), order.indexOf(b))];
}

function tierBadgeLabel(pct: number, status: TierStatus['wineSearchStatus']): string {
  if (status === 'exceeded') return 'EXCEEDED';
  return `${pct}% of tier`;
}

function sortUsers(users: UserRow[], key: SortKey): UserRow[] {
  const sorted = [...users];
  switch (key) {
    case 'engagement':
      return sorted.sort((a, b) => b.engagementScore - a.engagementScore);
    case 'lastActive':
      return sorted.sort((a, b) => a.daysSinceLastActive - b.daysSinceLastActive);
    case 'joined':
      return sorted.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    case 'wineSearches':
      return sorted.sort((a, b) => b.wineSearches - a.wineSearches);
    case 'cellar':
      return sorted.sort((a, b) => b.cellarCount - a.cellarCount);
    default:
      return sorted;
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function EngagementBadge({ score, segment }: { score: number; segment: Segment }) {
  const s = SEGMENT_STYLES[segment];
  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ring-2 ${s.ring} ${s.bg}`}
    >
      <span className={`text-sm font-bold ${s.text}`}>{score}</span>
    </div>
  );
}

function UsageBar({
  label,
  pct,
  status,
}: {
  label: string;
  pct: number;
  status: TierStatus['wineSearchStatus'];
}) {
  const clampedPct = Math.min(pct, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-600 dark:text-stone-400">{label}</span>
        <span className={`font-medium ${TIER_BADGE_STYLES[status].split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
          {pct}%
          {status === 'exceeded' && ' — EXCEEDED'}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-charcoal-700">
        <div
          className={`h-full rounded-full transition-all ${TIER_STATUS_COLORS[status]}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

function MetricCell({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-ivory-100 px-3 py-2 dark:bg-charcoal-800">
      <Icon className="h-4 w-4 shrink-0 text-stone-400" />
      <div className="min-w-0">
        <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
        <p className="text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">{value}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Card
// ---------------------------------------------------------------------------

function UserCard({
  user,
  isExpanded,
  onToggleExpand,
  onAction,
  actionLoadingId,
}: {
  user: UserRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onAction: (action: string, user: UserRow) => void;
  actionLoadingId: string | null;
}) {
  const s = SEGMENT_STYLES[user.segment];
  const worst = worstStatus(user.tierStatus.wineSearchStatus, user.tierStatus.pierMessageStatus);
  const showTierWarning = worst !== 'ok';

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-0">
        {/* Collapsed row */}
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left"
          onClick={onToggleExpand}
        >
          {/* Left: name + badges */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-bordeaux-600 dark:text-ivory-200">
                {user.displayName || user.email}
              </p>
              {user.isAdmin && (
                <span className="shrink-0 rounded-full bg-copper-50 px-2 py-0.5 text-[10px] font-semibold text-copper-600 dark:bg-copper-700/20 dark:text-copper-400">
                  Admin
                </span>
              )}
              {user.isPremium && (
                <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  Premium
                </span>
              )}
            </div>

            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user.email}</p>

            {/* Segment + key metrics */}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${s.bg} ${s.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {user.segment.charAt(0).toUpperCase() + user.segment.slice(1)}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-bordeaux-50 px-2 py-0.5 text-[11px] text-bordeaux-500 dark:bg-bordeaux-900/20 dark:text-bordeaux-300">
                <Search className="h-3 w-3" /> {user.wineSearches}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                <MessageSquare className="h-3 w-3" /> {user.pierMessages}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-ruby-50 px-2 py-0.5 text-[11px] text-ruby-500 dark:bg-ruby-900/20 dark:text-ruby-400">
                <Wine className="h-3 w-3" /> {user.cellarCount}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-copper-50 px-2 py-0.5 text-[11px] text-copper-600 dark:bg-copper-700/20 dark:text-copper-400">
                <GlassWater className="h-3 w-3" /> {user.tastingCount}
              </span>

              {showTierWarning && (
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${TIER_BADGE_STYLES[worst]}`}>
                  {tierBadgeLabel(
                    Math.max(user.tierStatus.wineSearchPct, user.tierStatus.pierMessagePct),
                    worst,
                  )}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-stone-400 dark:text-stone-500">
              <span>Joined {formatDate(user.createdAt)}</span>
              <span className="text-stone-300 dark:text-charcoal-600">·</span>
              <span>
                Active {relativeTime(user.daysSinceLastActive)}
              </span>
            </div>
          </div>

          {/* Engagement badge */}
          <EngagementBadge score={user.engagementScore} segment={user.segment} />

          {/* Chevron */}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-stone-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Expanded detail */}
        <div
          className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
            isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          }`}
        >
          <div className="overflow-hidden">
            <div className="border-t border-ivory-200 px-4 pb-4 pt-3 dark:border-charcoal-700">
              {/* Profile summary */}
              <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                <div>
                  <span className="text-stone-400">Name</span>
                  <p className="font-medium text-foreground">{user.displayName || '—'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Email</span>
                  <p className="font-medium text-foreground truncate">{user.email}</p>
                </div>
                <div>
                  <span className="text-stone-400">Tier</span>
                  <p className="font-medium text-foreground capitalize">{user.tierStatus.tier || 'free'}</p>
                </div>
                <div>
                  <span className="text-stone-400">Joined</span>
                  <p className="font-medium text-foreground">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <span className="text-stone-400">Last active</span>
                  <p className="font-medium text-foreground">{formatDate(user.lastActiveAt)}</p>
                </div>
                <div>
                  <span className="text-stone-400">Sommelier phase</span>
                  <p className="font-medium text-foreground capitalize">{user.sommelierPhase || '—'}</p>
                </div>
              </div>

              {/* Tier usage bars */}
              <div className="mb-4 space-y-2 rounded-xl bg-ivory-100 p-3 dark:bg-charcoal-800">
                <p className="text-xs font-semibold text-stone-600 dark:text-stone-300">Tier Usage</p>
                <UsageBar
                  label="Wine Searches"
                  pct={user.tierStatus.wineSearchPct}
                  status={user.tierStatus.wineSearchStatus}
                />
                <UsageBar
                  label="Pier Messages"
                  pct={user.tierStatus.pierMessagePct}
                  status={user.tierStatus.pierMessageStatus}
                />
              </div>

              {/* Activity metrics grid */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MetricCell icon={Search} label="Searches (mo)" value={user.wineSearches} />
                <MetricCell icon={MessageSquare} label="Pier msgs (mo)" value={user.pierMessages} />
                <MetricCell icon={Wine} label="Cellar" value={user.cellarCount} />
                <MetricCell icon={Heart} label="Wishlist" value={user.wishlistCount} />
                <MetricCell icon={GlassWater} label="Tastings" value={user.tastingCount} />
                <MetricCell icon={BookOpen} label="Conversations" value={user.conversationCount} />
                <MetricCell icon={Activity} label="All-time searches" value={user.totalSearchesAllTime} />
                <MetricCell icon={Activity} label="All-time msgs" value={user.totalMessagesAllTime} />
              </div>

              {/* API Cost */}
              <div className="mb-4 flex items-center gap-2 text-xs">
                <DollarSign className="h-4 w-4 text-stone-400" />
                <span className="text-stone-500 dark:text-stone-400">API cost this month:</span>
                <span className="font-semibold text-bordeaux-600 dark:text-ivory-200">
                  ${user.apiCostThisMonth.toFixed(2)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 border-t border-ivory-200 pt-3 dark:border-charcoal-700">
                <button
                  onClick={() => onAction('toggle-admin', user)}
                  disabled={actionLoadingId === `admin-${user.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    user.isAdmin
                      ? 'bg-copper-50 text-copper-600 hover:bg-copper-100 dark:bg-copper-700/20 dark:text-copper-400 dark:hover:bg-copper-700/30'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                  }`}
                >
                  {actionLoadingId === `admin-${user.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : user.isAdmin ? (
                    <ShieldOff className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                </button>

                <button
                  onClick={() => onAction('toggle-premium', user)}
                  disabled={actionLoadingId === `premium-${user.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    user.isPremium
                      ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30'
                      : 'bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30'
                  }`}
                >
                  {actionLoadingId === `premium-${user.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Crown className="h-3.5 w-3.5" />
                  )}
                  {user.isPremium ? 'Remove Premium' : 'Grant Premium'}
                </button>

                <button
                  onClick={() => onAction('reset', user)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ivory-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-ivory-200 transition-colors dark:bg-charcoal-700 dark:text-stone-300 dark:hover:bg-charcoal-600"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Reset Password
                </button>

                <button
                  onClick={() => onAction('erase', user)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors dark:bg-amber-900/20 dark:text-amber-400 dark:hover:bg-amber-900/30"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  Erase Data
                </button>

                {!user.isAdmin && (
                  <button
                    onClick={() => onAction('delete', user)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<Segment | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('engagement');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // ---- Fetch ----
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setToastMessage('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // ---- Toast auto-dismiss ----
  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // ---- Filter + sort ----
  const filtered = useMemo(() => {
    let list = users;
    if (segmentFilter !== 'all') {
      list = list.filter((u) => u.segment === segmentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.displayName.toLowerCase().includes(q),
      );
    }
    return sortUsers(list, sortKey);
  }, [users, segmentFilter, searchQuery, sortKey]);

  // ---- Segment counts ----
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length };
    for (const u of users) {
      counts[u.segment] = (counts[u.segment] || 0) + 1;
    }
    return counts;
  }, [users]);

  // ---- Actions ----
  const handleAction = useCallback(
    async (action: string, user: UserRow) => {
      if (action === 'delete' || action === 'erase' || action === 'reset') {
        setConfirmAction({ type: action, userId: user.id, userEmail: user.email });
        return;
      }

      if (action === 'toggle-admin') {
        setActionLoadingId(`admin-${user.id}`);
        try {
          const res = await fetch(`/api/admin/users/${user.id}/toggle-admin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isAdmin: !user.isAdmin }),
          });
          if (!res.ok) {
            const d = await res.json().catch(() => ({}));
            setToastMessage(d.error || 'Action failed');
            return;
          }
          setUsers((prev) =>
            prev.map((u) => (u.id === user.id ? { ...u, isAdmin: !user.isAdmin } : u)),
          );
          setToastMessage(!user.isAdmin ? 'Admin granted' : 'Admin revoked');
        } catch {
          setToastMessage('Action failed');
        } finally {
          setActionLoadingId(null);
        }
      }

      if (action === 'toggle-premium') {
        setActionLoadingId(`premium-${user.id}`);
        try {
          const res = await fetch(`/api/admin/users/${user.id}/toggle-premium`, {
            method: 'POST',
          });
          if (!res.ok) {
            setToastMessage('Action failed');
            return;
          }
          const data = await res.json();
          setUsers((prev) =>
            prev.map((u) =>
              u.id === user.id
                ? { ...u, isPremium: data.subscription_tier === 'premium' }
                : u,
            ),
          );
          setToastMessage(
            data.subscription_tier === 'premium' ? 'Premium granted' : 'Premium revoked',
          );
        } catch {
          setToastMessage('Action failed');
        } finally {
          setActionLoadingId(null);
        }
      }
    },
    [],
  );

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction.type === 'delete') {
        const res = await fetch(`/api/admin/users/${confirmAction.userId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed');
        setUsers((prev) => prev.filter((u) => u.id !== confirmAction.userId));
        setExpandedId(null);
        setToastMessage('User deleted');
      } else if (confirmAction.type === 'erase') {
        const res = await fetch(`/api/admin/users/${confirmAction.userId}/erase-data`, {
          method: 'POST',
        });
        if (!res.ok) throw new Error('Failed');
        setUsers((prev) =>
          prev.map((u) =>
            u.id === confirmAction.userId
              ? { ...u, cellarCount: 0, wishlistCount: 0, tastingCount: 0 }
              : u,
          ),
        );
        setToastMessage('User data erased');
      } else if (confirmAction.type === 'reset') {
        const res = await fetch(
          `/api/admin/users/${confirmAction.userId}/reset-password`,
          { method: 'POST' },
        );
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setNewPassword(data.newPassword);
        setConfirmLoading(false);
        return;
      }
    } catch {
      setToastMessage('Action failed');
    }
    setConfirmLoading(false);
    setConfirmAction(null);
  }, [confirmAction]);

  const copyPassword = useCallback(async () => {
    if (!newPassword) return;
    await navigator.clipboard.writeText(newPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newPassword]);

  const closePasswordModal = useCallback(() => {
    setNewPassword(null);
    setConfirmAction(null);
    setCopied(false);
  }, []);

  // ---- Render ----
  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input
            type="text"
            placeholder="Search by name or email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-10"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowSortDropdown((v) => !v)}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {SORT_OPTIONS.find((o) => o.key === sortKey)?.label}
              </span>
            </Button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute end-0 top-full z-40 mt-1 w-48 rounded-xl border border-ivory-300 bg-white p-1 shadow-lg dark:border-charcoal-700 dark:bg-charcoal-800">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      className={`w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                        sortKey === opt.key
                          ? 'bg-bordeaux-50 font-semibold text-bordeaux-600 dark:bg-bordeaux-900/20 dark:text-bordeaux-300'
                          : 'text-stone-600 hover:bg-ivory-100 dark:text-stone-300 dark:hover:bg-charcoal-700'
                      }`}
                      onClick={() => {
                        setSortKey(opt.key);
                        setShowSortDropdown(false);
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => {
              setIsLoading(true);
              fetchUsers();
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Count badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bordeaux-50 px-2.5 py-1 text-xs font-semibold text-bordeaux-600 dark:bg-bordeaux-900/20 dark:text-bordeaux-300">
            <Users className="h-3.5 w-3.5" />
            {isLoading ? '…' : filtered.length}
          </span>
        </div>
      </div>

      {/* Segment filter tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {SEGMENTS.map(({ key, label }) => {
          const isActive = segmentFilter === key;
          const segStyle = key !== 'all' ? SEGMENT_STYLES[key] : null;
          return (
            <button
              key={key}
              onClick={() => setSegmentFilter(key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? segStyle
                    ? `${segStyle.bg} ${segStyle.text}`
                    : 'bg-bordeaux-600 text-white dark:bg-bordeaux-500'
                  : 'text-stone-500 hover:bg-ivory-100 dark:text-stone-400 dark:hover:bg-charcoal-800'
              }`}
            >
              {label}
              <span
                className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold leading-none ${
                  isActive
                    ? segStyle
                      ? 'bg-white/50 text-inherit'
                      : 'bg-white/20 text-white'
                    : 'bg-stone-200 text-stone-500 dark:bg-charcoal-700 dark:text-stone-400'
                }`}
              >
                {segmentCounts[key] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* User list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-bordeaux-400" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="mx-auto mb-2 h-8 w-8 text-stone-300" />
            <p className="text-sm text-stone-500">No users found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              isExpanded={expandedId === user.id}
              onToggleExpand={() =>
                setExpandedId((prev) => (prev === user.id ? null : user.id))
              }
              onAction={handleAction}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </div>
      )}

      {/* Confirmation modal */}
      {confirmAction && !newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-page">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-bordeaux-600 dark:text-ivory-200">
                {confirmAction.type === 'delete' && 'Delete User'}
                {confirmAction.type === 'erase' && 'Erase User Data'}
                {confirmAction.type === 'reset' && 'Reset Password'}
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                {confirmAction.type === 'delete' &&
                  `Are you sure you want to permanently delete ${confirmAction.userEmail}? This cannot be undone.`}
                {confirmAction.type === 'erase' &&
                  `This will erase all data for ${confirmAction.userEmail} including cellar, wishlist, tastings, and taste profile. The account will remain active.`}
                {confirmAction.type === 'reset' &&
                  `This will generate a new password for ${confirmAction.userEmail}. The user will need the new password to log in.`}
              </p>
              <div className="mt-6 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirmAction(null)}
                  disabled={confirmLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant={confirmAction.type === 'delete' ? 'destructive' : 'default'}
                  className={`flex-1 ${
                    confirmAction.type !== 'delete'
                      ? 'bg-bordeaux-600 text-white hover:bg-bordeaux-700'
                      : ''
                  }`}
                  onClick={handleConfirm}
                  disabled={confirmLoading}
                >
                  {confirmLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New password modal */}
      {newPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm animate-page">
            <CardContent className="p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/20">
                <KeyRound className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-bordeaux-600 dark:text-ivory-200">
                Password Reset Successful
              </h3>
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                New password for {confirmAction?.userEmail}:
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
                Done
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
