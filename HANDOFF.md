# Wieser Eats — Project Handoff Doc

> **For Claude:** Read this file at the start of every session. Do not ask Travis to re-explain the project. Clone the repo and start coding.

> **⚠️ CRITICAL: Always push to `dev` only. NEVER push to `main` unless Travis explicitly says "deploy" or "deploy to main". No exceptions.**

---

## 🚀 Session Startup (Do This Every Time)

1. Clone the repo using the token Travis provides:
   ```
   git clone https://TOKEN@github.com/traviswieser/wieser-eats.git repo
   cd repo && git checkout dev
   ```
2. **Always work on the `dev` branch.** Never edit `main` directly.
3. Source code lives in `source/` (React + TypeScript + Vite project).
4. After edits, build and bundle:
   ```
   cd source
   npm install --legacy-peer-deps   # only if node_modules is missing
   npx tsc --noEmit                 # fix ALL type errors before proceeding
   npm run build                    # Vite production build → source/dist/
   ```
5. **Inline the build into a single HTML file:**
   ```python
   python3 << 'EOF'
   import re, shutil
   dist = 'dist'
   with open(f'{dist}/index.html') as f:
       html = f.read()
   for pat, tag in [
       (r'<script type="module" crossorigin src="(/assets/[^"]+\.js)"></script>', 'js'),
       (r'<link rel="stylesheet" crossorigin href="(/assets/[^"]+\.css)">', 'css'),
   ]:
       m = re.search(pat, html)
       if m:
           with open(f'{dist}/{m.group(1).lstrip("/")}') as f:
               c = f.read()
           html = html.replace(m.group(0), f'<script type="module">{c}</script>' if tag == 'js' else f'<style>{c}</style>')
   with open('bundle.html', 'w') as f:
       f.write(html)
   shutil.copy('bundle.html', '../index.html')
   EOF
   cd ..
   ```
6. **Re-inject PWA tags after EVERY build** — Vite strips them:
   ```python
   python3 << 'EOF'
   with open('index.html') as f:
       html = f.read()
   pwa = '''    <link rel="manifest" href="/manifest.json" />
       <meta name="theme-color" content="#f97316" />
       <meta name="apple-mobile-web-app-capable" content="yes" />
       <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
       <meta name="apple-mobile-web-app-title" content="Wieser Eats" />
       <link rel="apple-touch-icon" href="/icon-192.png" />'''
   sw = "    <script>if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));</script>"
   html = html.replace('    <title>Wieser Eats</title>', pwa + '\n    <title>Wieser Eats</title>')
   html = html.replace('  </body>', sw + '\n  </body>')
   with open('index.html', 'w') as f:
       f.write(html)
   print('PWA tags injected')
   EOF
   ```
7. **Push to `dev` only:**
   ```
   git config user.email "travis@wiesereats.app"
   git config user.name "Travis Wieser"
   git add -A
   git commit -m "description"
   git remote set-url origin https://TOKEN@github.com/traviswieser/wieser-eats.git
   git push origin dev
   git remote set-url origin https://github.com/traviswieser/wieser-eats.git
   ```

### Deploy to production (only when Travis says "deploy"):
```
git checkout main
git pull origin main --rebase
git merge origin/dev
git push origin main
git checkout dev
git remote set-url origin https://github.com/traviswieser/wieser-eats.git
```
Always use `--rebase` on pull — Netlify auto-commits to main can cause push rejections otherwise.

---

## 📁 File Structure

