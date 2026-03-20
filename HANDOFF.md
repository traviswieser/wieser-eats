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
3. The source code lives in the `source/` directory (React + TypeScript + Vite project).
4. After edits, rebuild the bundle and copy to root:
   ```
   cd source
   pnpm install  # only if node_modules is missing
   npx tsc --noEmit  # type check — fix all errors before proceeding
   bash /mnt/skills/examples/web-artifacts-builder/scripts/bundle-artifact.sh
   cp bundle.html ../index.html
   cd ..
   ```
5. **Push to `dev` only.** Travis will say "deploy" when ready for `main`.
6. Always clean the GitHub token from the remote URL after pushing:
   ```
   git remote set-url origin https://github.com/traviswieser/wieser-eats.git
   ```

### Deploy to production:
```
git checkout main && git pull origin main --rebase && git merge dev && git push origin main && git checkout dev
```
Always use `--rebase` — Netlify auto-commits to main can cause push rejections otherwise.

---

## 📁 File Structure

| File / Dir | Purpose |
|------------|---------|
| `index.html` | **Production build** — single-file React app with all JS/CSS inlined. Served by Netlify. |
| `source/` | **Development source** — full React + TypeScript + Vite project (edit code here). |
| `source/src/App.tsx` | Root component — auth gate, page routing, state management, household bridge, toast system. |
| `source/src/firebase.ts` | Firebase config + auth + Firestore exports. |
| `source/src/types/index.ts` | All TypeScript interfaces including `PlannerView`. |
| `source/src/hooks/useStorage.ts` | localStorage hook for shared app data (pantry, meals, etc). |
| `source/src/hooks/useUserSettings.ts` | Per-user settings hook — syncs to Firestore `users/{uid}.settings`. See Security Notes. |
| `source/src/hooks/useHousehold.ts` | Firestore household real-time sync (create/join/leave, shared data). |
| `source/src/components/PlanDialog.tsx` | Shared dialog for adding a recipe to the meal plan with date picker + recurrence. |
| `source/src/components/RecipeEditDialog.tsx` | Shared full-field recipe editor dialog. |
| `source/src/components/pages/ChefAI.tsx` | AI recipe generation, history, photo upload, Pexels images, edit + plan dialogs. |
| `source/src/components/pages/Pantry.tsx` | Pantry tracker with manual add and AI photo scanning. |
| `source/src/components/pages/MealPlan.tsx` | Planner with 4 views, ingredient aggregation, recurring entries, calendar sync. |
| `source/src/components/pages/ShoppingList.tsx` | Grouped shopping list with check-off. |
| `source/src/components/pages/Favorites.tsx` | Saved recipes with custom recipe add (AI-completed), edit, plan dialogs. |
| `source/src/components/pages/Settings.tsx` | AI keys, Pexels key, household, diet/allergy, appearance, account. |
| `source/src/components/pages/AuthScreen.tsx` | Login/signup with Google + Email/Password + install instructions. |
| `source/src/components/pages/AppUpdates.tsx` | Version changelog linked from Settings. |
| `source/src/index.css` | Tailwind + custom warm dark/light theme with Bricolage Grotesque + DM Sans fonts. |
| `manifest.json` | PWA manifest for installable app. |
| `sw.js` | Service worker for offline caching. |
| `netlify.toml` | Netlify deploy config — no build step, secrets scan disabled for Firebase keys. |
| `icon-*.png` | App icons (192px, 512px, regular + maskable). |
| `HANDOFF.md` | This file. |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui (40+ components)
- **Build:** Vite + Parcel (bundles to single HTML file via `bundle-artifact.sh`)
- **Auth:** Firebase Authentication (Google Sign-in + Email/Password)
- **Storage:** localStorage (primary, per-user keyed) + Claude artifact storage (bonus in Claude chat)
- **Database:** Firebase Firestore (household sharing + user settings — real-time sync)
- **AI Providers:** Groq (free, llama-3.3-70b-versatile), Claude, OpenAI, Gemini — user provides own API keys
- **AI Images:** Pexels API (free, user provides own key) — toggle in Settings
- **Calendar Sync:** .ics download, Google Calendar, Outlook Calendar web links
- **Hosting:** Netlify (serves pre-built `index.html`, auto-deploys from `main` branch)

---

## 🔑 Firebase Project

- **Project:** `wieser-eats` (separate from Wieser Workouts)
- **Auth providers enabled:** Google, Email/Password
- **Firestore:** Enabled (production mode with custom security rules)
- **Console:** https://console.firebase.google.com/project/wieser-eats
- Firebase config is embedded in `source/src/firebase.ts` (client-side keys — safe for public repos when secured by Firebase Security Rules)
- **Authorized domains:** localhost, wieser-eats.firebaseapp.com, wieser-eats.netlify.app (+ any custom domain)

---

## 📱 App Features (v2.0.0)

