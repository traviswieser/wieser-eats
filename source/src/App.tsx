import { useState, useEffect, useCallback, useRef } from 'react';
import { useStorage } from './hooks/useStorage';
import { useUserSettings } from './hooks/useUserSettings';
import { auth, onAuthStateChanged, signOut, type User } from './firebase';
import { useHousehold } from './hooks/useHousehold';
import { AuthScreen } from './components/pages/AuthScreen';
import { ChefAI } from './components/pages/ChefAI';
import { Pantry } from './components/pages/Pantry';
import { MealPlan } from './components/pages/MealPlan';
import { ShoppingList } from './components/pages/ShoppingList';
import { Favorites } from './components/pages/Favorites';
import { Settings } from './components/pages/Settings';
import { AppUpdates, LATEST_VERSION, UPDATES } from './components/pages/AppUpdates';
import type { PageName, PantryItem, Recipe, MealPlanEntry, ShoppingItem, UserSettings, RecipeHistory, PlannerView } from './types';

const LOGO_SRC = 'data:image/png;base64,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';

const AUTH_LOGO = 'data:image/png;base64,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';

const defaultSettings: UserSettings = {
  theme: 'dark',
  allergies: [],
  dietType: 'none',
  defaultServings: 4,
  kidFriendly: false,
  aiKeys: [],
  activeAIProvider: null,
  aiImageGen: false,
  pexelsKey: '',
  edamamAppId: '',
  edamamKey: '',
};

