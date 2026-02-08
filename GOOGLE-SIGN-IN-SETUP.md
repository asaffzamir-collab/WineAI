# How to Set Up Google Sign-In (Step-by-Step)

This guide walks you through getting "Sign in with Google" working in your WineAI app. You will do two main things: create a Google "app" that allows sign-in, then tell your WineAI project how to use it.

---

## What You’ll Need

- A **Google account** (Gmail).
- Your app running either:
  - **Locally** (on your computer, e.g. `http://localhost:3000`), or  
  - **Online** (e.g. on Vercel, like `https://your-app.vercel.app`).
- Access to:
  - **Google Cloud Console** (free).
  - **Supabase** (your project dashboard).

---

## Part 1: Create Google Sign-In Credentials

In Part 1 you create a “Google app” and get two secret values (Client ID and Client secret). Google will show these only once, so keep them safe — you’ll paste them into Supabase in Part 2.

**Tip:** Before Step 5 you need your **Supabase callback URL**. If you don’t have it yet, open Supabase (Part 2, Step 2b), find your Project URL (e.g. `https://xyzabc123.supabase.co`), and write down: `https://xyzabc123.supabase.co/auth/v1/callback` (same thing with `/auth/v1/callback` at the end). Use that in Step 5 below.

---

### Step 1: Open Google Cloud Console

1. Open your browser and go to: **https://console.cloud.google.com**
2. If you’re not signed in, sign in with the Google account you want to use (any Gmail account is fine).
3. You’ll land on the Google Cloud Console. You might see a dashboard, or a welcome screen. The **top bar** shows the current project name or “Select a project.” The **left sidebar** has a menu (☰ if it’s collapsed).

---

### Step 2: Create or Choose a Project

A “project” in Google Cloud is just a container for your app’s settings. You’ll create one for WineAI.

1. At the **top of the page**, click the **project name** (or the text that says **“Select a project”**). A dropdown or dialog will open listing your projects.
2. In that window, click the **“New Project”** button (often at the top right of the dialog).
3. A form appears:
   - **Project name:** Type **WineAI** (or any name you like). This is only for you; users don’t see it.
   - **Organization:** If you see this, you can leave it as “No organization” unless you use one.
   - **Location:** Leave as default if shown.
4. Click the blue **“Create”** button.
5. Wait 10–30 seconds. When it’s done, you’ll usually return to the dashboard. **Important:** Check the **top bar** — it should now show **“WineAI”** (or your project name). If it still shows another project, click the project name again and select **WineAI** from the list so it’s the active project before continuing.

---

### Step 3: Turn On the People API (or Google+ API)

Google Sign-In may use the People API. Enabling it avoids errors later.

1. In the **left sidebar**, click **“APIs & Services.”** If the menu is collapsed (only icons), click the **☰** (hamburger) to expand it, then click **“APIs & Services.”**
2. A submenu may appear. Click **“Library”** (or **“Enabled APIs & services”** — from Library you can search for APIs).  
   - Or go directly to: **https://console.cloud.google.com/apis/library**
3. You’ll see a page titled **“API Library”** with a search box at the top.
4. In the search box, type **People API** (or **Google+ API**).
5. In the results, click **“People API”** (or **“Google+ API”**). A details page for that API opens.
6. If you see a blue **“Enable”** button, click it. Wait a few seconds until it says **“Manage”** or the page updates.  
   If you see **“Manage”** only (no “Enable”), the API is already on — you’re done. You can click **“Manage”** to confirm or just go to the next step.

---

### Step 4: Create the OAuth Consent Screen (one-time setup)

When someone clicks “Sign in with Google,” they see a screen that says “WineAI wants to access your Google Account.” That screen is the “OAuth consent screen.” You set it up once.

1. In the **left sidebar**, go to **“APIs & Services”** → **“OAuth consent screen”** (click **OAuth consent screen** in the list under APIs & Services).
2. You’ll see a choice: **External** or **Internal**.
   - Choose **External** (so any Google user can sign in to your app).  
   - Click the blue **“Create”** button.
