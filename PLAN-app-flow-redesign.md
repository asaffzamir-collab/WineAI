# App Flow Redesign — Implementation Plan

## Overview

Redesign the app onboarding and feature flow to make the value proposition clearer.
The core idea: the user profile and matching system is the biggest value — guide users toward building their profile organically through wine search and rating, rather than through quizzes.

---

## 1. Post-Signup Profile Setup

**Goal:** Collect basic user info right after signup, before any onboarding begins.

### New Screen: `/onboarding/profile`

**Fields:**
| Field | Type | DB Column | Notes |
|-------|------|-----------|-------|
| First Name | text input | `first_name` (new) | Required |
| Last Name | text input | `last_name` (new) | Required |
| Alias | text input | `display_name` (existing) | Used as in-app username |
| Country | dropdown | `country` (new) | Full country list |
| Birthday | date picker | `birthday` (new) | Pier uses for suggestions |
| Gender | select | `gender` (new) | Male, Female, Non-binary, Prefer not to say. Used for pronoun/text adjustments only. |
| Preferred Language | toggle | `preferred_language` (existing) | Hebrew/English. **Immediately switches UI** on selection. |

### New Routing Flow
```
Signup → /onboarding/profile (NEW) → /sommelier/welcome → Home
```

### DB Changes
- Add to `user_profiles`: `first_name`, `last_name`, `country`, `birthday`, `gender`, `profile_completed` (boolean)
- `profile_completed` distinguishes "filled basic info" from "completed taste onboarding"

### Files to Create/Modify
- **New:** `app/onboarding/profile/page.tsx` — route
- **New:** `components/pages/profile-setup-page.tsx` — component
- **Modify:** `supabase/schema.sql` + new migration — add columns
- **Modify:** `lib/types.ts` — update `UserProfile` interface
- **Modify:** `app/auth/callback/route.ts` — redirect to `/onboarding/profile`
- **Modify:** `components/root-gate.tsx` — check `profile_completed` before `onboarding_completed`
- **Modify:** `app/api/profile/route.ts` — handle new fields
- **Modify:** `messages/en.json` + `messages/he.json` — i18n strings

---

## 2. Remove Testing Questionnaire, Enhance Guidance Widget

**Goal:** Remove the quiz-based onboarding. Instead, guide users to search for wines they already know and like, building their profile organically.

### Changes
- **Delete** `components/onboarding-quiz.tsx` (legacy, already unused)
- **Simplify** `components/sommelier/sommelier-welcome.tsx` — welcome message, skip discovery flow
- **Simplify** `app/api/onboarding/complete/route.ts` — no discovery trigger
- **Enhance** the Journey Tracker widget on home page (`components/pages/home-page.tsx`):
  - Step 1: Search for a wine you know and love
  - Step 2: Rate/like that wine
  - Step 3: Add a wine to your cellar or wishlist
  - Step 4: Unlock personalized recommendations (after 2 liked wines)
- **Remove** discovery flow components from `components/sommelier/discovery/`:
  - `step-energy.tsx`, `step-flavor-sliders.tsx`, `step-occasions.tsx`
  - `step-recognition.tsx`, `step-profile-reveal.tsx`, `feedback-loop.tsx`
  - `discovery-flow.tsx`

### Taste Profile Generation
- Profiles are built **organically** from wines the user likes/rates
- No more quiz-generated profiles
- Existing profile update logic (from liked wines) becomes the primary mechanism

---

## 3. Progressive Pier Feature Unlock

**Goal:** Two-tier system based on whether the user has built a taste profile.

### Tiers
| State | Available Features | Condition |
|-------|-------------------|-----------|
| **Basic** (no profile) | Chat/discussion only. Pier helps find wines conversationally. | Default for new users |
| **Full** (profile exists) | All suggestion features: Tonight Mode, Buying Intelligence, Food Pairing, Wine Discovery, Taste Evolution, Cellar Intelligence | 2+ liked wines |

### Pier Behavior in Basic Tier
- Can have conversations about wine
- Can search for wines conversationally (uses `search_wine` tool)
- Encourages user to like/rate wines to unlock full features
- Shows progress: "Like 2 wines to unlock personalized recommendations"

### Files to Modify
- `app/api/sommelier/state/route.ts` — simplify to 2 tiers
- `components/sommelier/sommelier-panel.tsx` — hide quick-action buttons in basic tier
- `components/sommelier/panel/status-banner.tsx` — show unlock progress
- `lib/sommelier-ai.ts` — adjust prompts per tier

---

## 4. Remove Search UI from Pier (Keep Conversational Search)

**Goal:** Remove the dedicated search flow UI from Pier. Pier still searches for wines conversationally via its `search_wine` tool, presenting results inline in chat.

### Changes
- **Delete** `components/sommelier/search-flow.tsx`
- **Keep** `search_wine` tool in `app/api/sommelier/chat/route.ts`
- **Modify** `lib/sommelier-ai.ts` — Pier presents search results as chat messages, not by launching a search flow
- **Modify** `components/sommelier/sommelier-panel.tsx` — remove search flow view/state
- **Modify** `components/sommelier/sommelier-context.tsx` — remove search flow state

### Result
Users can still ask Pier "find me a good Barolo" and get results in chat. The separate `/search` page remains for direct text/image search.

---

## 5. Privacy & Terms of Use Integration

