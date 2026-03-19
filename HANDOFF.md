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
   npx tsc --noEmit  # type check
   rm -rf .parcel-cache dist  # clear cache if build fails
   bash /mnt/skills/examples/web-artifacts-builder/scripts/bundle-artifact.sh
   cp bundle.html ../index.html
   cd ..
   ```
5. After copying bundle.html to index.html, re-add PWA tags (they get stripped by rebuild). Use the python snippet in the transcript or manually ensure `<link rel="manifest">` and serviceWorker registration are present.
6. Copy updated source files: `cp -r source_project/src/* source/src/`
7. **Push to `dev` only.** Travis will say "deploy" when ready for `main`.
8. Always clean the GitHub token from the remote URL after pushing.

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
| `source/src/App.tsx` | Root component — auth gate, page routing, state management, household bridge. |
| `source/src/firebase.ts` | Firebase config + auth + Firestore exports. |
| `source/src/types/index.ts` | All TypeScript interfaces. |
| `source/src/hooks/useStorage.ts` | Persistent storage hook (localStorage primary + Claude artifact storage bonus). |
| `source/src/hooks/useHousehold.ts` | Firestore household real-time sync hook (create/join/leave, shared data). |
| `source/src/components/pages/ChefAI.tsx` | AI recipe suggestions with multi-provider support, photo upload, Pexels images. |
| `source/src/components/pages/Pantry.tsx` | Pantry tracker with manual add and AI photo scanning. |
| `source/src/components/pages/MealPlan.tsx` | Weekly calendar grid with quick-add, color-coded members, calendar sync. |
| `source/src/components/pages/ShoppingList.tsx` | Grouped shopping list with check-off. |
| `source/src/components/pages/Favorites.tsx` | Saved recipes with All/Mine/Household filter toggle. |
| `source/src/components/pages/Settings.tsx` | AI keys, household management, Pexels, diet/allergy, appearance, account. |
| `source/src/components/pages/AuthScreen.tsx` | Login/signup with Google + Email/Password + install instructions. |
| `source/src/components/pages/AppUpdates.tsx` | Version changelog linked from Settings. |
| `source/src/index.css` | Tailwind + custom warm dark/light theme with Bricolage Grotesque + DM Sans fonts. |
| `manifest.json` | PWA manifest for installable app. |
| `sw.js` | Service worker for offline caching. |
| `netlify.toml` | Netlify deploy config — no build step, secrets scan disabled for Firebase keys. |
| `icon-*.png` | App icons (192px, 512px, regular + maskable). Logo: W with steak + orange leaves. |
| `HANDOFF.md` | This file. |
| `.gitignore` | Ignores node_modules, .env, .DS_Store. |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui (40+ components)
- **Build:** Vite + Parcel (bundles to single HTML file via `bundle-artifact.sh`)
- **Auth:** Firebase Authentication (Google Sign-in + Email/Password)
- **Storage:** localStorage (primary) + Claude artifact storage (bonus when in Claude chat)
- **Database:** Firebase Firestore (household sharing — real-time sync)
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

## 📱 App Features (v1.5.0)

1. **Chef AI** — Multi-provider AI recipe suggestions with photo upload (gallery + camera), protein quick-select, and filters (cuisine, cook time, difficulty, method, spice level, servings). Shows macros per serving. Optional food photos via Pexels API. Recipes persist across navigation. Last 12 recipe batch history saved.
2. **Pantry** — Add items manually or scan photos with AI (gallery + camera). Categorized, searchable. Shared across household when in one.
3. **Meal Planner** — Weekly calendar grid (breakfast/lunch/dinner/snack). Tappable empty cells for quick-add. Navigate weeks. Weekly macro totals. Calendar sync (Google, Outlook, .ics). Color-coded entries by household member.
4. **Shopping List** — Grouped by source, check-off items, auto-generate from meal plan or missing recipe ingredients. Syncs in real-time across household members.
5. **Favorites** — Save and search recipes. Filter toggle: All / Mine / Household (when in a household).
6. **Settings** — AI API key management (Groq free, Claude, OpenAI, Gemini), Pexels image key, household management (create/join/leave with invite code), dark/light theme, diet type, allergies, kid-friendly toggle, default servings, share button, account info, sign out.
7. **Auth** — Login screen with Google Sign-in + Email/Password + forgot password. Install-as-app instructions at bottom.
8. **App Updates** — Version changelog linked from Settings About section.

---

## 🏠 Household Sharing System

- **Firestore-backed** real-time sync via `useHousehold.ts` hook
- **Create household** → generates 6-character invite code
- **Join household** → enter invite code from another member
- **Shared data:** pantry, meal plan, shopping list, favorites — all sync instantly across members
- **Color-coded members** — each member gets a unique color, shown as dots in meal planner
- **addedBy tracking** — meal plan entries and favorites tagged with who added them
- **Favorites filter** — All / Mine / Household toggle
- **Shopping list sync** — checking off items syncs across all household members
- **Leave household** — data stays with the household; last member leaving deletes it
- **Data bridge in App.tsx** — when in a household, Firestore data is used; when solo, localStorage is used. Same component props, different data source.

### Firestore Document Structure:
```
/users/{userId}
  - householdId: string

/households/{householdId}
  - name: string
  - code: string (6-char uppercase)
  - members: { [uid]: { uid, name, email, photoURL, color } }
  - createdBy: string (uid)

/households/{householdId}/data/pantry
  - items: PantryItem[]

/households/{householdId}/data/mealplan
  - items: MealPlanEntry[]

/households/{householdId}/data/shopping
  - items: ShoppingItem[]

/households/{householdId}/data/favorites
  - items: Recipe[]
```

---

## 🎨 Theme & Logo

- **Dark mode default** with warm food-inspired palette
- Primary accent: `hsl(25, 95%, 53%)` (warm orange — matches logo)
- Fonts: Bricolage Grotesque (headings), DM Sans (body)
- App title is dynamic: shows user's last name (e.g. "Wieser Eats" for Travis Wieser, "Smith Eats" for Jane Smith)
- "LastName" is always orange (`text-primary`), "Eats" is foreground color
- Title is clickable → goes to Chef AI homepage (no visual change on click)
- **Logo:** W with steak + orange leaves on dark background. Three sizes embedded as base64:
  - 36px (header)
  - 72px (favicon)
  - 128px (auth screen)

---

## ⚠️ Important Notes

- **Storage:** localStorage is primary for standalone deployment. Claude artifact storage (`window.storage`) is used as a bonus when running inside Claude chat. Both are written to on every save.
- **Household mode vs Solo mode:** When a user joins a household, all shared data (pantry, meals, shopping, favorites) switches to Firestore. When solo (no household), localStorage is used. The bridge is in `App.tsx`.
- **AI API keys** are stored in localStorage on the user's device — never sent to any server other than the respective AI provider.
- **Pexels API key** is also stored in localStorage. User gets their own free key from pexels.com/api.
- **Firebase client config** in the source code is NOT a security risk — it's public by design. Security comes from Firebase Security Rules.
- **All AI requests** go directly from the user's browser to the AI provider. No backend/proxy server.
- **Groq (not Grok):** Uses `api.groq.com/openai/v1/chat/completions` with `llama-3.3-70b-versatile`. Setup at `console.groq.com/keys`. Free tier.

---

## 🔒 Firebase Security Rules (Currently Active)

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

- Users can only read/write their own `/users/{uid}` document
- Any authenticated user can read/write household data (needed for multi-user sharing)
- Unauthenticated users cannot access anything

---

## 🚀 Netlify Deployment

- **Site:** Connected to `traviswieser/wieser-eats` GitHub repo
- **Deploy branch:** `main` (auto-deploys on every push)
- **Build command:** none (pre-built `index.html`)
- **Publish directory:** `.`
- **netlify.toml** includes:
  - `SECRETS_SCAN_SMART_DETECTION_ENABLED = "false"` (Firebase client keys are not secrets)
  - SPA redirect: `/* → /index.html` with status 200
  - Security headers: X-Frame-Options DENY, nosniff, strict referrer, permissions policy
- **Firebase authorized domains** must include the Netlify URL

---

## 🔄 Current Version: v1.5.0

See `source/src/components/pages/AppUpdates.tsx` for full changelog.

When adding new features, update:
1. The `UPDATES` array in `AppUpdates.tsx` with a new entry at the top
2. The version number in the Settings About section
3. This HANDOFF.md file

---