1. **Chef AI** — Multi-provider AI recipe suggestions with photo upload, protein quick-select, filters. Shows macros. Optional Pexels food photos. Recipes persist across navigation. Last 12 generation batches saved in history (viewing history does NOT create duplicate entries). **Edit** any recipe inline. **Add to Plan** opens date picker with recurrence options.
2. **Pantry** — Add items manually or scan photos with AI. Categorized, searchable. Shared across household.
3. **Meal Planner** — Four views: **Week** (Sun–Sat), **Next 7** (today + 6 days), **Next 3** (today + 2 days), **Month** (4-week overview). Navigate forward/back in each view. View preference persists in settings across devices. Tap any cell to add. **Generate Shopping List** sums ingredient quantities across ALL recipes in the current view (e.g. two recipes each needing 1 lb beef → 2 lbs beef). Calendar sync (Google, Outlook, .ics). **Edit** recipe from detail dialog.
4. **Shopping List** — Grouped by source, check-off items. Ingredients aggregated when generated from meal plan.
5. **Favorites** — Save from Chef AI or **Add My Recipe** manually. AI can auto-complete missing fields and calculate macros. Edit, plan, and remove. Filter: All / Mine / Household.
6. **Settings** — AI API key management, Pexels key, household management, dark/light theme, diet type, allergies, kid-friendly, default servings. **All settings sync across devices** via Firestore (same account on different devices).
7. **Toast confirmations** — All action buttons (add to favorites, add to plan, add to shopping list, recipe saved/updated, removed from plan) show a brief pill notification.
8. **Auth** — Google Sign-in + Email/Password + forgot password. Install-as-app instructions.
9. **App Updates** — Version changelog in Settings.

---

## 🏠 Household Sharing System

- **Firestore-backed** real-time sync via `useHousehold.ts` hook
- **Shared data:** pantry, meal plan, shopping list, favorites — sync instantly across members
- **Non-shared data:** settings (per-user, private), recipe history (per-device)
- **Color-coded members** — unique color per member, shown as dots in meal planner
- **Data bridge in App.tsx** — household → Firestore; solo → localStorage

### Firestore Document Structure:
```
/users/{userId}
  - householdId: string | null
  - settings: UserSettings (all app settings, synced across this user's devices)

/households/{householdId}
  - name, code, members, createdBy

/households/{householdId}/data/pantry     → { items: PantryItem[] }
/households/{householdId}/data/mealplan   → { items: MealPlanEntry[] }
/households/{householdId}/data/shopping   → { items: ShoppingItem[] }
/households/{householdId}/data/favorites  → { items: Recipe[] }
```

---

## 🔒 Security — Critical Notes

### Settings isolation between accounts
`useUserSettings` uses **per-user localStorage keys**: `mealmate-settings-{uid}`.
- **Never** use a shared/unkeyed localStorage entry for any user-specific data.
- On sign-in, `clearOtherUsersCache()` removes any `mealmate-settings-*` keys for other users.
- On sign-out, the legacy shared key `mealmate-settings` is wiped.
- State **always resets to `defaultValue`** when `user.uid` changes — there is no window where a prior user's data is visible.
- Settings sync to Firestore at `users/{uid}` (top-level field) using `merge: true`. **Do NOT use a subcollection** (e.g. `users/{uid}/data/settings`) — that path is not covered by the security rules and writes fail silently.

### Firebase Security Rules (Currently Active):
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

- Users can only read/write their own `/users/{uid}` document ← **settings live here**
- Any authenticated user can read/write household data (required for multi-user sharing)
- Unauthenticated users cannot access anything

---

## 🎨 Theme

- **Dark mode default** with warm food-inspired palette
- Primary accent: `hsl(25, 95%, 53%)` (warm orange)
- Fonts: Bricolage Grotesque (headings), DM Sans (body)
- App title dynamic: shows user's last name ("Wieser Eats", "Smith Eats", etc.)
- "LastName" always orange (`text-primary`), "Eats" is foreground color

---

## ⚠️ Important Notes

- **Groq endpoint:** `api.groq.com/openai/v1/chat/completions` with model `llama-3.3-70b-versatile`. Free tier at `console.groq.com/keys`.
- **Pexels:** User provides their own free key from pexels.com/api. Searched per recipe name for food photos.
- **All AI requests** go directly from the user's browser to the AI provider. No backend.
- **Firebase client config** in source is NOT a secret — security comes from Firestore rules.
- **netlify.toml** sets `SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"` so Firebase keys don't trip Netlify's scanner.
- **`addToMealPlan` in App.tsx accepts `MealPlanEntry | MealPlanEntry[]`** — PlanDialog may create multiple entries for recurring meals.
- **Shopping list generation** uses `aggregateIngredients()` in `MealPlan.tsx` which parses and sums quantities including fractions and mixed numbers.
- **Recipe history** only appends on genuine AI generation (`onRecipesGenerated`). Viewing from history calls `onLoadFromHistory` which restores recipes without adding a history entry.

---

## 🚀 Netlify Deployment

- **Site:** Connected to `traviswieser/wieser-eats` GitHub repo
- **Deploy branch:** `main` (auto-deploys on every push)
- **Build command:** none (pre-built `index.html`)
- **Publish directory:** `.`
- **netlify.toml:** secrets scan disabled, SPA redirect `/* → /index.html 200`, security headers

---

## 🔄 Current Version: v2.0.0

When adding new features, update:
1. The `UPDATES` array in `AppUpdates.tsx` with a new entry at the top
2. The version number in the Settings About section
3. This HANDOFF.md file
