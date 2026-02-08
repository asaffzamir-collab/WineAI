# Fix "Add to Profile" – Step-by-Step Guide

This guide fixes the issue where adding a wine to your profile doesn’t create a profile. It takes about 2 minutes.

---

## What you’ll do

You’ll run 2 short SQL commands in Supabase (your database). That’s it.

---

## Step 1: Open Supabase

1. Open your browser.
2. Go to: **https://supabase.com**
3. **Log in** (if you aren’t already).
4. Open your **WineAI** project (click it in the list).

---

## Step 2: Open the SQL Editor

1. On the left sidebar, click **“SQL Editor”**.
2. Click **“New query”** (top right).
3. You’ll see a big empty box where you can type SQL. That’s where we’ll paste the commands.

---

## Step 3: Copy the SQL

Copy everything below (both lines):

```
ALTER TABLE taste_profiles DROP CONSTRAINT IF EXISTS taste_profiles_user_id_fkey;
ALTER TABLE wine_tastings DROP CONSTRAINT IF EXISTS wine_tastings_user_id_fkey;
```

- On Mac: select the two lines and press **Cmd + C**.
- On Windows: select the two lines and press **Ctrl + C**.

---

## Step 4: Paste and run

1. Click inside the big empty box in the SQL Editor.
2. Paste what you copied:
   - Mac: **Cmd + V**
   - Windows: **Ctrl + V**
3. Click the green **“Run”** button (or press **Cmd + Enter** on Mac / **Ctrl + Enter** on Windows).

---

## Step 5: Check the result

- You should see a message like **“Success. No rows returned”** (that’s normal and correct).
- If you see an error in red, copy the error text and you can share it to get help.

---

## Step 6: Try the app again

1. Go back to your WineAI app (e.g. **http://localhost:3000**).
2. Open **Search**, search for a wine, and click **“Add to profile”** on a result.
3. Open the **Profile** tab – you should see the new profile.

---

## Optional: Use the in-app helper

If your app is running:

1. Open: **http://localhost:3000/dev/migrate-profile**
2. Click **“Copy SQL”** – the two commands are copied.
3. Click **“Open SQL Editor”** – Supabase opens.
4. Paste in the SQL box and click **“Run”**.

Same result as doing it manually in Supabase.

---

## Summary

| Step | What to do |
|------|------------|
| 1 | Log in at supabase.com and open your WineAI project |
| 2 | Left menu → **SQL Editor** → **New query** |
| 3 | Copy the two `ALTER TABLE` lines from above |
| 4 | Paste into the box and click **Run** |
| 5 | Confirm you see “Success” (or similar) |
| 6 | In your app: Search → add a wine to profile → check Profile tab |

Done. After this, “Add to profile” will create and show profiles correctly.
