# Wieser Eats — Project Handoff Doc

> **For Claude:** Read this file at the start of every session. Do not ask Travis to re-explain the project. Clone the repo and start coding.

> **⚠️ CRITICAL: Always push to `dev` only. NEVER push to `main` unless Travis explicitly says "deploy" or "deploy to main". No exceptions.**

---

## 🚀 Session Startup (Do This Every Time)

1. Clone the repo using the token Travis provides:
   ```
   git clone https://TOKEN@github.com/traviswieser/wieser-eats.git
   cd wieser-eats && git checkout dev
   ```
2. **Always work on the `dev` branch.** Never edit `main` directly.
3. The source code lives in the `source/` directory (React + TypeScript project).
4. After edits, rebuild the bundle and copy to root:
   ```
   cd source
   pnpm install  # only if node_modules is missing
   npx tsc --noEmit  # type check — fix ALL errors before proceeding
   rm -rf .parcel-cache dist  # always clear cache before building
   bash /mnt/skills/examples/web-artifacts-builder/scripts/bundle-artifact.sh
   cp bundle.html ../index.html
   cd ..
   ```
5. **Re-inject PWA tags after EVERY build** — the bundler strips them:
   ```python
   python3 << 'EOF'
   with open('index.html', 'r') as f:
       content = f.read()
   pwa_tags = '<link rel="manifest" href="/manifest.json"><meta name="theme-color" content="#1a1410"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Wieser Eats"><link rel="apple-touch-icon" href="/icon-192.png">'
   if 'manifest.json' not in content:
       content = content.replace('<meta charset=UTF-8>', '<meta charset=UTF-8>' + pwa_tags, 1)
   sw_script = "<script>\nif ('serviceWorker' in navigator) {\n  window.addEventListener('load', () => {\n    navigator.serviceWorker.register('/sw.js').catch(() => {});\n  });\n}\n</script>"
   if 'serviceWorker' not in content:
       content = content.replace('</body>', sw_script + '\n</body>', 1)
   with open('index.html', 'w') as f:
       f.write(content)
   EOF
   ```
6. **Push to `dev` only:**
   ```
   git remote set-url origin https://TOKEN@github.com/traviswieser/wieser-eats.git
   git add -A
   git restore --staged source/.parcel-cache/ 2>/dev/null || true
   git commit -m "description"
   git push origin dev
   git remote set-url origin https://github.com/traviswieser/wieser-eats.git
   ```

### Deploy to production (only when Travis says "deploy"):
```
git checkout main && git pull origin main && git merge dev --no-ff -m "Deploy vX.Y.Z: description" && git push origin main && git checkout dev
git remote set-url origin https://github.com/traviswieser/wieser-eats.git
```

---

## 📁 File Structure

