#!/usr/bin/env node

/**
 * Auto-generate changelog from recent git commits.
 *
 * Reads commits since the last changelog entry date, asks OpenAI to summarize
 * them into user-friendly highlights (EN + HE), and upserts the result into
 * the changelog_entries table via the admin API.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... CHANGELOG_API_URL=https://your-app.vercel.app node scripts/generate-changelog.mjs
 *
 * Called automatically on Vercel post-build via the "postbuild" npm script.
 */

import { execSync } from 'child_process';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BASE_URL = process.env.CHANGELOG_API_URL || process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

if (!OPENAI_API_KEY) {
  console.warn('[changelog] OPENAI_API_KEY not set, skipping changelog generation.');
  process.exit(0);
}

function getRecentCommits(since) {
  try {
    const cmd = since
      ? `git log --since="${since}" --pretty=format:"%s" --no-merges`
      : `git log -30 --pretty=format:"%s" --no-merges`;
    const output = execSync(cmd, { encoding: 'utf-8', timeout: 10_000 });
    return output.split('\n').filter(Boolean);
  } catch {
    console.warn('[changelog] Failed to read git log.');
    return [];
  }
}

function getCurrentVersion() {
  try {
    const pkg = JSON.parse(
      execSync('cat package.json', { encoding: 'utf-8' })
    );
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

function bumpMinor(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor + 1}.${patch}`;
}

async function summarizeWithOpenAI(commits) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `You are a release notes writer for a wine discovery app called WineJourney.
Given a list of git commit messages, produce a JSON object with:
- "title": short English title for this release (max 8 words)
- "titleHe": same title in Hebrew
- "highlights": array of 3-6 objects, each with:
  - "text": user-friendly English description (one sentence)
  - "textHe": same in Hebrew
  - "tag": one of "new", "improved", "fix"

Only include user-facing changes. Skip internal refactors, CI changes, and dependency bumps.
Return ONLY valid JSON, no markdown.`,
        },
        {
          role: 'user',
          content: `Commits:\n${commits.map((c) => `- ${c}`).join('\n')}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error('[changelog] OpenAI API error:', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || '';
  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('[changelog] Failed to parse OpenAI response:', e, raw);
    return null;
  }
}

async function postChangelog(entry) {
  const url = `${BASE_URL}/api/admin/changelog`;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (serviceKey) {
      headers['x-service-key'] = serviceKey;
    }
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('[changelog] Failed to post changelog entry:', res.status, text);
    } else {
      console.log('[changelog] Changelog entry posted successfully.');
    }
  } catch (e) {
    console.warn('[changelog] Could not reach API:', e.message);
  }
}

async function main() {
  const lastDate = new Date();
  lastDate.setDate(lastDate.getDate() - 7);
  const sinceStr = lastDate.toISOString().split('T')[0];

  const commits = getRecentCommits(sinceStr);
  if (commits.length === 0) {
    console.log('[changelog] No new commits since', sinceStr);
    return;
  }

  console.log(`[changelog] Found ${commits.length} commits since ${sinceStr}`);

  const summary = await summarizeWithOpenAI(commits);
  if (!summary || !summary.highlights?.length) {
    console.warn('[changelog] No usable summary generated.');
    return;
  }

  const currentVersion = getCurrentVersion();
  const newVersion = bumpMinor(currentVersion);

  const entry = {
    version: newVersion,
    date: new Date().toISOString().split('T')[0],
    title: summary.title,
    title_he: summary.titleHe,
    highlights: summary.highlights,
  };

  console.log('[changelog] Generated entry:', JSON.stringify(entry, null, 2));
  await postChangelog(entry);
}

main().catch((e) => {
  console.error('[changelog] Unexpected error:', e);
  process.exit(0); // Don't fail the build
});
