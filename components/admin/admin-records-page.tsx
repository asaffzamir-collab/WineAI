'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Crown,
  Loader2,
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  X,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  ImageIcon,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChangelogEntry, ChangelogHighlight } from '@/lib/changelog';

interface ChangelogFormData {
  version: string;
  date: string;
  title: string;
  title_he: string;
  highlights: ChangelogHighlight[];
}

const EMPTY_FORM: ChangelogFormData = {
  version: '',
  date: new Date().toISOString().split('T')[0],
  title: '',
  title_he: '',
  highlights: [],
};

function Toast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-page">
      <div className="rounded-xl bg-charcoal-800 px-4 py-2.5 text-sm text-white shadow-lg">
        {message}
      </div>
    </div>
  );
}

export function AdminRecordsPage() {
  const t = useTranslations('admin');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  return (
    <div className="space-y-6">
      <PremiumToggle onToast={setToastMessage} />
      <ChangelogManager onToast={setToastMessage} />
      <GuideRegeneration onToast={setToastMessage} />
      <ImageMigration onToast={setToastMessage} />
      {toastMessage && <Toast message={toastMessage} />}
    </div>
  );
}

function PremiumToggle({ onToast }: { onToast: (msg: string) => void }) {
  const t = useTranslations('admin');
  const [premiumEnabled, setPremiumEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) setPremiumEnabled(data.settings.premium_enabled);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
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
        onToast(t('actionFailed'));
      } else {
        onToast(newValue ? t('premiumActivated') : t('premiumDeactivated'));
      }
    } catch {
      setPremiumEnabled(!newValue);
      onToast(t('actionFailed'));
    }
  };

  return (
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
            onClick={handleToggle}
            disabled={loading}
            className="transition-colors"
            aria-label="Toggle premium paywall"
          >
            {loading ? (
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
  );
}

function ChangelogManager({ onToast }: { onToast: (msg: string) => void }) {
  const t = useTranslations('admin');
  const [entries, setEntries] = useState<(ChangelogEntry & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ChangelogFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [newHighlightText, setNewHighlightText] = useState('');
  const [newHighlightTextHe, setNewHighlightTextHe] = useState('');
  const [newHighlightTag, setNewHighlightTag] = useState<ChangelogHighlight['tag']>('new');

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/changelog');
      if (!res.ok) return;
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleEdit = (entry: ChangelogEntry & { id: string }) => {
    setEditingId(entry.id);
    setForm({
      version: entry.version,
      date: entry.date,
      title: entry.title,
      title_he: entry.titleHe,
      highlights: entry.highlights || [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/changelog?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        onToast(t('actionFailed'));
        return;
      }
      setEntries((prev) => prev.filter((e) => e.id !== id));
      onToast(t('changelogDeleted'));
    } catch {
      onToast(t('actionFailed'));
    }
  };

  const addHighlight = () => {
    if (!newHighlightText.trim()) return;
    setForm((prev) => ({
      ...prev,
      highlights: [
        ...prev.highlights,
        { text: newHighlightText.trim(), textHe: newHighlightTextHe.trim(), tag: newHighlightTag },
      ],
    }));
    setNewHighlightText('');
    setNewHighlightTextHe('');
    setNewHighlightTag('new');
  };

  const removeHighlight = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      highlights: prev.highlights.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    if (!form.version.trim() || !form.title.trim()) {
      onToast(t('changelogMissingFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        version: form.version.trim(),
        date: form.date,
        title: form.title.trim(),
        title_he: form.title_he.trim(),
        highlights: form.highlights,
      };
      const res = await fetch('/api/admin/changelog', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        onToast(data.error || t('actionFailed'));
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchEntries();
      onToast(editingId ? t('changelogUpdated') : t('changelogCreated'));
    } catch {
      onToast(t('actionFailed'));
    } finally {
      setSaving(false);
    }
  };

  const tagStyles: Record<string, string> = {
    new: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    improved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    fix: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bordeaux-50 dark:bg-bordeaux-900/20">
            <Megaphone className="h-5 w-5 text-bordeaux-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{t('changelogTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('changelogDesc')}</p>
          </div>
        </div>
        <Button size="sm" onClick={handleNew} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          {t('changelogAdd')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t('changelogVersion')}
                </label>
                <Input
                  value={form.version}
                  onChange={(e) => setForm((p) => ({ ...p, version: e.target.value }))}
                  placeholder="1.5.0"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t('changelogDate')}
                </label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('changelogTitleEn')}
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t('changelogTitleHe')}
              </label>
              <Input
                value={form.title_he}
                onChange={(e) => setForm((p) => ({ ...p, title_he: e.target.value }))}
                dir="rtl"
              />
            </div>

            {form.highlights.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  {t('changelogHighlights')}
                </label>
                {form.highlights.map((h, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs"
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tagStyles[h.tag]}`}
                    >
                      {h.tag}
                    </span>
                    <span className="flex-1 truncate">{h.text}</span>
                    <button
                      type="button"
                      onClick={() => removeHighlight(i)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/50 p-3">
              <label className="block text-xs font-medium text-muted-foreground">
                {t('changelogAddHighlight')}
              </label>
              <Input
                value={newHighlightText}
                onChange={(e) => setNewHighlightText(e.target.value)}
                placeholder="English text..."
                className="text-xs"
              />
              <Input
                value={newHighlightTextHe}
                onChange={(e) => setNewHighlightTextHe(e.target.value)}
                placeholder="Hebrew text..."
                className="text-xs"
                dir="rtl"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newHighlightTag}
                  onChange={(e) =>
                    setNewHighlightTag(e.target.value as ChangelogHighlight['tag'])
                  }
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="new">New</option>
                  <option value="improved">Improved</option>
                  <option value="fix">Fix</option>
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addHighlight}
                  disabled={!newHighlightText.trim()}
                  className="text-xs h-7"
                >
                  <Plus className="h-3 w-3 me-1" /> {t('changelogAddItem')}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                {t('cancel')}
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingId ? (
                  t('changelogSave')
                ) : (
                  t('changelogCreate')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">{t('changelogEmpty')}</p>
          </CardContent>
        </Card>
      ) : (
        entries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      v{entry.version}
                    </span>
                    <span className="text-xs text-muted-foreground">{entry.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{entry.title}</p>
                  {entry.titleHe && (
                    <p className="text-xs text-muted-foreground" dir="rtl">
                      {entry.titleHe}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(entry.highlights || []).map((h, i) => (
                      <span
                        key={i}
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${tagStyles[h.tag]}`}
                      >
                        {h.tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(entry)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

function GuideRegeneration({ onToast }: { onToast: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/regenerate-guide', { method: 'POST' });
      if (!res.ok) {
        onToast('Guide regeneration failed');
        return;
      }
      const data = await res.json();
      onToast(`Guide regenerated: ${data.faqCount} FAQ, ${data.featuresCount} features`);
    } catch {
      onToast('Guide regeneration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <BookOpen className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Guide Content</p>
              <p className="text-xs text-muted-foreground">
                Regenerate FAQ and features from changelog using AI
              </p>
            </div>
          </div>
          <Button size="sm" onClick={handleRegenerate} disabled={loading} variant="outline">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Regenerate'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ImageMigration({ onToast }: { onToast: (msg: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    withSource: number;
    withoutSource: number;
    bySource: Record<string, number>;
  } | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/migrate-images?action=stats', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/migrate-images?action=backfill-source', {
        method: 'POST',
      });
      if (!res.ok) {
        onToast('Backfill failed');
        return;
      }
      const data = await res.json();
      onToast(`Backfilled ${data.updated}/${data.total} wine image sources`);
      fetchStats();
    } catch {
      onToast('Backfill failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/20">
              <ImageIcon className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Image Migration</p>
              <p className="text-xs text-muted-foreground">
                Backfill image_source for wines with images
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={fetchStats} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Stats'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleBackfill} disabled={loading}>
              Backfill
            </Button>
          </div>
        </div>

        {stats && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3 text-xs space-y-1">
            <p>
              Total with images: <strong>{stats.total}</strong>
            </p>
            <p>
              With source: <strong>{stats.withSource}</strong> | Without:{' '}
              <strong>{stats.withoutSource}</strong>
            </p>
            {Object.entries(stats.bySource).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(stats.bySource)
                  .sort(([, a], [, b]) => b - a)
                  .map(([source, count]) => (
                    <span
                      key={source}
                      className="rounded-full bg-background px-2 py-0.5 text-[10px]"
                    >
                      {source}: {count}
                    </span>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