3. **Page 1 — App information:**
   - **App name:** Type **WineAI** (or your app name). This is what users see on the sign-in screen.
   - **User support email:** Open the dropdown and choose **your email address** (the one you use for this Google account).
   - **App logo:** Leave blank (optional).
   - **App domain** and **Developer contact:** If you see **Developer contact information**, enter **your email** in the box. Other fields on this page are optional — you can leave them empty.
   - Click **“Save and Continue”** at the bottom.
4. **Page 2 — Scopes:**
   - You don’t need to add any scopes for basic sign-in.  
   - Click **“Save and Continue”** at the bottom.
5. **Page 3 — Test users (if shown):**
   - For “External” apps in testing mode, Google may ask for test users. You can add your own email, or skip if the button says “Save and Continue” without requiring test users.  
   - Click **“Save and Continue.”**
6. You’ll see a **Summary** or **Dashboard**. Click **“Back to Dashboard”** if you see it, or use the left menu to go to the next step.

---

### Step 5: Create OAuth Credentials (Client ID and Client Secret)

This is where you create the actual “key” that connects your app (via Supabase) to Google. You’ll get a **Client ID** and a **Client secret** — you’ll paste both into Supabase in Part 2.

**Before you start:** You need your **Supabase callback URL**. It looks like:  
`https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`  
To get **YOUR-PROJECT-REF:** In Supabase go to **Project Settings** (gear icon) → **API** or **General** and look at **Project URL** or **API URL**. It will be something like `https://abcdefghijk.supabase.co` — the part **abcdefghijk** is your project reference. So the full callback URL is:  
`https://abcdefghijk.supabase.co/auth/v1/callback`  
(Replace `abcdefghijk` with your real project reference.)

1. In the **left sidebar**, go to **“APIs & Services”** → **“Credentials”**.
2. You’ll see a page titled **“Credentials.”** At the **top**, click the **“+ Create Credentials”** button.
3. A small menu appears. Click **“OAuth client ID”**.
4. If Google asks **“Application type”**:
   - Select **“Web application”** (not Desktop app, not Android, etc.).
5. **Name:** Type a label for this key, e.g. **WineAI Web** (for your reference only).
6. **Authorized redirect URIs** (very important):
   - Find the section **“Authorized redirect URIs.”**
   - Click **“+ Add URI”** (or **“Add URI”**).
   - A new text box appears. Paste **exactly** your Supabase callback URL, for example:  
     `https://abcdefghijk.supabase.co/auth/v1/callback`  
   - Use **your** project reference (no spaces, no slash at the end).  
   - Do **not** use your Vercel URL or `localhost` here — only the Supabase URL above.
7. **Authorized JavaScript origins** (if you see it): You can leave it empty for this setup, or add your app URL (e.g. `https://wine-ai-mu.vercel.app`) if the form requires it. The redirect URI is what matters most.
8. Click the blue **“Create”** button at the bottom.
9. A **popup** or **dialog** appears with:
   - **Your Client ID** — a long string ending in `.apps.googleusercontent.com`
   - **Your Client secret** — a shorter string (often starting with `GOCSPX-`)
   - **Copy** each value (use the copy icon next to it) and paste into a safe note or keep the dialog open.
   - **Important:** You’ll need both in Part 2 (Supabase). Google does not show the secret again after you close this window, so copy it now. If you lose it, you can create a new OAuth client and get a new secret.
10. Click **“OK”** or **“Done”** to close the dialog.

You’ve finished Part 1. Next: open Supabase (Part 2), enable the Google provider, and paste in this Client ID and Client secret.

---

## Part 2: Add the Credentials to Supabase

Supabase is where your app’s users and sign-in are managed. You’ll paste the Client ID and Client secret here.

**Important:** If you see **Site URL** set to something like `https://wine-ai-mu.vercel.app/` — that is **correct**. That’s your app’s address on the internet. Do **not** change it. The guide below tells you what to add in addition to that.

### Step 1: Open Your Supabase Project

1. Go to **https://supabase.com** and sign in.
2. Open your **WineAI** project (click it in the list).

### Step 2: Find the Auth Settings

1. In the left sidebar, click **"Authentication"** (person icon).
2. Click **"Providers"** (or "Auth" → "Providers").

### Step 2b: Get Your Supabase Callback URL (for Google)