const navItems: { id: PageName; label: string; icon: string }[] = [
  { id: 'chef', label: 'Chef AI', icon: '👨‍🍳' },
  { id: 'pantry', label: 'Pantry', icon: '🥫' },
  { id: 'mealplan', label: 'Planner', icon: '📅' },
  { id: 'shopping', label: 'Shopping', icon: '🛒' },
  { id: 'favorites', label: 'Favorites', icon: '❤️' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [page, setPage] = useState<PageName>('chef');
  const pageHistoryRef = useRef<PageName[]>(['chef']);
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);

  // History-aware navigation
  const navigate = useCallback((newPage: PageName) => {
    setPage(newPage);
    pageHistoryRef.current = [...pageHistoryRef.current, newPage];
    // Push a dummy history state so Android back button fires popstate
    window.history.pushState({ page: newPage }, '');
  }, []);

  const navigateBack = useCallback(() => {
    const hist = pageHistoryRef.current;
    if (hist.length > 1) {
      const prev = hist[hist.length - 2];
      pageHistoryRef.current = hist.slice(0, -1);
      setPage(prev);
    }
  }, []);
  const { data: settings, save: saveSettings, loaded: settingsLoaded } = useUserSettings(user, defaultSettings);
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  const plannerView: PlannerView = settings.plannerView ?? 'weekly';
  const setPlannerView = (v: PlannerView) => saveSettings({ ...settings, plannerView: v });
  // Solo (localStorage) storage
  const { data: soloPantry, save: saveSoloPantry, loaded: pantryLoaded } = useStorage<PantryItem[]>('mealmate-pantry', [], true);
  const { data: soloFavorites, save: saveSoloFavorites } = useStorage<Recipe[]>('mealmate-favorites', [], false);
  const { data: soloMealPlan, save: saveSoloMealPlan } = useStorage<MealPlanEntry[]>('mealmate-mealplan', [], true);
  const { data: soloShoppingList, save: saveSoloShoppingList } = useStorage<ShoppingItem[]>('mealmate-shopping', [], true);
  const { data: currentRecipes, save: saveCurrentRecipes } = useStorage<Recipe[]>('mealmate-current-recipes', [], false);
  const { data: recipeHistory, save: saveRecipeHistory } = useStorage<RecipeHistory[]>('mealmate-recipe-history', [], false);

  // Household (Firestore) — active when user joins a household
  const hh = useHousehold(user);
  const inHousehold = !!hh.householdId;

  // Bridge: use Firestore data when in household, localStorage when solo
  const pantry = inHousehold ? hh.shared.pantry : soloPantry;
  const favorites = inHousehold ? hh.shared.favorites : soloFavorites;
  const mealPlan = inHousehold ? hh.shared.mealPlan : soloMealPlan;
  const shoppingList = inHousehold ? hh.shared.shopping : soloShoppingList;

  const savePantry = inHousehold ? hh.savePantry : saveSoloPantry;
  const saveFavorites = inHousehold ? hh.saveFavorites : saveSoloFavorites;
  const saveMealPlan = inHousehold ? hh.saveMealPlan : saveSoloMealPlan;
  const saveShoppingList = inHousehold ? hh.saveShopping : saveSoloShoppingList;

  // Get user's last name for dynamic title
  const getLastName = () => {
    if (!user?.displayName) return 'Wieser';
    const parts = user.displayName.trim().split(/\s+/);
    return parts.length > 1 ? parts[parts.length - 1] : parts[0];
  };

  // Firebase auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  // Handle Android back button
  useEffect(() => {
    window.history.pushState({ page: 'chef' }, '');
    const handlePopState = () => {
      const hist = pageHistoryRef.current;
      if (hist.length > 1) {
        const prev = hist[hist.length - 2];
        pageHistoryRef.current = hist.slice(0, -1);
        setPage(prev);
        // Re-push so the browser still has a state to pop next time
        window.history.pushState({ page: prev }, '');
      } else {
        // Nothing to go back to — let the browser handle it (closes PWA)
        window.history.back();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // One-time update notification
  useEffect(() => {
    const seenKey = `wieser-eats-seen-version`;
    const seenVersion = localStorage.getItem(seenKey);
    if (seenVersion !== LATEST_VERSION) {
      setShowUpdatePopup(true);
    }
  }, []);

  useEffect(() => {
    if (settingsLoaded) {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark');
    }
  }, [settings.theme, settingsLoaded]);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleSignOut = async () => {
    // Remove the legacy shared settings key so it can never leak to the next user.
    localStorage.removeItem('mealmate-settings');
    await signOut(auth);
    pageHistoryRef.current = ['chef'];
    setPage('chef');
  };

  const addToFavorites = (recipe: Recipe) => {
    const tagged = { ...recipe, addedBy: user?.uid };
    if (!favorites.find(f => f.id === recipe.id)) saveFavorites([...favorites, tagged]);
  };
  const removeFromFavorites = (id: string) => saveFavorites(favorites.filter(f => f.id !== id));
  const updateFavorite = (updated: Recipe) => saveFavorites(favorites.map(f => f.id === updated.id ? { ...updated, addedBy: (f as any).addedBy } : f));
  const isFavorite = (id: string) => favorites.some(f => f.id === id);
  const addToMealPlan = (entries: MealPlanEntry | MealPlanEntry[]) => {
    const arr = Array.isArray(entries) ? entries : [entries];
    const tagged = arr.map(e => ({ ...e, addedBy: user?.uid }));
    saveMealPlan([...mealPlan, ...tagged]);
  };
  const removeFromMealPlan = (id: string) => saveMealPlan(mealPlan.filter(e => e.id !== id));
  const updateMealPlanEntry = (id: string, recipe: Recipe) =>
    saveMealPlan(mealPlan.map(e => e.id === id ? { ...e, recipe } : e));
  const addToShoppingList = (items: ShoppingItem[]) => {
    const newItems = items.filter(i => !shoppingList.find(s => s.name.toLowerCase() === i.name.toLowerCase()));
    saveShoppingList([...shoppingList, ...newItems]);
  };

  const onRecipesGenerated = (recipes: Recipe[]) => {
    saveCurrentRecipes(recipes);
    // Add to history, keep last 12 batches
    const entry: RecipeHistory = { recipes, timestamp: Date.now() };
    const updated = [entry, ...recipeHistory].slice(0, 10);
    saveRecipeHistory(updated);
  };

  const onLoadFromHistory = (recipes: Recipe[]) => {
    // Just restore the recipes to view — do NOT add a new history entry
    saveCurrentRecipes(recipes);
  };

  const clearCurrentRecipes = () => saveCurrentRecipes([]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <img src={LOGO_SRC} alt="Wieser Eats" className="w-12 h-12 mx-auto object-contain animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not signed in — show auth screen
  if (!user) {
    return <AuthScreen logoSrc={AUTH_LOGO} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('chef')} className="flex items-center gap-2.5">
            <img src={LOGO_SRC} alt="Home" className="w-9 h-9 object-contain" />
            <h1 className="font-display text-xl font-bold tracking-tight"><span className="text-primary">{getLastName()}</span> Eats</h1>
          </button>
          <div className="flex items-center gap-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-7 h-7 rounded-full border border-border/50" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <button
              onClick={() => {
                const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
                saveSettings({ ...settings, theme: newTheme });
              }}
              className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors text-sm"
              title="Toggle theme"
            >
              {settings.theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-4 pb-24">
        {page === 'chef' && (
          <ChefAI pantry={pantry} settings={settings} onAddFavorite={addToFavorites}
            onAddToMealPlan={addToMealPlan} onAddToShoppingList={addToShoppingList}
            isFavorite={isFavorite} onGoToSettings={() => navigate('settings')}
            savedRecipes={currentRecipes} onRecipesGenerated={onRecipesGenerated}
            onLoadFromHistory={onLoadFromHistory}
            onClearRecipes={clearCurrentRecipes} recipeHistory={recipeHistory}
            showToast={showToast} />
        )}
        {page === 'pantry' && <Pantry pantry={pantry} savePantry={savePantry} loaded={pantryLoaded} />}
        {page === 'mealplan' && <MealPlan mealPlan={mealPlan} onRemove={removeFromMealPlan} onUpdate={updateMealPlanEntry} onAddToShoppingList={addToShoppingList} onAdd={addToMealPlan} getMemberColor={hh.getMemberColor} getMemberName={hh.getMemberName} inHousehold={inHousehold} showToast={showToast} currentView={plannerView} onViewChange={setPlannerView} />}
        {page === 'shopping' && <ShoppingList list={shoppingList} saveList={saveShoppingList} />}
        {page === 'favorites' && <Favorites favorites={favorites} onRemove={removeFromFavorites} onUpdate={updateFavorite} onAddToMealPlan={addToMealPlan} onAddToShoppingList={addToShoppingList} onAddCustomRecipe={addToFavorites} settings={settings} currentUserId={user?.uid} inHousehold={inHousehold} getMemberName={hh.getMemberName} getMemberColor={hh.getMemberColor} showToast={showToast} />}
        {page === 'settings' && <Settings settings={settings} saveSettings={saveSettings} user={user} onSignOut={handleSignOut} appName={`${getLastName()} Eats`} household={hh.household} onCreateHousehold={hh.createHousehold} onJoinHousehold={hh.joinHousehold} onLeaveHousehold={hh.leaveHousehold} onGoToUpdates={() => navigate('updates')} />}
        {page === 'updates' && <AppUpdates onBack={() => navigateBack()} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto flex">
          {navItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`flex-1 flex flex-col items-center py-2 px-1 transition-all duration-200 ${
                page === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
              <span className="text-lg leading-none mb-0.5">{item.icon}</span>
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
              {page === item.id && <div className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-full" />}
            </button>
          ))}
        </div>
      </nav>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
          <div className="bg-foreground text-background text-xs font-medium px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200 whitespace-nowrap">
            ✓ {toast}
          </div>
        </div>
      )}

      {/* Update Notification Popup */}
      {showUpdatePopup && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-primary/30 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🎉</span>
                <div>
                  <p className="font-display font-bold text-sm">What's new in v{LATEST_VERSION}</p>
                  <p className="text-[10px] text-muted-foreground">{UPDATES[0].date} — {UPDATES[0].title}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {UPDATES[0].notes.slice(0, 5).map((note, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5 text-[10px] shrink-0">●</span>
                    <span>{note}</span>
                  </li>
                ))}
                {UPDATES[0].notes.length > 5 && (
                  <li className="text-xs text-muted-foreground pl-4">...and {UPDATES[0].notes.length - 5} more</li>
                )}
              </ul>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    localStorage.setItem('wieser-eats-seen-version', LATEST_VERSION);
                    setShowUpdatePopup(false);
                    navigate('updates');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-primary border border-primary/40 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  Full Changelog →
                </button>
                <button
                  onClick={() => {
                    localStorage.setItem('wieser-eats-seen-version', LATEST_VERSION);
                    setShowUpdatePopup(false);
                  }}
                  className="flex-1 py-2 text-xs font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
