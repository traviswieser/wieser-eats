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
   bash /mnt/skills/examples/web-artifacts-builder/scripts/bundle-artifact.sh
   cp bundle.html ../index.html
   cd ..
   ```
5. **Push to `dev` only.** Travis will say "deploy" when ready for `main`.
6. Always clean the GitHub token from the remote URL after pushing.

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
| `source/src/App.tsx` | Root component — auth gate, page routing, state management. |
| `source/src/firebase.ts` | Firebase config + auth exports. |
| `source/src/types/index.ts` | All TypeScript interfaces. |
| `source/src/hooks/useStorage.ts` | Persistent storage hook (claude.ai artifact storage API). |
| `source/src/components/pages/` | All page components (ChefAI, Pantry, MealPlan, ShoppingList, Favorites, Settings, AuthScreen). |
| `source/src/index.css` | Tailwind + custom warm dark/light theme with Bricolage Grotesque + DM Sans fonts. |
| `manifest.json` | PWA manifest for installable app. |
| `sw.js` | Service worker for offline caching. |
| `netlify.toml` | Netlify deploy config — no build step, just serves static files. |
| `icon-*.png` | App icons (192px, 512px, regular + maskable). |
| `HANDOFF.md` | This file. |
| `.gitignore` | Ignores node_modules, .env, .DS_Store. |

---

## 🏗️ Tech Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + shadcn/ui (40+ components)
- **Build:** Vite + Parcel (bundles to single HTML file via `bundle-artifact.sh`)
- **Auth:** Firebase Authentication (Google Sign-in + Email/Password)
- **Storage:** Claude artifact persistent storage API (`window.storage`)
- **AI Providers:** Grok (free), Claude, OpenAI, Gemini — user provides their own API keys
- **AI Images:** Pollinations.ai (free, no API key) — optional toggle in Settings
- **Calendar Sync:** .ics download, Google Calendar, Outlook Calendar web links
- **Hosting:** Netlify (serves pre-built `index.html`)

---

## 🔑 Firebase Project

- **Project:** `wieser-eats` (separate from Wieser Workouts)
- **Auth providers enabled:** Google, Email/Password
- **Console:** https://console.firebase.google.com/project/wieser-eats
- Firebase config is embedded in `source/src/firebase.ts` (client-side keys — safe for public repos when secured with Firebase Security Rules)

---

## 📱 App Features

1. **Chef AI** — Multi-provider AI recipe suggestions with photo upload, protein quick-select, and filters (cuisine, cook time, difficulty, method, spice level, servings). Shows macros per serving. Optional AI-generated meal images via Pollinations.ai.
2. **Pantry** — Add items manually or scan photos with AI. Categorized, searchable. Shared across household.
3. **Meal Planner** — Weekly calendar grid (breakfast/lunch/dinner/snack). Navigate weeks. Weekly macro totals. Calendar sync (Google, Outlook, .ics).
4. **Shopping List** — Grouped by source, check-off items, auto-generate from meal plan or missing recipe ingredients.
5. **Favorites** — Save and search recipes with full detail view.
6. **Settings** — AI API key management (add/remove/switch providers), dark/light theme, diet type, allergies, kid-friendly toggle, AI images toggle, default servings, account info, sign out.

---

## 🎨 Theme

- **Dark mode default** with warm food-inspired palette
- Primary accent: `hsl(25, 95%, 53%)` (warm orange — matches logo)
- Fonts: Bricolage Grotesque (headings), DM Sans (body)
- "Wieser" is always orange (`text-primary`), "Eats" is foreground color

---

## ⚠️ Important Notes

- The app currently uses `window.storage` (Claude artifact storage). For a standalone deployment, this would need to be replaced with Firebase Firestore or localStorage.
- AI API keys are stored in `window.storage` on the user's device — they are NOT sent to any server other than the respective AI provider.
- Firebase client config in the source code is NOT a security risk — it's public by design. Security comes from Firebase Security Rules (see below).
- All AI requests go directly from the user's browser to the AI provider. No backend/proxy server.

---

## 🔒 Firebase Security Rules (Firestore — if added later)

If Firestore is added for cloud data sync, use these rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Firebase Auth Security Rules (already enforced by default):
- Only authenticated users can access the app
- Each user can only read/write their own data

---

## 🚀 Netlify Deployment

1. Connect the GitHub repo (`traviswieser/wieser-eats`) to Netlify
2. Set deploy branch to `main`
3. No build command needed — Netlify serves the pre-built `index.html`
4. Add `wieser-eats.netlify.app` (or custom domain) to Firebase Auth → Authorized domains

---