**What this is for:** When someone clicks “Sign in with Google,” Google needs to know: “After the user signs in, where do I send them back?” The answer is: **Supabase’s address**, not your app’s. So you need one special URL from Supabase and add it in Google. Step 2b is only about **finding that URL** in Supabase. (You add it in Google in Part 1, Step 5 — if you haven’t done that yet, you’ll use the URL you find here.)

**Where to find it in Supabase:**

1. Stay in **Authentication** in the left sidebar.
2. Click **"URL Configuration"** (or look for a section that shows **Site URL** and **Redirect URLs**).  
   - If you don’t see “URL Configuration,” try **Project Settings** (gear icon in the left sidebar) → **API** or **General**. Look for **Project URL** or **API URL**.
3. You’ll see a URL that looks like one of these:
   - `https://xxxxxxxxxxxx.supabase.co`  
   - or **Project URL:** `https://xxxxxxxxxxxx.supabase.co`  
   The **xxxxxxxxxxxx** part (letters and maybe numbers) is your **project reference**. It might look like `abcdefghijk` or `qwertyuiopas`.

**Build the callback URL:**

4. Take that Supabase URL and add `/auth/v1/callback` at the end (no space).  
   - **Example:** If your Project URL is `https://xyzabc123.supabase.co`  
   - Then the callback URL is: **`https://xyzabc123.supabase.co/auth/v1/callback`**
5. Copy that full URL. You will paste it in **Google Cloud Console** (Part 1, Step 5) under **“Authorized redirect URIs.”**  
   - If you already finished Part 1 without it: go back to Google Cloud Console → APIs & Services → Credentials → your OAuth client → add this URL under “Authorized redirect URIs” → Save.

### Step 3: Enable Google and Paste Your Credentials

1. On the **Providers** page, find **"Google"** in the list.
2. Turn the Google provider **ON** (enable it).
3. Paste your **Client ID** (from Part 1, Step 5) into the **Client ID** field.
4. Paste your **Client secret** into the **Client secret** field.
5. Click **"Save"** (or "Save changes").

### Step 4: Add Your App’s Redirect URL

1. Still under **Authentication**, open **"URL Configuration"** (or **"Redirect URLs"**).
2. You’ll see **Site URL** (e.g. `https://wine-ai-mu.vercel.app/`) — leave that as is.
3. In the **"Redirect URLs"** list (sometimes called "Additional Redirect URLs"), click **Add URL** and add **this exact line** for your live app:
   - **Your Vercel app:** `https://wine-ai-mu.vercel.app/auth/callback`  
   (No trailing slash. This is where Supabase sends users after they sign in with Google.)
   - **If you also test locally:** add `http://localhost:3000/auth/callback` (or `http://localhost:3001/auth/callback` if you use port 3001).
4. Click **Save** (or **Save changes**).

Supabase is now set up to use Google sign-in.

---

## Part 3: If You Run the App Locally (on Your Computer)

