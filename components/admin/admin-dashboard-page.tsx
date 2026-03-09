'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import {
  Users,
  Activity,
  Sparkles,
  Crown,
  UserPlus,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  Search,
  MessageSquare,
  ShieldAlert,
  AlertCircle,
  Info,
  Calendar,
  Bot,
  Globe,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totalUsers: number;
  adminCount: number;
  onboardedCount: number;
  onboardedPct: number;
  premiumCount: number;
  activeThisMonth: number;
  activeLastMonth: number;
  newUsersLast7d: number;
  newUsersLast30d: number;
}

interface DashboardUsage {
  totalSearches: number;
  totalPierMessages: number;
  avgSearchesPerActive: number;
  avgMessagesPerActive: number;
}

interface DashboardSegments {
  power: number;
  regular: number;
  light: number;
  dormant: number;
}

interface TopCostUser {
  userId: string;
  displayName: string;
  cost: number;
}

interface DashboardApiCosts {
  totalCostThisMonth: number;
  totalCostLastMonth: number;
  costPerActiveUser: number;
  byService: Record<string, number>;
  countByService: Record<string, number>;
  byModel: Record<string, number>;
  byFeature: Record<string, number>;
  topCostUsers: TopCostUser[];
}

interface ExceededUser {
  userId: string;
  displayName: string;
  wineSearches: number;
  pierMessages: number;
  tier: string;
}

interface DashboardTierExhaustion {
  exceededCount: number;
  criticalCount: number;
  warningCount: number;
  exceededUsers: ExceededUser[];
}

interface RecentSignup {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  onboardingCompleted: boolean;
  isActive: boolean;
}

interface DashboardData {
  stats: DashboardStats;
  usage: DashboardUsage;
  segments: DashboardSegments;
  apiCosts: DashboardApiCosts;
  tierExhaustion: DashboardTierExhaustion;
  recentSignups: RecentSignup[];
}

type DurationMode = 'thisMonth' | 'lastMonth' | 'custom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function getMonthRange(offset: number): { from: string; to: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = offset === 0
    ? now
    : new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  onClick?: () => void;
}) {
  return (
    <Card
      className={onClick ? 'cursor-pointer transition-shadow hover:shadow-md hover:ring-1 hover:ring-bordeaux-200 dark:hover:ring-bordeaux-700' : ''}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/30">
          <Icon className="h-5 w-5 text-bordeaux-600 dark:text-bordeaux-300" strokeWidth={1.8} />
        </div>
        <div className="min-w-0">
          <p className="heading-serif text-xl text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="heading-serif text-lg text-foreground mb-3">{children}</h2>
  );
}

function EngagementSection({ usage }: { usage: DashboardUsage }) {
  const t = useTranslations('admin');
  const maxBar = Math.max(usage.totalSearches, usage.totalPierMessages, 1);

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>{t('engagementOverview')}</SectionHeading>

        <div className="space-y-4">
          <BarRow
            icon={Search}
            label={t('wineSearches')}
            value={usage.totalSearches}
            max={maxBar}
            color="bg-bordeaux-500"
          />
          <BarRow
            icon={MessageSquare}
            label={t('pierMessages')}
            value={usage.totalPierMessages}
            max={maxBar}
            color="bg-copper-500"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label={t('avgSearchesPerActive')} value={usage.avgSearchesPerActive} />
          <MiniStat label={t('avgMessagesPerActive')} value={usage.avgMessagesPerActive} />
        </div>
      </CardContent>
    </Card>
  );
}

