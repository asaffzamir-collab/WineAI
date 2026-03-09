'use client';

import { useEffect, useState } from 'react';
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
  DollarSign,
  ShieldAlert,
  AlertCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
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
  const maxBar = Math.max(usage.totalSearches, usage.totalPierMessages, 1);

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>Engagement Overview</SectionHeading>

        <div className="space-y-4">
          <BarRow
            icon={Search}
            label="Wine Searches"
            value={usage.totalSearches}
            max={maxBar}
            color="bg-bordeaux-500"
          />
          <BarRow
            icon={MessageSquare}
            label="Pier Messages"
            value={usage.totalPierMessages}
            max={maxBar}
            color="bg-copper-500"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <MiniStat label="Avg searches / active user" value={usage.avgSearchesPerActive} />
          <MiniStat label="Avg messages / active user" value={usage.avgMessagesPerActive} />
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

function SegmentsSection({ segments, total }: { segments: DashboardSegments; total: number }) {
  const items = [
    { key: 'power', label: 'Power', count: segments.power, color: 'bg-emerald-500', dot: 'bg-emerald-500' },
    { key: 'regular', label: 'Regular', count: segments.regular, color: 'bg-blue-500', dot: 'bg-blue-500' },
    { key: 'light', label: 'Light', count: segments.light, color: 'bg-amber-500', dot: 'bg-amber-500' },
    { key: 'dormant', label: 'Dormant', count: segments.dormant, color: 'bg-charcoal-400', dot: 'bg-charcoal-400' },
  ] as const;

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>User Segments</SectionHeading>

        {/* Stacked bar */}
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
            <div key={s.key} className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot}`} />
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground">{s.count}</span>
                <span className="text-xs text-muted-foreground ml-1">
                  {s.label} ({total > 0 ? Math.round((s.count / total) * 100) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ApiCostsSection({ apiCosts }: { apiCosts: DashboardApiCosts }) {
  const change = pctChange(apiCosts.totalCostThisMonth, apiCosts.totalCostLastMonth);
  const isUp = change !== null && change > 0;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;

  const topFeatures = Object.entries(apiCosts.byFeature)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const topUsers = apiCosts.topCostUsers.slice(0, 3);

  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>API Cost Monitor</SectionHeading>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="heading-serif text-2xl text-foreground">
            {formatUsd(apiCosts.totalCostThisMonth)}
          </span>
          <span className="text-xs text-muted-foreground">this month</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
          {change !== null && (
            <span className={`flex items-center gap-0.5 ${isUp ? 'text-red-500' : 'text-emerald-500'}`}>
              <TrendIcon className="h-3.5 w-3.5" />
              {Math.abs(change)}% vs last month
            </span>
          )}
          <span className="text-muted-foreground">
            {formatUsd(apiCosts.costPerActiveUser)} / active user
          </span>
        </div>

        {/* Model breakdown */}
        {Object.keys(apiCosts.byModel).length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              By Model
            </p>
            <div className="space-y-1">
              {Object.entries(apiCosts.byModel)
                .sort(([, a], [, b]) => b - a)
                .map(([model, cost]) => (
                  <div key={model} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate">{model}</span>
                    <span className="font-medium text-foreground ml-2">{formatUsd(cost)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Top features */}
        {topFeatures.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Top Features
            </p>
            <div className="space-y-1">
              {topFeatures.map(([feature, cost]) => (
                <div key={feature} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{feature}</span>
                  <span className="font-medium text-foreground ml-2">{formatUsd(cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top users */}
        {topUsers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Top Users by Cost
            </p>
            <div className="space-y-1">
              {topUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate">{u.displayName}</span>
                  <span className="font-medium text-foreground ml-2">{formatUsd(u.cost)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TierExhaustionSection({ data }: { data: DashboardTierExhaustion }) {
  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>Tier Exhaustion</SectionHeading>

        <div className="space-y-2 mb-4">
          <ExhaustionRow
            icon={ShieldAlert}
            count={data.exceededCount}
            label="users exceeded free tier"
            color="text-red-500"
            bgColor="bg-red-50 dark:bg-red-900/20"
          />
          <ExhaustionRow
            icon={AlertTriangle}
            count={data.criticalCount}
            label="users at 80%+ (critical)"
            color="text-orange-500"
            bgColor="bg-orange-50 dark:bg-orange-900/20"
          />
          <ExhaustionRow
            icon={AlertCircle}
            count={data.warningCount}
            label="users at 50%+ (warning)"
            color="text-yellow-600"
            bgColor="bg-yellow-50 dark:bg-yellow-900/20"
          />
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-bordeaux-50 dark:bg-bordeaux-900/20 p-3 mb-4">
          <Info className="h-4 w-4 text-bordeaux-500 mt-0.5 shrink-0" />
          <p className="text-sm text-bordeaux-700 dark:text-bordeaux-300">
            If paywall were active, <strong>{data.exceededCount}</strong> user{data.exceededCount !== 1 && 's'} would be blocked.
          </p>
        </div>

        {data.exceededUsers.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Exceeded Users
            </p>
            <div className="space-y-2">
              {data.exceededUsers.map((u) => (
                <div key={u.userId} className="flex items-center justify-between text-sm">
                  <span className="text-foreground truncate">{u.displayName || u.userId}</span>
                  <span className="text-muted-foreground text-xs ml-2 shrink-0">
                    {u.wineSearches} searches · {u.pierMessages} msgs
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
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <div className={`flex items-center gap-3 rounded-lg p-2.5 ${bgColor}`}>
      <Icon className={`h-4 w-4 ${color} shrink-0`} />
      <span className="text-sm text-foreground">
        <strong className={color}>{count}</strong> {label}
      </span>
    </div>
  );
}

function RecentSignupsSection({ signups }: { signups: RecentSignup[] }) {
  return (
    <Card>
      <CardContent className="p-5">
        <SectionHeading>Recent Signups</SectionHeading>

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
                    Onboarded
                  </span>
                )}
                {u.isActive && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                    Active
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{formatDate(u.createdAt)}</span>
              </div>
            </div>
          ))}

          {signups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No recent signups</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) throw new Error(`Failed to load dashboard (${res.status})`);
        const json: DashboardData = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

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
        <p className="text-sm text-muted-foreground">{error || 'Failed to load dashboard'}</p>
      </div>
    );
  }

  const { stats, usage, segments, apiCosts, tierExhaustion, recentSignups } = data;
  const totalSegments = segments.power + segments.regular + segments.light + segments.dormant;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <section>
        <SectionHeading>Overview</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
          <StatCard icon={Activity} label="Active This Month" value={stats.activeThisMonth} />
          <StatCard icon={Sparkles} label="Onboarded" value={`${stats.onboardedPct}%`} />
          <StatCard icon={Crown} label="Premium Users" value={stats.premiumCount} />
          <StatCard icon={UserPlus} label="New (7d)" value={stats.newUsersLast7d} />
          <StatCard icon={TrendingUp} label="New (30d)" value={stats.newUsersLast30d} />
        </div>
      </section>

      {/* Engagement */}
      <section>
        <EngagementSection usage={usage} />
      </section>

      {/* Segments */}
      <section>
        <SegmentsSection segments={segments} total={totalSegments} />
      </section>

      {/* API Costs */}
      <section>
        <ApiCostsSection apiCosts={apiCosts} />
      </section>

      {/* Tier Exhaustion */}
      <section>
        <TierExhaustionSection data={tierExhaustion} />
      </section>

      {/* Recent Signups */}
      <section>
        <RecentSignupsSection signups={recentSignups} />
      </section>
    </div>
  );
}