| File / Dir | Purpose |
|------------|---------|
| `index.html` | **Production build** — single-file React app, all JS/CSS inlined. Served by Netlify. |
| `source/` | **Development source** — React + TypeScript + Vite project (edit code here). |
| `source/src/App.tsx` | Root component — auth gate, page routing (`navigate()`/`navigateBack()`), state, household bridge, theme/palette effects, toast, update popup. |
| `source/src/firebase.ts` | Firebase config + auth + Firestore exports. |
| `source/src/types/index.ts` | All TypeScript interfaces. `UserSettings` includes `theme: 'dark' \| 'light' \| 'auto'` and `colorPalette?: string`. `Recipe` has `sourceUrl?` and `instructionSource?: 'real' \| 'ai'`. |
| `source/src/hooks/useStorage.ts` | localStorage hook for shared app data. |
| `source/src/hooks/useUserSettings.ts` | Per-user settings hook — syncs to Firestore `users/{uid}.settings`. |
| `source/src/hooks/useHousehold.ts` | Firestore household real-time sync. |
| `source/src/components/PlanDialog.tsx` | Add-to-meal-plan dialog with date picker + recurrence. Has `onPointerDownOutside` / `onInteractOutside` guards so Radix Select dropdowns don't close the dialog. |
| `source/src/components/RecipeEditDialog.tsx` | Full-field recipe editor dialog. |
| `source/src/components/ui/dialog.tsx` | **Patched** shadcn DialogContent — uses `w-[calc(100vw-2rem)]` (not `w-full`) and adds `overflow-hidden` so dialogs never overflow on mobile. |
| `source/src/components/pages/ChefAI.tsx` | Edamam recipe search, lazy instruction loading, photo import, history, Pexels images. |
| `source/src/components/pages/CookPage.tsx` | Full-screen cook mode — step tracker, ingredient checklist, progress bar, **Wake Lock** (fixed: two stable `useEffect(fn, [])` hooks — one for visibility re-acquire, one for unmount release only). Wake Lock button shows "WAKE LOCK" text + status dot. |
| `source/src/components/pages/Pantry.tsx` | Pantry tracker with AI photo scanning. |
| `source/src/components/pages/MealPlan.tsx` | Planner with 4 views, favorites search dropdown, **long-press drag-and-drop reschedule**, ingredient aggregation, calendar sync. |
| `source/src/components/pages/ShoppingList.tsx` | Grouped shopping list with check-off. |
| `source/src/components/pages/Favorites.tsx` | Saved recipes, custom recipe add, edit, plan dialogs. |
| `source/src/components/pages/Settings.tsx` | AI keys, Edamam keys, Pexels key, household, diet/allergy, **Appearance** (theme mode + 8 color palettes), account. |
| `source/src/components/pages/AuthScreen.tsx` | Login/signup — Google + Email/Password. |
| `source/src/components/pages/AppUpdates.tsx` | Version changelog. Exports `LATEST_VERSION` and `UPDATES` (imported by App.tsx for update popup). |
| `netlify/functions/fetch-recipe.js` | Serverless function — fetches recipe source page server-side, extracts JSON-LD instructions. Returns `{ found, instructions, debug }`. |
| `manifest.json` | PWA manifest. |
| `sw.js` | Service worker for offline caching. |
| `netlify.toml` | Netlify config — no build step, functions dir, SPA redirect, secrets scan disabled. |
| `HANDOFF.md` | This file. |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui (patched dialog)
- **Build:** Vite → inlined single `index.html` via Python script (NOT Parcel/bundle-artifact.sh anymore)
- **Auth:** Firebase Authentication (Google + Email/Password)
- **Storage:** localStorage (primary, per-user keyed) + Firestore (household + settings sync)
- **Recipe Search:** Edamam Meal Planner API (free — user provides App ID + Key in Settings)
- **Recipe Instructions:** Netlify Function (`fetch-recipe.js`) fetches JSON-LD from source pages; AI fallback
- **AI Providers:** Groq (free, `llama-3.3-70b-versatile`), Claude, OpenAI, Gemini — user provides own keys
- **AI Images:** Pexels API (free, user provides own key)
- **Calendar Sync:** .ics download, Google Calendar, Outlook web links
- **Hosting:** Netlify (pre-built `index.html`, auto-deploys from `main`)

---

## 🔑 Firebase Project

- **Project:** `wieser-eats`
- **Auth providers:** Google, Email/Password
- **Firestore:** Enabled (production mode)
- **Console:** https://console.firebase.google.com/project/wieser-eats
- Firebase config embedded in `source/src/firebase.ts` (client-side keys — safe, secured by Firestore rules)

---

## 📱 App Features (v2.1.0)

1. **Chef AI / Recipe Search** — Edamam-powered (2.3M+ real recipes) with filters. Tap to expand → Netlify function fetches real instructions from source page → AI fallback. Badges: `✓ Real` / `✨ AI`. Photo import. History (last 10 batches).