function BarRow({
  icon: Icon,
  label,
  value,
  max,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(2, (value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="font-medium text-foreground">{value.toLocaleString()}</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 p-3 text-center">
      <p className="heading-serif text-lg text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}

function SegmentsSection({
  segments,
  total,
  onSegmentClick,
}: {
  segments: DashboardSegments;
  total: number;
  onSegmentClick: (segment: string) => void;
}) {
  const t = useTranslations('admin');
  const items = [
    { key: 'power', label: t('segmentPower'), count: segments.power, color: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'regular', label: t('segmentRegular'), count: segments.regular, color: 'bg-blue-500', dot: 'bg-blue-500' },
    { key: 'light', label: t('segmentLight'), count: segments.light, color: 'bg-amber-500', dot: 'bg-amber-500' },
    { key: 'dormant', label: t('segmentDormant'), count: segments.dormant, color: 'bg-charcoal-400', dot: 'bg-charcoal-400' },
  ] as const;

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>{t('userSegments')}</SectionHeading>

        <div className="flex h-4 w-full overflow-hidden rounded-full mb-4">
          {items.map((s) => {
            const pct = total > 0 ? (s.count / total) * 100 : 0;
            return pct > 0 ? (
              <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${pct}%` }} />
            ) : null;
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {items.map((s) => (
            <button
              key={s.key}
              onClick={() => onSegmentClick(s.key)}
              className="flex items-center gap-2 rounded-lg p-1.5 -m-1.5 transition-colors hover:bg-muted/50 cursor-pointer text-start"
            >
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{s.count}</span>
                <span className="text-xs text-muted-foreground ms-1">
                  {s.label} ({total > 0 ? Math.round((s.count / total) * 100) : 0}%)
                </span>
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApiCostsSection({
  apiCosts,
  onUserClick,
}: {
  apiCosts: DashboardApiCosts;
  onUserClick: (displayName: string) => void;
}) {
  const t = useTranslations('admin');
  const change = pctChange(apiCosts.totalCostThisMonth, apiCosts.totalCostLastMonth);
  const isUp = change !== null && change > 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const topFeatures = Object.entries(apiCosts.byFeature)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topUsers = apiCosts.topCostUsers.slice(0, 3);

  const serviceEntries = Object.entries(apiCosts.byService).sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>{t('apiCostMonitor')}</SectionHeading>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="heading-serif text-2xl text-foreground">
            {formatUsd(apiCosts.totalCostThisMonth)}
          </span>
          <span className="text-xs text-muted-foreground">{t('thisMonth')}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
          {change !== null && (
            <span className={`flex items-center gap-0.5 ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {Math.abs(change)}% {t('vsLastMonth')}
            </span>
          )}
          <span className="text-muted-foreground">
            {formatUsd(apiCosts.costPerActiveUser)} {t('perActiveUser')}
          </span>
        </div>

        {/* Service breakdown */}
        {serviceEntries.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('byService')}
            </p>
            <div className="space-y-1.5">
              {serviceEntries.map(([service, cost]) => {
                const ServiceIcon = service === 'openai' ? Bot : Globe;
                const callCount = apiCosts.countByService?.[service] || 0;
                return (
                  <div key={service} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <ServiceIcon className="h-3.5 w-3.5" />
                      <span className="truncate">{service === 'openai' ? 'OpenAI' : service === 'serper' ? 'Serper.dev' : service}</span>
                      <span className="text-xs text-muted-foreground/60">
                        ({t('callsLabel', { count: callCount })})
                      </span>
                    </span>
                    <span className="font-medium text-foreground ms-2">{formatUsd(cost)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Model breakdown */}
        {Object.keys(apiCosts.byModel).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('byModel')}
            </p>
            <div className="space-y-1">
              {Object.entries(apiCosts.byModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{model}</span>
                    <span className="font-medium text-foreground ms-2">{formatUsd(cost)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Top features */}
        {topFeatures.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('topFeatures')}
            </p>
            <div className="space-y-1">
              {topFeatures.map(([feature, cost]) => (
                <div key={feature} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{feature}</span>
                  <span className="font-medium text-foreground ms-2">{formatUsd(cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top users */}
        {topUsers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('topUsersByCost')}
            </p>
            <div className="space-y-1">
              {topUsers.map((u) => (
                <button
                  key={u.userId}
                  onClick={() => onUserClick(u.displayName)}
                  className="flex w-full items-center justify-between text-sm rounded-md px-1 -mx-1 py-0.5 hover:bg-muted/50 transition-colors cursor-pointer text-start"
                >
                  <span className="text-muted-foreground truncate">{u.displayName}</span>
                  <span className="font-medium text-foreground ms-2">{formatUsd(u.cost)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierExhaustionSection({
  data,
  onRowClick,
}: {
  data: DashboardTierExhaustion;
  onRowClick: (filter: string) => void;
}) {
  const t = useTranslations('admin');
  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>{t('tierExhaustion')}</SectionHeading>

        <div className="space-y-2 mb-4">
          <ExhaustionRow
            icon={ShieldAlert}
            count={data.exceededCount}
            label={t('usersExceededTier')}
            color="text-red-500"
            bgColor="bg-red-50 dark:bg-red-900/20"
            onClick={() => onRowClick('exceeded')}
          />
          <ExhaustionRow
            icon={AlertTriangle}
            count={data.criticalCount}
            label={t('usersCritical')}
            color="text-orange-500"
            bgColor="bg-orange-50 dark:bg-orange-900/20"
            onClick={() => onRowClick('critical')}
          />
          <ExhaustionRow
            icon={AlertCircle}
            count={data.warningCount}
            label={t('usersWarning')}
            color="text-yellow-600"
            bgColor="bg-yellow-50 dark:bg-yellow-900/20"
            onClick={() => onRowClick('warning')}
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20 p-3 mb-4">
          <Info className="h-4 w-4 text-bordeaux-500 mt-0.5 shrink-0" />
          <p
            className="text-sm text-bordeaux-700 dark:text-bordeaux-300"
            dangerouslySetInnerHTML={{ __html: t('paywallNote', { count: data.exceededCount }) }}
          />
        </div>

        {data.exceededUsers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {t('exceededUsers')}
            </p>
            <div className="space-y-2">
              {data.exceededUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{u.displayName || u.userId}</span>
                  <span className="text-muted-foreground text-xs ms-2 shrink-0">
                    {t('searchesCount', { count: u.wineSearches })} · {t('msgsCount', { count: u.pierMessages })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExhaustionRow({
  icon: Icon,
  count,
  label,
  color,
  bgColor,
  onClick,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg p-2.5 ${bgColor} transition-colors hover:opacity-80 cursor-pointer text-start`}
    >
      <Icon className={`h-4 w-4 ${color} shrink-0`} />
      <span className="text-sm text-foreground">
        <strong className={color}>{count}</strong> {label}
      </span>
    </button>
  );
}

function RecentSignupsSection({
  signups,
}: {
  signups: RecentSignup[];
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>{t('recentSignups')}</SectionHeading>

        <div className="space-y-2.5">
          {signups.map((u) => (
            <div key={u.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {u.displayName || u.email}
                </p>
                {u.displayName && (
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {u.onboardingCompleted && (
                  <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                    {t('badgeOnboarded')}
                  </span>
                )}
                {u.isActive && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                    {t('badgeActive')}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{formatDate(u.createdAt)}</span>
              </div>
            </div>
          ))}

          {signups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">{t('noRecentSignups')}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DurationSelector({
  mode,
  customFrom,
  customTo,
  onModeChange,
  onCustomFromChange,
  onCustomToChange,
  onApply,
}: {
  mode: DurationMode;
  customFrom: string;
  customTo: string;
  onModeChange: (m: DurationMode) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onApply: () => void;
}) {
  const t = useTranslations('admin');
  const pills: { key: DurationMode; label: string }[] = [
    { key: 'thisMonth', label: t('durationThisMonth') },
    { key: 'lastMonth', label: t('durationLastMonth') },
    { key: 'custom', label: t('durationCustom') },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1 rounded-lg bg-muted/50 p-0.5">
        {pills.map((p) => (
          <button
            key={p.key}
            onClick={() => onModeChange(p.key)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === p.key
                ? 'bg-bordeaux-600 text-white dark:bg-bordeaux-500'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {mode === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">{t('durationFrom')}</label>
          <Input
            type="date"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <label className="text-xs text-muted-foreground">{t('durationTo')}</label>
          <Input
            type="date"
            value={customTo}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="h-8 w-36 text-xs"
          />
          <Button size="sm" className="h-8 text-xs bg-bordeaux-600 text-white hover:bg-bordeaux-700" onClick={onApply}>
            {t('durationApply')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const t = useTranslations('admin');
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [durationMode, setDurationMode] = useState<DurationMode>('thisMonth');
  const [customFrom, setCustomFrom] = useState(() => getMonthRange(0).from);
  const [customTo, setCustomTo] = useState(() => getMonthRange(0).to);

  const getDateRange = useCallback((): { from: string; to: string } => {
    switch (durationMode) {
      case 'thisMonth': return getMonthRange(0);
      case 'lastMonth': return getMonthRange(-1);
      case 'custom': return { from: customFrom, to: customTo };
    }
  }, [durationMode, customFrom, customTo]);

  const load = useCallback(async (range?: { from: string; to: string }) => {
    setLoading(true);
    setError(null);
    try {
      const r = range || getDateRange();
      const params = new URLSearchParams({ from: r.from, to: r.to });
      const res = await fetch(`/api/admin/dashboard?${params}`);
      if (!res.ok) throw new Error(`${t('failedLoadDashboard')} (${res.status})`);
      const json: DashboardData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknownError'));
    } finally {
      setLoading(false);
    }
  }, [getDateRange, t]);

  useEffect(() => {
    load();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleDurationChange = useCallback((mode: DurationMode) => {
    setDurationMode(mode);
    if (mode !== 'custom') {
      const range = mode === 'thisMonth' ? getMonthRange(0) : getMonthRange(-1);
      load(range);
    }
  }, [load]);

  const handleCustomApply = useCallback(() => {
    load({ from: customFrom, to: customTo });
  }, [load, customFrom, customTo]);

  const navigateToUsers = useCallback((params?: Record<string, string>) => {
    const sp = new URLSearchParams(params);
    router.push(`/admin/users${params ? `?${sp}` : ''}`);
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-bordeaux-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-muted-foreground">{error || t('failedLoadDashboard')}</p>
      </div>
    );
  }

  const { stats, usage, segments, apiCosts, tierExhaustion, recentSignups } = data;
  const totalSegments = segments.power + segments.regular + segments.light + segments.dormant;

  return (
    <div className="space-y-6">
      {/* Duration selector */}
      <DurationSelector
        mode={durationMode}
        customFrom={customFrom}
        customTo={customTo}
        onModeChange={handleDurationChange}
        onCustomFromChange={setCustomFrom}
        onCustomToChange={setCustomTo}
        onApply={handleCustomApply}
      />

      {/* Stats Grid */}
      <section>
        <SectionHeading>{t('overview')}</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Users} label={t('totalUsersLabel')} value={stats.totalUsers} onClick={() => navigateToUsers()} />
          <StatCard icon={Activity} label={t('activeThisMonth')} value={stats.activeThisMonth} onClick={() => navigateToUsers({ filter: 'active' })} />
          <StatCard icon={Sparkles} label={t('onboardedPct')} value={`${stats.onboardedPct}%`} onClick={() => navigateToUsers({ filter: 'onboarded' })} />
          <StatCard icon={Crown} label={t('premiumUsers')} value={stats.premiumCount} onClick={() => navigateToUsers({ filter: 'premium' })} />
          <StatCard icon={UserPlus} label={t('new7d')} value={stats.newUsersLast7d} onClick={() => navigateToUsers({ filter: 'new7d' })} />
          <StatCard icon={TrendingUp} label={t('new30d')} value={stats.newUsersLast30d} onClick={() => navigateToUsers({ filter: 'new30d' })} />
        </div>
      </section>

      {/* Engagement */}
      <section>
        <EngagementSection usage={usage} />
      </section>

      {/* Segments */}
      <section>
        <SegmentsSection
          segments={segments}
          total={totalSegments}
          onSegmentClick={(segment) => navigateToUsers({ segment })}
        />
      </section>

      {/* API Costs */}
      <section>
        <ApiCostsSection
          apiCosts={apiCosts}
          onUserClick={(name) => navigateToUsers({ search: name })}
        />
      </section>

      {/* Tier Exhaustion */}
      <section>
        <TierExhaustionSection
          data={tierExhaustion}
          onRowClick={(filter) => navigateToUsers({ filter })}
        />
      </section>

      {/* Recent Signups */}
      <section>
        <RecentSignupsSection signups={recentSignups} />
      </section>
    </div>
  );
}