**Goal:** Add terms acceptance to the signup flow.

### Changes
- **Add** checkbox on registration form: "I agree to the Privacy Policy and Terms of Use" (with links)
- **Add** `terms_accepted_at` timestamp column to `user_profiles`
- **Block** registration if terms aren't accepted
- **Existing** `/privacy` and `/terms` pages remain as-is

### Files to Modify
- `components/pages/auth-page.tsx` — add checkbox with links
- `app/api/auth/register/route.ts` — validate + store timestamp
- `supabase/schema.sql` + migration — add column
- `lib/types.ts` — update interface

---

## 6. Rack Allocation — Centralize to Cellar Screen

**Goal:** All rack placement happens on the cellar screen. No more slot allocation from search results, Pier, or other contexts.

### First Wine Flow (No Rack Exists)
1. User clicks "Add to Cellar" (from search, Pier, etc.)
2. Wine saved to `cellar_items` without slot
3. App detects no racks exist for user
4. Navigates to `/cellar?place=<itemId>`
5. **Rack Setup Wizard** opens automatically:
   - Rack name
   - Dimensions (columns, rows, depth)
   - Optional zones/shelves
6. After rack creation → bottle appears in unassigned bin → user places it

### Subsequent Wine Flow (Rack Exists)
1. User clicks "Add to Cellar"
2. Wine saved to `cellar_items` without slot
3. Navigates to `/cellar?place=<itemId>`
4. Rack view opens with new bottle highlighted in unassigned bin
5. User taps empty slot to place it

### Technical Changes
- **All "Add to Cellar" buttons** (search, Pier, wine cards): save item → navigate to `/cellar?place=<itemId>`
- **Remove localStorage cache** — DB becomes sole source of truth
- **Cellar screen** handles `?place=` param: highlights new bottle, prompts placement
- **Rack builder modal** auto-triggers when no racks exist
- **Simplify** `lib/cellar/cellar-rack-context.tsx` — remove localStorage sync logic
- **Unassigned bin** becomes first-class: new bottles land here, users place at leisure

---

## Bug Fixes (All Wine Categories)

### Bug A: Stale data — page refresh needed after adding a wine

**Root cause:** Race condition in `components/pages/profile-page.tsx`. On mount, both `router.refresh()` (server re-render) and `refreshProfiles()` (client API fetch) run simultaneously. The `lastFetchRef` guard that prevents stale server data from overwriting fresh API data is set *after* the API response arrives — so a fast `router.refresh()` can deliver stale `initialProfiles` and overwrite the fresh data. Additionally, `wine-profile-updated` events dispatched from other pages (search, wishlist) are never heard if the profile page isn't mounted.

**Fix:**
- Set `lastFetchRef.current = Date.now()` *before* starting the fetch, not after
- Add `revalidatePath('/profile')` in `/api/profile/add-wine/route.ts` so Next.js invalidates the server cache when a wine is added
- Consider adding a cross-page state mechanism (e.g., URL param `?updated=1` or a global store) so the profile page knows to refetch when navigated to after a wine was added elsewhere

**Files:** `components/pages/profile-page.tsx`, `app/api/profile/add-wine/route.ts`

### Bug B: RTL alignment — category headers on wrong side in Hebrew

**Root cause:** Multiple components use Tailwind's `text-left` (physical property, always left-aligned) instead of `text-start` (logical property, respects `dir="rtl"`). Despite `globals.css` having `[dir="rtl"] { text-align: right; }`, the Tailwind `text-left` utility generates inline `text-align: left` which overrides it.

**Fix:** Replace all `text-left` with `text-start` (and `text-right` with `text-end` where applicable) across:
- `components/pages/profile-page.tsx` (line 637)
- `components/pages/cellar-page.tsx`
- `components/pages/wishlist-page.tsx`
- `components/wine-list-item.tsx`
- `components/data-list-row.tsx`
- `components/ui/dialog.tsx` (line 62: `sm:text-left` → `sm:text-start`)
- `components/ui/sheet.tsx` (same pattern)
- `components/ui/drawer.tsx` (same pattern)

---

## Implementation Order

| # | Task | Complexity | Dependencies |
|---|------|-----------|--------------|
| 0a | Bug Fix: Stale profile data | Low | None |
| 0b | Bug Fix: RTL alignment | Low | None |
| 1 | DB Migration (new columns) | Low | None |
| 2 | Privacy/Terms (#5) | Low | Migration |
| 3 | Post-Signup Profile (#1) | Medium | Migration |
| 4 | Remove Quiz, Enhance Guidance (#2) | Medium | Profile setup |
| 5 | Progressive Pier Features (#3) | Medium | Guidance changes |
| 6 | Pier Search Cleanup (#4) | Low | Pier feature changes |
| 7 | Rack Allocation Refactor (#6) | High | None (independent) |

---

## Key Decisions Made

- **2 liked wines** = profile threshold for unlocking full Pier features
- **Language selection** on profile setup switches UI immediately
- **Gender options:** Male, Female, Non-binary, Prefer not to say
- **Pier keeps conversational search** (tool-based), loses dedicated search UI
- **Rack placement always via cellar screen** — no inline allocation from other pages
- **First-time cellar use** triggers rack setup wizard automatically
- **DB is sole source of truth** for rack data (remove localStorage sync)