2. **Let's Cook! Mode** — Full-screen cook page from any recipe. Step tracker, ingredient checklist, progress bar, **Wake Lock** button (keeps screen on). Bottom nav hidden on cook page.

3. **Pantry** — Manual add or AI photo scan. Shared across household.

4. **Meal Planner** — Four views (Week, Next 7, Next 3, Month). Tap empty slot → **favorites search dropdown** (searchable list of saved recipes + manual name entry). **Long-press any meal card** to drag-and-drop reschedule to a new day/time slot. Detail dialog has Let's Cook! button. Generate Shopping List. Calendar sync.

5. **Shopping List** — Grouped, check-off, quantity aggregation.

6. **Favorites** — Save from Chef AI or add manually. Filter: All / Mine / Household.

7. **Settings:**
   - AI API keys (Groq/Claude/OpenAI/Gemini)
   - Edamam App ID + Key (Meal Planner API)
   - Pexels key + AI Meal Images toggle
   - Household management
   - Diet type + Allergies
   - **Appearance:** Theme mode (🔆 Auto / ☀️ Light / 🌙 Dark — Auto is default) + 8 color palettes (Spice, Sage, Ocean, Lavender, Sunrise, Berry, Terracotta, Slate)
   - Kid-friendly, default servings
   - Account + sign out

8. Toast confirmations, update popup (first launch after new version), Android back button support.

---

## 🎨 Theme System

Managed in `App.tsx` via two `useEffect` hooks:

**Theme mode** (`settings.theme: 'auto' | 'light' | 'dark'`):
- `'auto'` — matches device `prefers-color-scheme` via `MediaQueryList` listener
- `'light'` / `'dark'` — forced
- Default: `'auto'`

**Color palette** (`settings.colorPalette?: string`):
- Applies `--primary` CSS variable to `document.documentElement.style`
- 8 palettes defined both in `App.tsx` (effect) and `Settings.tsx` (UI)
- Default: `'spice'` (warm orange `25 95% 53%`)

The header **no longer has a theme toggle button** — theme lives only in Settings → Appearance.

---

## 🔧 Drag-and-Drop (MealPlan.tsx)

Long-press to drag meal cards between slots. Key implementation details:
- `onPointerDown` calls `setPointerCapture` to prevent scroll stealing during hold
- When long-press timer fires (480ms), **releases pointer capture** so `elementFromPoint` can see drop-target cells beneath the ghost
- Ghost div has `pointer-events: none` (required for `elementFromPoint` to work)
- `touch-action: none` inline style on draggable entries prevents iOS/Android scroll interception
- `pointermove` listener registered with `{ passive: false }` so `preventDefault()` can block scroll during drag
- Drop targets use `data-date` and `data-meal` attributes for detection

---

## 🥗 Edamam Integration

- **API:** `https://api.edamam.com/api/recipes/v2`
- **Required header:** `Edamam-Account-User: {appId}` (required for Meal Planner Developer plan)
- **Free tier:** 10,000 calls/month
- **Setup instructions in app (Settings):**
  1. Go to developer.edamam.com/meal-planner-api
  2. Click **Get Started** under the free Developer plan
  3. Sign up — enter "Personal" for org, select **Meal Planner API: Developer**
  4. Log in → Accounts → Go to Dashboard
  5. Applications tab → View → copy App ID and App Key

---

## 🌐 Netlify Functions

- **Location:** `netlify/functions/fetch-recipe.js`
- **Endpoint:** `/.netlify/functions/fetch-recipe?url=<encoded-url>`
- **Purpose:** Server-side fetch of recipe pages (realistic browser headers to avoid bot detection). Extracts `@type: Recipe` from JSON-LD.
- **Returns:** `{ found, instructions, ingredients, cookTime, debug }`
- **⚠️ Only works when deployed to Netlify** — returns 404 in local dev (expected).
- `netlify.toml` passes `/.netlify/*` through before the SPA catch-all.

---

## 🗺️ Page Routing