| File / Dir | Purpose |
|------------|---------|
| `index.html` | **Production build** — single-file React app with all JS/CSS inlined. Served by Netlify. |
| `source/` | **Development source** — full React + TypeScript project (edit code here). |
| `source/src/App.tsx` | Root component — auth gate, page routing (`navigate()`/`navigateBack()`), state, household bridge, toast, update popup. |
| `source/src/firebase.ts` | Firebase config + auth + Firestore exports. |
| `source/src/types/index.ts` | All TypeScript interfaces. `PageName` includes `'cook'`. `Recipe` has `sourceUrl?` and `instructionSource?: 'real' \| 'ai'`. `UserSettings` has `edamamAppId`, `edamamKey`. |
| `source/src/hooks/useStorage.ts` | localStorage hook for shared app data. |
| `source/src/hooks/useUserSettings.ts` | Per-user settings hook — syncs to Firestore `users/{uid}.settings`. |
| `source/src/hooks/useHousehold.ts` | Firestore household real-time sync. |
| `source/src/components/PlanDialog.tsx` | Add-to-meal-plan dialog with date picker + recurrence. **Uses local time (not UTC) for dates** — do not use `toISOString()` for date strings here. |
| `source/src/components/RecipeEditDialog.tsx` | Full-field recipe editor dialog. |
| `source/src/components/pages/ChefAI.tsx` | Edamam recipe search, lazy instruction loading, photo import, history, Pexels images. |
| `source/src/components/pages/CookPage.tsx` | Full-screen step-by-step cook mode with wake lock, ingredient checklist, progress bar. |
| `source/src/components/pages/Pantry.tsx` | Pantry tracker with AI photo scanning. |
| `source/src/components/pages/MealPlan.tsx` | Planner with 4 views, ingredient aggregation, recurring entries, calendar sync. **Uses local time for date strings.** |
| `source/src/components/pages/ShoppingList.tsx` | Grouped shopping list with check-off. |
| `source/src/components/pages/Favorites.tsx` | Saved recipes, custom recipe add, edit, plan dialogs. |
| `source/src/components/pages/Settings.tsx` | AI keys, Edamam keys, Pexels key, AI Meal Images, household, diet/allergy, appearance, account. |
| `source/src/components/pages/AuthScreen.tsx` | Login/signup with Google + Email/Password. |
| `source/src/components/pages/AppUpdates.tsx` | Version changelog. Exports `LATEST_VERSION` and `UPDATES` array (imported by App.tsx for update popup). |
| `netlify/functions/fetch-recipe.js` | **Serverless function** — fetches recipe source page server-side, extracts JSON-LD instructions. Returns `{ found, instructions, debug }`. Falls back gracefully. |
| `manifest.json` | PWA manifest. Includes 192, 512, 1024px icons (regular + maskable). |
| `sw.js` | Service worker for offline caching. |
| `netlify.toml` | Netlify config — no build step, functions directory, SPA redirect, /.netlify/* passthrough, secrets scan disabled. |
| `icon-*.png` | App icons: 192, 512, 1024px — regular and maskable variants. |
| `HANDOFF.md` | This file. |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Build:** Vite + Parcel (bundles to single `index.html` via `bundle-artifact.sh`)
- **Auth:** Firebase Authentication (Google + Email/Password)
- **Storage:** localStorage (primary, per-user keyed) + Firestore (household + settings sync)
- **Recipe Search:** Edamam Recipe Search API (free — user provides App ID + Key in Settings)
- **Recipe Instructions:** Netlify Function (`fetch-recipe.js`) fetches JSON-LD from source pages; falls back to AI generation
- **AI Providers:** Groq (free, `llama-3.3-70b-versatile`), Claude, OpenAI, Gemini — user provides own keys
- **AI Images:** Pexels API (free, user provides own key)
- **Calendar Sync:** .ics download, Google Calendar, Outlook Calendar web links
- **Hosting:** Netlify (pre-built `index.html`, auto-deploys from `main`, functions bundled via esbuild)

---

## 🔑 Firebase Project

- **Project:** `wieser-eats`
- **Auth providers:** Google, Email/Password
- **Firestore:** Enabled (production mode)
- **Console:** https://console.firebase.google.com/project/wieser-eats
- Firebase config is embedded in `source/src/firebase.ts` (client-side keys — safe, secured by Firestore rules)

---

## 📱 App Features (v1.7.0)

1. **Chef AI / Recipe Search** — Edamam-powered real recipe search (2.3M+ recipes) with filters (meal type, cuisine, cook time, diet, allergies). Results show real nutrition data. Tap to expand → Netlify function fetches real instructions from source page → AI generates instructions as fallback. Badge shows `✓ Real instructions` or `✨ AI instructions`. Photo import: snap a recipe card with AI to extract it. History keeps last 10 batches; tapping a history item scrolls to + expands that recipe.

2. **Let's Cook! Mode** — Full-screen cook page accessible from any recipe card (Chef AI, Favorites, Meal Planner). Features:
   - Step-by-step instruction tracker with Previous/Next buttons
   - Progress bar showing completion %
   - Ingredient checklist (tap to mark ready)
   - **Screen wake lock** (☀️ On/Off button) — keeps screen on while cooking using Web Screen Wake Lock API
   - Source link always available
   - Bottom nav hidden; back arrow returns to previous page

3. **Pantry** — Manual add or AI photo scan. Shared across household.

4. **Meal Planner** — Four views: Week, Next 7, Next 3, Month. Navigate forward/back. Tap cell to add. Detail dialog shows instructions + `✓ Real` / `✨ AI` badges + Let's Cook! button. Generate Shopping List aggregates ingredients. Calendar sync (Google, Outlook, .ics).

5. **Shopping List** — Grouped, check-off, quantity aggregation.

6. **Favorites** — Save from Chef AI or add manually. Cards show instruction source badges. Detail dialog shows full recipe + Let's Cook! button.

7. **Settings** — AI keys (Groq/Claude/OpenAI/Gemini), Edamam App ID + Key, Pexels key, AI Meal Images toggle, household management, diet/allergy, dark/light theme, default servings, kid-friendly.

8. **Toast confirmations**, **update popup** (first launch after new version), **Android back button** navigation.

---

## 🥗 Edamam Integration

- **API:** `https://api.edamam.com/api/recipes/v2`
- **Required headers:** `Edamam-Account-User: {appId}` — required for Meal Planner Developer plan
- **Free tier:** 10,000 calls/month — 1 call per search tap, not per result card
- **Returns:** up to 15 results (`from=0&to=14`), ingredient lists, nutrition data, source URL — but NO instructions
- **Instructions flow:**
  1. User expands a recipe card → `handleExpand()` fires
  2. Calls `/.netlify/functions/fetch-recipe?url={sourceUrl}` (our Netlify function)
  3. Function fetches the source page, parses `application/ld+json` for `schema.org/Recipe`
  4. If found → `instructionSource: 'real'`
  5. If not found (403, no JSON-LD, timeout) → calls AI with ingredient list → `instructionSource: 'ai'`
  6. If no AI key → shows "View original recipe" link only

---

## 🌐 Netlify Functions

- **Location:** `netlify/functions/fetch-recipe.js`
- **Endpoint in app:** `/.netlify/functions/fetch-recipe?url=<encoded-url>`
- **What it does:** Server-side fetch of recipe pages using realistic browser headers to avoid bot detection. Extracts `@type: Recipe` from JSON-LD blocks including `@graph` nested structures and `HowToSection` instruction arrays.
- **Returns:** `{ found: bool, instructions: string[], ingredients: string[], cookTime: string, debug: string }`
- **Known behavior:** AllRecipes, Food52, SimplyRecipes typically return real instructions. Food Network, NYT Cooking often return 403 or have JS-rendered content → AI fallback.
- **⚠️ Only works when deployed to Netlify** (not in local dev). Returns 404 locally — this is expected.
- **netlify.toml redirect rule:** `/.netlify/*` is explicitly passed through before the SPA catch-all `/* → index.html`.

---

## 🗺️ Page Routing

Navigation uses `navigate(PageName)` / `navigateBack()` in `App.tsx` (NOT `setPage()`):
- Maintains `pageHistoryRef` array for Android back button support
- Pushes `window.history.pushState` for each navigation
- `popstate` listener intercepts Android back button

**Pages:** `chef` | `pantry` | `mealplan` | `shopping` | `favorites` | `settings` | `updates` | `cook`

**Cook page:**
- Entered via `onCook(recipe)` prop passed to ChefAI, MealPlan, Favorites
- `App.tsx` stores `cookRecipe` state, navigates to `'cook'`
- Bottom nav is hidden when `page === 'cook'`
- CookPage receives `recipe` + `onBack` props

---

## ⚠️ Date Handling — Critical

**Always use local time for date strings (`YYYY-MM-DD`), never `toISOString()`.**

`toISOString()` converts to UTC first. For US timezones (UTC-5 to UTC-8), this shifts dates back by one day.

✅ Correct:
```ts
const d = new Date();
const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
```

❌ Wrong:
```ts
new Date().toISOString().split('T')[0]  // breaks in US timezones
```

This pattern is already used in `PlanDialog.tsx` (`todayStr()`, `addDays()`, `addMonths()`) and `MealPlan.tsx` (`ds()`). Do not change these back to `toISOString()`.

---

## 🏠 Household Sharing

- **Shared:** pantry, meal plan, shopping list, favorites
- **Not shared:** settings (per-user), recipe history (per-device)
- **Color-coded members** in meal planner

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
- `useUserSettings` resets to `defaultValue` when `user.uid` changes — no data bleed between accounts.
- Settings sync to `users/{uid}` top-level field with `merge: true`. **Do NOT use a subcollection** — not covered by security rules.
- Firebase client config in source is NOT a secret — security via Firestore rules.
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

## 🎨 Theme

- **Dark mode default** with warm food-inspired palette
- Primary accent: `hsl(25, 95%, 53%)` (warm orange)
- Fonts: Bricolage Grotesque (headings), DM Sans (body)
- App title dynamic: `{LastName} Eats` — last name in orange (`text-primary`)
- Dark/light toggle in Settings

---

## ⚠️ Other Important Notes

- **Groq endpoint:** `api.groq.com/openai/v1/chat/completions` (NOT `api.x.ai`). Free at `console.groq.com/keys`.
- **Pexels images:** fetched per recipe name, shown only when `settings.aiImageGen` is true and `settings.pexelsKey` is set.
- **All AI requests** go directly from the browser to the provider. No backend except the Netlify function.
- **`addToMealPlan` in App.tsx** accepts `MealPlanEntry | MealPlanEntry[]` — PlanDialog creates multiple entries for recurring meals.
- **Shopping list aggregation** uses `aggregateIngredients()` in `MealPlan.tsx` — parses/sums quantities including fractions and mixed numbers.
- **Recipe history** appends only on genuine search results (`onRecipesGenerated`). Viewing from history calls `onLoadFromHistory` (no new history entry). History capped at 10 batches.
- **Update popup** shown once per version using `localStorage.getItem('wieser-eats-seen-version')` vs `LATEST_VERSION`.

---

## 🚀 Netlify Deployment

- **Site:** `traviswieser/wieser-eats` GitHub repo, auto-deploys on push to `main`
- **Build:** none (pre-built `index.html` committed to repo)
- **Functions:** `netlify/functions/` — bundled by esbuild on deploy
- **Redirects:** `/.netlify/*` passes through first; `/*` → `index.html 200` for SPA routing
- **Secrets scan:** disabled for Firebase client keys

---

## 🔄 Current Version: v1.7.0

When adding new features, always update:
1. `UPDATES` array in `AppUpdates.tsx` — new entry at the top
2. `LATEST_VERSION` constant in `AppUpdates.tsx`
3. Version number in Settings About section (`v1.7.0` text)
4. This `HANDOFF.md` file
