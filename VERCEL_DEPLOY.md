# Deploy WineAI to Vercel and share with your group

Follow these steps to deploy and share your app.

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

The first time you may be asked to link the project; accept the defaults. You’ll get a URL like `https://winejourney-xxx.vercel.app`.

For production:

```bash
npx vercel --prod
```

## 3. Add environment variables in Vercel

1. Open https://vercel.com/dashboard and select your project (WineAI / winejourney).
2. Go to **Settings → Environment Variables**.
3. Add these variables (use the same values as in your `.env.local`):

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`

4. Enable them for **Production** (and **Preview** if you want).
5. Trigger a new deployment so the new env vars are used: **Deployments** → ⋮ on latest → **Redeploy**.

## 4. Enable Anonymous sign-in in Supabase (required)

The app signs in each visitor anonymously so they get their own profile and data—no email or magic link.

1. Supabase Dashboard → **Authentication** → **Providers**.
2. Find **Anonymous Sign-In** and turn it **ON**.
3. Save.

Without this, the app will show the email sign-in form as a fallback.

## 5. Supabase redirect URL (for magic link auth later)

When you enable real auth (email magic link), Supabase must allow your production URL:

1. Supabase Dashboard → **Authentication** → **URL Configuration**.
2. Under **Redirect URLs**, add:
   - `https://<your-vercel-app-url>/**`
   - Example: `https://winejourney-abc123.vercel.app/**`

Replace `<your-vercel-app-url>` with the URL Vercel gave you (e.g. from step 2).

## 6. Database migration (bottle photo)

If you haven’t already, run the cellar bottle photo migration on your Supabase project:

- In Supabase → **SQL Editor**, run the contents of:
  `supabase/migrations/20260207120000_cellar_bottle_photo.sql`

## 7. Share the link

Send your production URL (e.g. `https://winejourney-xxx.vercel.app`) to your test group. Each visitor is signed in anonymously and gets their own profile, cellar, and taste data. No sign-in form needed— you’ll need to re-enable real auth (see the earlier plan).
