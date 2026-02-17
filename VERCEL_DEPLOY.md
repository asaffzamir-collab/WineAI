# Deploy WineAI to Vercel and share with your group

Follow these steps to deploy and share your app.

**Production URL:** https://winejourney.co

## 1. Log in to Vercel

In your terminal (from the project folder):

```bash
npx vercel login
```

Use your Vercel account (or sign up at https://vercel.com).

## 2. Deploy

From the project root:

```bash
npx vercel --yes
```

For production:

```bash
npx vercel --prod
```

## 3. Custom domain

The app is served at **https://winejourney.co**. The domain is configured in:

- **Vercel** → Project Settings → Domains → `winejourney.co`
- **GoDaddy DNS** → A record `@` → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`

Vercel automatically provisions and renews the SSL certificate.

## 4. Add environment variables in Vercel

1. Open https://vercel.com/dashboard and select your project (WineAI / winejourney).
2. Go to **Settings → Environment Variables**.
3. Add these variables (use the same values as in your `.env.local`):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

4. Enable them for **Production** (and **Preview** if you want).
5. Trigger a new deployment so the new env vars are used: **Deployments** → ⋮ on latest → **Redeploy**.

## 5. Enable Anonymous sign-in in Supabase (required)

The app signs in each visitor anonymously so they get their own profile and data—no email or magic link.

1. Supabase Dashboard → **Authentication** → **Providers**.
2. Find **Anonymous Sign-In** and turn it **ON**.
3. Save.

Without this, the app will show the email sign-in form as a fallback.

## 6. Supabase redirect URL

Supabase must allow the production domain for auth redirects:

1. Supabase Dashboard → **Authentication** → **URL Configuration**.
2. Set **Site URL** to: `https://winejourney.co`
3. Under **Redirect URLs**, add:
   - `https://winejourney.co/**`
   - `https://www.winejourney.co/**`
   - `https://wine-ai-mu.vercel.app/**` (fallback)

## 7. Database migration (bottle photo)

If you haven't already, run the cellar bottle photo migration on your Supabase project:

- In Supabase → **SQL Editor**, run the contents of:
  `supabase/migrations/20260207120000_cellar_bottle_photo.sql`

## 8. Share the link

Send **https://winejourney.co** to your test group. Each visitor is signed in anonymously and gets their own profile, cellar, and taste data.