Always use `navigate(PageName)` / `navigateBack()` (NOT `setPage()`):
- Maintains `pageHistoryRef` for Android back button
- Pushes `window.history.pushState` per navigation

**Pages:** `chef` | `pantry` | `mealplan` | `shopping` | `favorites` | `settings` | `updates` | `cook`

Cook page: entered via `onCook(recipe)` prop on ChefAI, MealPlan, Favorites. Bottom nav hidden when `page === 'cook'`.

---

## ⚠️ Date Handling — Critical

**Always use local time for `YYYY-MM-DD` strings. Never `toISOString()`.**

`toISOString()` converts to UTC first — shifts dates back one day for US timezones (UTC-5 to UTC-8).

✅ Correct (already used in `PlanDialog.tsx` and `MealPlan.tsx`):
```ts
const d = new Date();
const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

❌ Wrong:
```ts
new Date().toISOString().split('T')[0]
```

---

## 🏠 Household Sharing

- **Shared:** pantry, meal plan, shopping list, favorites
- **Not shared:** settings (per-user), recipe history (per-device)
- Color-coded member dots in meal planner

### Firestore Structure:
```
/users/{userId}
  - householdId: string | null
  - settings: UserSettings

/households/{householdId}
  - name, code, members, createdBy

/households/{householdId}/data/pantry     → { items: PantryItem[] }
/households/{householdId}/data/mealplan   → { items: MealPlanEntry[] }
/households/{householdId}/data/shopping   → { items: ShoppingItem[] }
/households/{householdId}/data/favorites  → { items: Recipe[] }
```

---

## 🔒 Security Notes

- Settings use **per-user localStorage keys**: `mealmate-settings-{uid}`. Never use a shared/unkeyed key.
- `useUserSettings` resets to `defaultValue` on `user.uid` change — no data bleed between accounts.
- Settings sync to `users/{uid}` top-level field with `merge: true`. **Do NOT use a subcollection** — not covered by security rules.
- `netlify.toml` sets `SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"` so Firebase keys don't trip Netlify's scanner.

### Firestore Security Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /households/{hhId} {
      allow read, write: if request.auth != null;
    }
    match /households/{hhId}/data/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ⚠️ Other Important Notes

- **Groq endpoint:** `api.groq.com/openai/v1/chat/completions` (NOT `api.x.ai`). Free at `console.groq.com/keys`.
- **Pexels images:** shown only when `settings.aiImageGen` is true and `settings.pexelsKey` is set.
- **All AI requests** go directly from the browser to the provider. No backend except the Netlify function.
- **`addToMealPlan` in App.tsx** accepts `MealPlanEntry | MealPlanEntry[]`.
- **Shopping list aggregation** uses `aggregateIngredients()` in `MealPlan.tsx` — parses/sums quantities including fractions and mixed numbers.
- **Recipe history** appends only on genuine search (`onRecipesGenerated`). Viewing from history uses `onLoadFromHistory` (no new entry). Capped at 10 batches.
- **Update popup** shown once per version via `localStorage.getItem('wieser-eats-seen-version')` vs `LATEST_VERSION`.
- **`tsconfig.app.json`** has `noUnusedLocals: true` and `noUnusedParameters: true` — the Vite build (`npm run build`) uses `tsc -b` and will fail on unused imports. Always fix these before building. Prefix intentionally-unused params with `_` (e.g. `_getMemberName`).
- **`resizable.tsx`** uses runtime property access (`(ResizablePrimitive as any).PanelGroup`) to work around a type mismatch with the installed version of `react-resizable-panels`.

---

## 🚀 Netlify Deployment

- **Site:** `traviswieser/wieser-eats` GitHub repo, auto-deploys on push to `main`
- **Build:** none (pre-built `index.html` committed to repo)
- **Functions:** `netlify/functions/` — bundled by esbuild on deploy
- **Redirects:** `/.netlify/*` passes through first; `/*` → `index.html 200` for SPA routing

---

## 🔄 Current Version: v2.1.0

When adding new features, always update:
1. `UPDATES` array in `AppUpdates.tsx` — new entry at the top
2. `LATEST_VERSION` constant in `AppUpdates.tsx`
3. Version number in Settings About section
4. This `HANDOFF.md` file