**When to do Part 3:** Only if you run the app **on your own machine** (e.g. you type `npm run dev` and open `http://localhost:3000` in the browser).  
**If your app only runs on Vercel** (e.g. https://wine-ai-mu.vercel.app), skip Part 3 and do **Part 4** instead.

**What Part 3 does:** When the app runs on your computer, it needs your Google Client ID and Client secret. You store them in a **private file** called `.env.local` in your project. The app reads that file when it starts. You never put this file on the internet.

---

### Step 1: Find or Create the File `.env.local`

1. In **Cursor**, open your **WineAI** project (the folder that contains `package.json`, `app`, `components`, etc.). That folder is the **root** of the project.
2. In the **file explorer** on the left, look at the **top level** of the project (same level as `package.json`). See if a file named **`.env.local`** is there.  
   - **If you see `.env.local`:** click it to open it and go to Step 2.  
   - **If you don’t see it:** create it:  
     - Right‑click in the explorer in the root (or use **File → New File**).  
     - Name the new file **exactly**: `.env.local`  
     - Make sure it’s in the **root** (not inside `app` or `components`).  
     - Open `.env.local` in the editor.

---

### Step 2: Add the Two Google Lines to `.env.local`

1. You’ll see either an **empty file** or **existing lines** (e.g. `NEXT_PUBLIC_SUPABASE_URL=...`, `OPENAI_API_KEY=...`).  
   - **Do not delete** any existing lines. You’re only **adding** two new lines.
2. Scroll to the **bottom** of the file (or add at the top if it’s empty).
3. Add these **two lines** (copy them exactly, then replace the placeholder values with your real ones):

   ```
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=paste-your-Client-ID-here
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=paste-your-Client-secret-here
   ```

4. **Replace the placeholders:**
   - **First line:** Replace `paste-your-Client-ID-here` with the **Client ID** you got from Google in Part 1, Step 5. It usually ends with `.apps.googleusercontent.com`. There are **no spaces** and **no quotes** around the value.
   - **Second line:** Replace `paste-your-Client-secret-here` with the **Client secret** from the same Google popup. Again, no spaces, no quotes.
5. **Save** the file (e.g. **Cmd+S** on Mac, **Ctrl+S** on Windows).

**Example** (with fake values — yours will be different):

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=GOCSPX-xxxxxxxxxxxxxxxx
```

**Important:** Don’t share `.env.local` or paste its contents anywhere public. It’s already in `.gitignore`, so it won’t be committed to git.

---

### Step 3: Restart the App So It Reads the New File

The app only reads `.env.local` when it **starts**. So after changing it, you must restart.

1. **If the app is already running:**  
   - Go to the **terminal** where you ran `npm run dev` (or similar).  
   - Press **Ctrl+C** (or **Cmd+C** on Mac in the terminal) to stop it.  
   - Wait until it stops (you may see a prompt again).
2. **Start the app again:**  
   - In the same terminal, type: **`npm run dev`** and press Enter.  
   - Wait until you see something like “Ready” or “localhost:3000”.
3. **Test in the browser:**  
   - Open **http://localhost:3000** (or the port it shows, e.g. 3001).  
   - You should see **“Sign in with Google.”** Click it and sign in with your Google account.  
   - If it works, you’ll be signed in and either see the welcome screen or the home page.

---

### Part 3 Checklist

- [ ] Opened or created **`.env.local`** in the **root** of the project (same level as `package.json`).
- [ ] Added the two lines with **your real** Client ID and Client secret (no quotes, no extra spaces).
- [ ] Saved the file.
- [ ] Restarted the app (stopped with Ctrl+C, then ran `npm run dev` again).
- [ ] Opened the app in the browser and tried “Sign in with Google.”

---

## Part 4: If Your App Is Hosted Online (e.g. Vercel)

You must give the **hosting platform** the same two environment variables.

### On Vercel

1. Go to **https://vercel.com** and open your WineAI project.
2. Go to **Settings** → **Environment Variables**.
3. Add two variables:
   - **Name:** `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`  
     **Value:** your Google Client ID  
   - **Name:** `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`  
     **Value:** your Google Client secret  
4. Save. Then redeploy the project (e.g. **Deployments** → three dots on latest → **Redeploy**).

For other hosts (Netlify, etc.), look for "Environment variables" or "Env vars" in the project settings and add the same two names and values.

---

## Deploying Code Changes to Vercel (Commit, Push, and Deploy)

When you change code (e.g. we fixed `app/page.tsx` so the sign-in screen appears, or added `dynamic = 'force-dynamic'` to fix Vercel build errors), that change only runs **on your computer** until you send it to GitHub and Vercel builds it. This section is a detailed step-by-step guide.

**In short:** You **save** your files → **commit** (save a snapshot with a message) → **push** (send the snapshot to GitHub) → **wait for Vercel** to build and go live → **open your site** to test.

**Example — after the “dynamic routes” fix:** The changed files might be `app/api/profile/route.ts`, `app/api/stats/route.ts`, and `app/layout.tsx`. You’ll commit all of them with a message like **Fix dynamic routes for Vercel (profile, stats, layout)**, then push and check Vercel.

---

### Which files, and where do I save?

- **Which files?**  
  The files that were edited for the fix (you don’t create new ones). They are already inside your **WineAI** project:
  - **app/api/profile/route.ts**
  - **app/api/stats/route.ts**
  - **app/layout.tsx**

- **Where do I save?**  
  You **don’t choose a folder** to save to. Those files already live in your project. “Saving” in Cursor means: **write what’s currently in the editor to the file on disk**. So you’re just saving the **same** files in the **same** place (your WineAI folder).  
  - If the file is **open** in a tab: press **Cmd+S** (Mac) or **Ctrl+S** (Windows) to save that file.  
  - To save **every** open file at once: use **File → Save All**.

- **Do I need to open each file?**  
  Only if you want to save them one by one. Easier: use **File → Save All** — that saves all open files. If no files are open, there’s nothing to save; in that case the changes may already be saved, so you can go to Step 2 (Source Control) and see if the files appear under “Changes.”

---

### Step 1: Save All Changed Files

1. In **Cursor**, make sure your **WineAI** project folder is open (the one that contains the `app` folder and `package.json`).
2. Look at the **tabs** at the top of the editor. Any tab with a **dot** (•) or **circle** next to the file name has **unsaved** changes.
3. **Option A — Save everything at once (easiest):**  
   - In the menu bar, click **File** → **Save All**.  
   - That saves every open file. No need to open each file.
4. **Option B — Save only files that have a dot:**  
   - Click each tab that has a dot.  
   - Press **Cmd+S** (Mac) or **Ctrl+S** (Windows). The dot should disappear.
5. **Done when:** No tab has a dot next to it. Your changes are now saved in your project folder.

---

### Step 2: Open Source Control and See Your Changes

1. In the **left sidebar** of Cursor, click the **branch icon** (branching diagram / two circles).  
   - Or: **View** → **Source Control**.  
   - Or: **Ctrl+Shift+G** (Windows/Linux) or **Cmd+Shift+G** (Mac).
2. The **Source Control** panel opens. You’ll see:
   - **Changes** — list of files you changed but haven’t committed yet (e.g. `app/api/profile/route.ts`, `app/api/stats/route.ts`, `app/layout.tsx`).
   - A **Message** box (for the commit message).
   - Buttons: **✓ Commit**, and often **Sync Changes** or **Push**.
3. If you see **no files** under Changes:
   - Make sure you saved (Step 1).
   - Confirm you’re in the correct project folder (the one that contains `app`, `package.json`, etc.).
   - If still empty, see “If you don’t see Source Control or changes” at the end of this section.

---

### Step 3: Stage and Commit (Snapshot with a Message)

1. **Stage** the files (tell Git to include them in the next commit):
   - Under **Changes**, click the **+** next to each file to stage it, **or**
   - Click the **+** next to **“Changes”** (stages all changed files at once).
   - The files move to **“Staged Changes.”**
2. In the **Message** box, type your commit message. For the dynamic-routes fix, use exactly:
   ```
   Fix dynamic routes for Vercel (profile, stats, layout)
   ```
   (You can use a different message; this one is clear for later.)
3. Click the **✓ (checkmark)** button, or the button that says **Commit** or **Commit Staged**.
4. The panel may update: **Changes** and **Staged Changes** can go empty, and you might see a line like **“main”** or **“1 commit ahead”** — that means the commit worked. Next step is to send it to GitHub.

---

### Step 4: Push to GitHub (Upload Your Snapshot)

1. In the same **Source Control** panel, look for:
   - **Sync Changes** (often with a cloud/arrow icon), or  
   - **Push**, or a number like **↑ 1** (meaning 1 commit to push).
2. Click **Sync Changes** or **Push** (or **↑ 1**).
3. **If a popup asks you to sign in to GitHub:**
   - Choose **GitHub**, then **Continue** or **Sign in**.
   - A browser window may open — sign in to GitHub and approve access if asked.
   - Return to Cursor and click **Sync** / **Push** again.
4. **If it asks for a branch:** choose **main** (or **master** if that’s what you use).
5. Wait until the status stops spinning. You might see **“0 commits ahead”** or **“Up to date”** — that means the push succeeded and your code is on GitHub.

**If you don’t see Sync / Push:** Click the **…** (three dots) in the Source Control panel → **Push** (or **Sync**).

---

### Step 5: Wait for Vercel to Deploy, Then Test

**5a. Check that a new deployment started**

1. Open your browser and go to **https://vercel.com**. Sign in if needed.
2. Click your **project** (e.g. WineAI / wine-ai-mu).
3. Click **Deployments** in the top navigation.
4. The **top row** in the list is the latest deployment. After a push, a **new** row usually appears within 1–2 minutes with status:
   - **Building** — Vercel is building your app. Wait.
   - **Ready** — Build finished; your live site is updated.
   - **Error** — Click that deployment to open it and check the **Build Logs** or **Function Logs** for the error message.

**5b. If no new deployment appears (automatic deploy didn’t run)**

1. On the **Deployments** page, find the **latest** deployment (top row).
2. Click the **three dots (⋯)** on the right side of that row.
3. Click **Redeploy**.
4. In the dialog, leave the options as they are and click **Redeploy** again.
5. Wait until the status turns **Ready** (can take 1–3 minutes).

**5c. Open your live site and test**

1. When the deployment is **Ready**, copy your **live URL** (e.g. **https://wine-ai-mu.vercel.app**). It’s shown on the project page or in the deployment.
2. Open a **new browser tab** (or use an incognito/private window so you’re not using an old session) and paste the URL.
3. You should see:
   - The WineJourney logo and **“Sign in with Google”** (if you’re not signed in), or  
   - The home page (if you’re already signed in).
4. Click **Sign in with Google** and complete sign-in. If it works, you’ll see the welcome screen or the home page with your account.
5. **If you still see errors or the old behavior:** Check the deployment’s **Function Logs** or **Build Logs** on Vercel for new error messages and share them so we can fix the next issue.

---

### Quick Recap

| Step | What you do |
|------|------------------|
| 1 | **Save** all open files (no dots on tabs). |
| 2 | Open **Source Control** (branch icon); confirm your changed files are listed. |
| 3 | **Stage** changes (+), type **commit message**, click **Commit** (✓). |
| 4 | Click **Sync Changes** / **Push**; sign in to GitHub if asked; wait until push completes. |
| 5 | In **Vercel → Deployments**, wait for **Ready** (or use **Redeploy**); then open your live URL and test sign-in. |

---

### If You Don’t See Source Control or Any Changes

- **“No source control providers registered”** or empty list: Your folder might not be a Git repository yet. In the terminal (Cursor: **Terminal → New Terminal**), run:  
  `git init`  
  Then connect to GitHub (e.g. create a repo on GitHub, then run `git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git` and try again). If you’re not sure, say you need help connecting the project to GitHub.
- **Changes not listed:** Confirm the file is saved and that you’re in the correct project folder in Cursor.
- **Push rejected (“no upstream branch”)**: Use the **…** menu in Source Control → **Push** and choose **Publish Branch** or set the remote branch to **main** when asked.

---

## Checklist (Quick Recap)

- [ ] Google Cloud: project created, OAuth consent screen set, **Web application** OAuth client created.
- [ ] Google: **Authorized redirect URI** added: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback` (use your real Supabase project ref).
- [ ] Supabase: **Google** provider enabled, Client ID and Client secret pasted and saved.
- [ ] Supabase: **Redirect URLs** include your app URL (e.g. `http://localhost:3000` or your Vercel URL).
- [ ] Local: **`.env.local`** has `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`.
- [ ] Hosted: same two variables set in Vercel (or your host) and project redeployed.

---

## If Something Doesn’t Work

- **"Redirect URI mismatch"**  
  In Google, the only redirect URI you need is Supabase’s: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`. Check that it’s spelled exactly right (no typo in the project ref, no extra slash at the end).

- **"Sign in with Google" does nothing or shows an error**  
  Make sure you saved the Client ID and secret in both Supabase **and** in `.env.local` (or your host’s env vars), and that you restarted the app after changing `.env.local`.

- **Works on computer but not online**  
  Add the **production** redirect URL in Google (the Supabase callback URL and your app URL), and set the two env vars on your hosting (e.g. Vercel) and redeploy.

If you tell me where you’re stuck (e.g. “I’m at Step 5 in Part 1” or “I get redirect URI mismatch”), I can give you the exact clicks and values to use next.
