import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PlanDialog } from '@/components/PlanDialog';
import { RecipeEditDialog } from '@/components/RecipeEditDialog';
import type { PantryItem, Recipe, RecipeHistory, MealPlanEntry, ShoppingItem, UserSettings, AIFilters, AIProvider, AIKeyEntry } from '@/types';

interface ChefAIProps {
  pantry: PantryItem[];
  settings: UserSettings;
  onAddFavorite: (recipe: Recipe) => void;
  onAddToMealPlan: (entries: MealPlanEntry | MealPlanEntry[]) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  isFavorite: (id: string) => boolean;
  onGoToSettings: () => void;
  savedRecipes: Recipe[];
  onRecipesGenerated: (recipes: Recipe[]) => void;
  onLoadFromHistory: (recipes: Recipe[]) => void;
  onClearRecipes: () => void;
  recipeHistory: RecipeHistory[];
  showToast?: (msg: string) => void;
}

const defaultFilters: AIFilters = {
  mealType: 'any', cookTime: 'any', difficulty: 'any', cuisine: 'any',
  cookingMethod: 'any', servings: 4, spiceLevel: 'any',
};

const CUISINES = ['Any','American','Mexican','Italian','Chinese','Japanese','Indian','Thai','Mediterranean','Korean','French','Greek','Southern/BBQ'];
const PROTEINS = ['Chicken','Beef','Ground Beef','Pork','Salmon','Shrimp','Turkey','Tofu','Eggs'];

// ── Edamam helpers ─────────────────────────────────────────────────────────

function buildEdamamUrl(query: string, proteins: string[], filters: AIFilters, settings: UserSettings): string {
  const base = 'https://api.edamam.com/api/recipes/v2';
  const params = new URLSearchParams({
    type: 'public',
    app_id: settings.edamamAppId,
    app_key: settings.edamamKey,
    random: 'true',
    from: '0',
    to: '14',
  });

  const terms = [query, ...proteins].filter(Boolean).join(' ').trim();
  if (terms) params.set('q', terms);

  const mealMap: Record<string, string> = {
    breakfast: 'breakfast', lunch: 'lunch/dinner', dinner: 'lunch/dinner', snack: 'snack',
  };
  if (filters.mealType !== 'any' && mealMap[filters.mealType]) {
    params.append('mealType', mealMap[filters.mealType]);
  }

  if (filters.cuisine !== 'any') {
    const c = filters.cuisine.toLowerCase().replace('southern/bbq', 'american');
    params.append('cuisineType', c);
  }

  const timeMap: Record<string, string> = {
    '15 minutes': '1-15', '30 minutes': '1-30', '45 minutes': '1-45',
    '60 minutes': '1-60', '120 minutes': '1-120',
  };
  if (filters.cookTime !== 'any' && timeMap[filters.cookTime]) {
    params.set('time', timeMap[filters.cookTime]);
  }

  const dietMap: Record<string, { param: 'diet' | 'health'; value: string }> = {
    vegan: { param: 'health', value: 'vegan' },
    vegetarian: { param: 'health', value: 'vegetarian' },
    keto: { param: 'diet', value: 'low-carb' },
    paleo: { param: 'health', value: 'paleo' },
    'gluten-free': { param: 'health', value: 'gluten-free' },
    'dairy-free': { param: 'health', value: 'dairy-free' },
  };
  if (settings.dietType !== 'none' && dietMap[settings.dietType]) {
    const { param, value } = dietMap[settings.dietType];
    params.append(param, value);
  }

  const allergyMap: Record<string, string[]> = {
    gluten: ['gluten-free'], dairy: ['dairy-free'], eggs: ['egg-free'],
    nuts: ['peanut-free', 'tree-nut-free'], peanuts: ['peanut-free'],
    shellfish: ['shellfish-free'], fish: ['fish-free'], soy: ['soy-free'],
  };
  for (const allergy of settings.allergies) {
    const labels = allergyMap[allergy.toLowerCase()];
    if (labels) labels.forEach(l => params.append('health', l));
  }

  return `${base}?${params.toString()}`;
}

function mapEdamamHit(hit: any, servings: number): Recipe {
  const r = hit.recipe;
  const yield_ = r.yield || servings || 4;
  const totalNutrients = r.totalNutrients || {};
  const perServing = (key: string) => Math.round((totalNutrients[key]?.quantity || 0) / yield_);

  const cookTime = (() => {
    const mins = r.totalTime;
    if (!mins) return 'See recipe';
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  })();

  const cookingMethod = (() => {
    const tags = [...(r.dishType || []), ...(r.cuisineType || [])].map((t: string) => t.toLowerCase());
    if (tags.some((t: string) => t.includes('bak') || t.includes('roast'))) return 'Oven/Bake';
    if (tags.some((t: string) => t.includes('grill'))) return 'Grill';
    if (tags.some((t: string) => t.includes('salad'))) return 'No-Cook';
    return 'Stovetop';
  })();

  return {
    id: `edamam-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: r.label || 'Recipe',
    description: `${r.source || 'Recipe'} · ${r.cuisineType?.join(', ') || r.dishType?.join(', ') || 'Delicious dish'}`,
    ingredients: r.ingredientLines || [],
    instructions: [],
    cookTime,
    difficulty: 'Medium',
    mealType: r.mealType?.[0] || 'dinner',
    cuisine: r.cuisineType?.[0] || 'American',
    cookingMethod,
    servings: yield_,
    spiceLevel: 'Mild',
    macros: {
      calories: perServing('ENERC_KCAL'),
      protein: perServing('PROCNT'),
      carbs: perServing('CHOCDF'),
      fat: perServing('FAT'),
      fiber: perServing('FIBTG'),
    },
    kidFriendly: false,
    sourceUrl: r.url || '',
  };
}

// ── AI instruction generation ───────────────────────────────────────────────

async function generateInstructionsAI(recipe: Recipe, activeKey: AIKeyEntry): Promise<string[]> {
  const prompt = `Generate clear step-by-step cooking instructions for "${recipe.name}" using these ingredients:\n${recipe.ingredients.join('\n')}\n\nReturn ONLY a JSON array of instruction strings. No markdown, no backticks, just the raw JSON array.`;
  const { provider, key } = activeKey;

  let url = '', headers: Record<string, string> = {}, body: any = {};

  if (provider === 'grok') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
    body = { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
    body = { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], max_tokens: 1500 };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    headers = { 'Content-Type': 'application/json' };
    body = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500 } };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2024-01-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    body = { model: 'claude-haiku-4-5-20251001', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json();

  let text = '';
  if (provider === 'gemini') text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  else if (provider === 'claude') text = data.content?.map((b: any) => b.text || '').join('') || '';
  else text = data.choices?.[0]?.message?.content || '';

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse AI response');
  return JSON.parse(match[0]) as string[];
}

// ── Photo import ────────────────────────────────────────────────────────────

async function importRecipeFromPhoto(photoPreview: string, activeKey: AIKeyEntry): Promise<Recipe> {
  const importPrompt = `Look at this image of a recipe (recipe card, cookbook page, handwritten note, or screenshot). Extract the complete recipe and return ONLY a JSON object with: "name" (string), "description" (string), "ingredients" (string[]), "instructions" (string[]), "cookTime" (string), "difficulty" (Easy/Medium/Hard), "mealType" (string), "cuisine" (string), "cookingMethod" (string), "servings" (number), "spiceLevel" (Mild/Medium/Hot/Extra Hot), "macros" (object: calories, protein, carbs, fat, fiber as numbers per serving — estimate if not shown), "kidFriendly" (boolean). Return ONLY the JSON object, nothing else.`;

  const { provider, key } = activeKey;
  let url = '', headers: Record<string, string> = {}, body: any = {};
  const mimeType = photoPreview.split(';')[0].split(':')[1] || 'image/jpeg';
  const b64 = photoPreview.split(',')[1] || '';

  if (provider === 'grok') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
    body = { model: 'meta-llama/llama-4-scout-17b-16e-instruct', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: photoPreview } }, { type: 'text', text: importPrompt }] }], max_tokens: 2000 };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` };
    body = { model: 'gpt-4o', messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: photoPreview } }, { type: 'text', text: importPrompt }] }], max_tokens: 2000 };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    headers = { 'Content-Type': 'application/json' };
    body = { contents: [{ parts: [{ inline_data: { mime_type: mimeType, data: b64 } }, { text: importPrompt }] }], generationConfig: { maxOutputTokens: 2000 } };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2024-01-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    body = { model: 'claude-sonnet-4-20250514', max_tokens: 2000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mimeType, data: b64 } }, { type: 'text', text: importPrompt }] }] };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const data = await res.json();

  let text = '';
  if (provider === 'gemini') text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  else if (provider === 'claude') text = data.content?.map((b: any) => b.text || '').join('') || '';
  else text = data.choices?.[0]?.message?.content || '';

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse recipe from photo');
  const parsed = JSON.parse(match[0]);
  return { ...parsed, id: `import-${Date.now()}`, macros: parsed.macros || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 } };
}

// ── Main Component ──────────────────────────────────────────────────────────

export function ChefAI({ pantry, settings, onAddFavorite, onAddToMealPlan, onAddToShoppingList, isFavorite, onGoToSettings, savedRecipes, onRecipesGenerated, onLoadFromHistory, onClearRecipes, recipeHistory, showToast }: ChefAIProps) {
  const [filters, setFilters] = useState<AIFilters>({ ...defaultFilters, servings: settings.defaultServings });
  const [query, setQuery] = useState('');
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const recipes = savedRecipes;
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [instructionsLoading, setInstructionsLoading] = useState<Set<string>>(new Set());
  const [fnDebug, setFnDebug] = useState<Record<string, string>>({});
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

  // Photo import
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [importMode, setImportMode] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);
  const importCameraRef = useRef<HTMLInputElement>(null);

  const hasEdamam = !!(settings.edamamAppId && settings.edamamKey);
  const activeKey = settings.aiKeys.find(k => k.provider === settings.activeAIProvider);

  const toggleProtein = (p: string) => setSelectedProteins(prev =>
    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
  );

  // ── Search ────────────────────────────────────────────────────────────────
  const searchRecipes = async () => {
    if (!hasEdamam) return;
    setLoading(true); setError(null); onClearRecipes();
    try {
      const url = buildEdamamUrl(query, selectedProteins, filters, settings);
      const res = await fetch(url, {
        headers: { 'Edamam-Account-User': settings.edamamAppId },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Edamam error ${res.status}`);
      }
      const data = await res.json();
      const hits = data.hits || [];
      if (hits.length === 0) throw new Error('No recipes found. Try adjusting your search or filters.');
      onRecipesGenerated(hits.map((h: any) => mapEdamamHit(h, filters.servings)));
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // ── Lazy-load instructions on expand ─────────────────────────────────────
  const handleExpand = async (recipeId: string) => {
    const newExpanded = expandedRecipe === recipeId ? null : recipeId;
    setExpandedRecipe(newExpanded);
    if (!newExpanded) return;

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe || recipe.instructions.length > 0 || instructionsLoading.has(recipeId)) return;

    setInstructionsLoading(prev => new Set([...prev, recipeId]));
    try {
      // 1. Try Netlify function → real JSON-LD instructions from source page
      if (recipe.sourceUrl) {
        try {
          const fnRes = await fetch(`/.netlify/functions/fetch-recipe?url=${encodeURIComponent(recipe.sourceUrl)}`);
          if (fnRes.ok) {
            const fnData = await fnRes.json();
            // Always capture debug info so we can show it in the UI
            if (fnData.debug) {
              setFnDebug(prev => ({ ...prev, [recipeId]: fnData.debug }));
            }
            if (fnData.found && fnData.instructions?.length > 0) {
              onRecipesGenerated(recipes.map(r =>
                r.id === recipeId ? { ...r, instructions: fnData.instructions, instructionSource: 'real' as const } : r
              ));
              return;
            }
          } else {
            setFnDebug(prev => ({ ...prev, [recipeId]: `Function HTTP ${fnRes.status}` }));
          }
        } catch (fnErr: any) {
          setFnDebug(prev => ({ ...prev, [recipeId]: `Function error: ${fnErr.message || 'failed'}` }));
        }
      }

      // 2. AI fallback — generate from ingredient list
      if (activeKey) {
        const aiSteps = await generateInstructionsAI(recipe, activeKey);
        onRecipesGenerated(recipes.map(r =>
          r.id === recipeId ? { ...r, instructions: aiSteps, instructionSource: 'ai' as const } : r
        ));
      }
      // If no AI key → instructions stay empty, source link shown
    } catch { /* silently swallow */ }
    finally {
      setInstructionsLoading(prev => { const s = new Set(prev); s.delete(recipeId); return s; });
    }
  };

  // ── Photo import ──────────────────────────────────────────────────────────
  const handleImportPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setPhotoPreview(ev.target?.result as string); setImportMode(true); };
    reader.readAsDataURL(file);
  };

  const runImport = async () => {
    if (!photoPreview || !activeKey) return;
    setImportLoading(true); setError(null);
    try {
      const recipe = await importRecipeFromPhoto(photoPreview, activeKey);
      onRecipesGenerated([recipe]);
      setPhotoPreview(null); setImportMode(false);
      if (importFileRef.current) importFileRef.current.value = '';
      if (importCameraRef.current) importCameraRef.current.value = '';
    } catch (err: any) {
      setError(err.message || 'Could not read recipe from photo.');
    } finally {
      setImportLoading(false);
    }
  };

  const clearPhoto = () => {
    setPhotoPreview(null); setImportMode(false);
    if (importFileRef.current) importFileRef.current.value = '';
    if (importCameraRef.current) importCameraRef.current.value = '';
  };

  const addMissingToShoppingList = (recipe: Recipe) => {
    const pantryNames = pantry.map(p => p.name.toLowerCase());
    const missing = recipe.ingredients.filter(ing => !pantryNames.some(pn => ing.toLowerCase().includes(pn)));
    onAddToShoppingList(missing.map((ing, i) => ({ id: `shop-${Date.now()}-${i}`, name: ing, quantity: '', checked: false, category: 'Recipe Ingredients' })));
    showToast?.(`${missing.length} missing ingredient${missing.length !== 1 ? 's' : ''} added to list`);
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1">Find Real Recipes<span className="text-primary">.</span></h2>
        <p className="text-muted-foreground text-sm">2.3M+ real recipes from top food sites</p>
      </div>

      {/* Edamam setup banner */}
      {!hasEdamam && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-3xl">🥗</p>
            <p className="font-display font-bold text-sm">Set up Edamam to find real recipes</p>
            <p className="text-xs text-muted-foreground">Free API — 10,000 searches/month. Takes about 2 minutes to set up.</p>
            <Button size="sm" onClick={onGoToSettings} className="bg-primary text-primary-foreground text-xs font-semibold">
              Go to Settings → Recipe Search
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Optional AI key nudge */}
      {hasEdamam && !activeKey && (
        <Card className="border-border/50 bg-card/30">
          <CardContent className="p-3 flex items-center gap-3">
            <span className="text-xl shrink-0">💡</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">Add an AI key for auto-generated instructions</p>
              <p className="text-[11px] text-muted-foreground">Optional — Groq is free. Without it we'll link you to the original recipe.</p>
            </div>
            <Button size="sm" variant="outline" onClick={onGoToSettings} className="text-xs shrink-0">Add Key</Button>
          </CardContent>
        </Card>
      )}

      {/* Photo import card */}
      {hasEdamam && activeKey && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input ref={importFileRef} type="file" accept="image/*" className="hidden" onChange={handleImportPhoto} />
              <input ref={importCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImportPhoto} />
              <p className="text-xs text-muted-foreground font-medium flex-1">📄 Have a recipe card or cookbook photo?</p>
              <Button variant="outline" size="sm" onClick={() => importFileRef.current?.click()} className="text-xs">Gallery</Button>
              <Button variant="outline" size="sm" onClick={() => importCameraRef.current?.click()} className="text-xs">Camera</Button>
            </div>
            {photoPreview && importMode && (
              <div className="flex items-center gap-3">
                <img src={photoPreview} alt="recipe" className="w-12 h-12 rounded-lg object-cover border border-border shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">Photo ready to import</p>
                  <p className="text-[11px] text-muted-foreground">AI will extract the full recipe from this image</p>
                </div>
                <Button size="sm" onClick={runImport} disabled={importLoading} className="text-xs bg-primary text-primary-foreground shrink-0">
                  {importLoading ? '⏳' : '📄 Import'}
                </Button>
                <button onClick={clearPhoto} className="text-xs text-destructive hover:underline shrink-0">Remove</button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Search card */}
      {hasEdamam && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="e.g. pasta with vegetables, quick weeknight dinner, chicken tacos..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="min-h-[70px] bg-background/50 resize-none border-border/50 text-sm"
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">Quick protein select:</p>
              <div className="flex flex-wrap gap-1.5">
                {PROTEINS.map(p => (
                  <Badge key={p}
                    variant={selectedProteins.includes(p) ? 'default' : 'outline'}
                    className={`cursor-pointer text-xs transition-all ${selectedProteins.includes(p) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-secondary'}`}
                    onClick={() => toggleProtein(p)}
                  >{p}</Badge>
                ))}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-xs text-muted-foreground w-full">
              {showFilters ? '▾ Hide Filters' : '▸ More Filters (cuisine, cook time, diet...)'}
            </Button>
            {showFilters && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <FilterSelect label="Meal Type" value={filters.mealType} onChange={v => setFilters({...filters, mealType: v})} options={[['any','Any'],['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snack','Snack']]} />
                <FilterSelect label="Cook Time" value={filters.cookTime} onChange={v => setFilters({...filters, cookTime: v})} options={[['any','Any'],['15 minutes','Under 15 min'],['30 minutes','Under 30 min'],['45 minutes','Under 45 min'],['60 minutes','Under 1 hour'],['120 minutes','1-2 hours']]} />
                <FilterSelect label="Cuisine" value={filters.cuisine} onChange={v => setFilters({...filters, cuisine: v})} options={CUISINES.map(c => [c.toLowerCase(), c])} />
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Servings</label>
                  <Input type="number" min={1} max={20} value={filters.servings} onChange={e => setFilters({...filters, servings: parseInt(e.target.value) || 4})} className="h-9 text-xs bg-background/50" />
                </div>
              </div>
            )}
            <Button onClick={searchRecipes} disabled={loading || !hasEdamam}
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-semibold text-sm tracking-wide">
              {loading
                ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Searching recipes...</span>
                : '🔍 Find Recipes'}
            </Button>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-3"><p className="text-sm text-destructive">{error}</p></CardContent>
        </Card>
      )}

      {/* Results */}
      {recipes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg">Recipes for you 👇</h3>
            <Button variant="ghost" size="sm" onClick={onClearRecipes} className="text-xs text-muted-foreground h-7">Clear</Button>
          </div>
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              expanded={expandedRecipe === recipe.id}
              onToggle={() => handleExpand(recipe.id)}
              onFavorite={() => { onAddFavorite(recipe); showToast?.('Added to favorites'); }}
              isFavorite={isFavorite(recipe.id)}
              onAddToMealPlan={r => setPlanRecipe(r)}
              onAddToShoppingList={() => addMissingToShoppingList(recipe)}
              onEdit={() => setEditRecipe(recipe)}
              showImage={settings.aiImageGen ?? false}
              pexelsKey={settings.pexelsKey}
              instructionsLoading={instructionsLoading.has(recipe.id)}
              hasAIKey={!!activeKey}
              fnDebug={fnDebug[recipe.id]}
            />
          ))}
          <p className="text-[10px] text-muted-foreground text-center opacity-60 pt-1">
            Recipe search powered by{' '}
            <a href="https://www.edamam.com" target="_blank" rel="noopener noreferrer" className="hover:underline">Edamam</a>
          </p>
        </div>
      )}

      {/* History */}
      {!loading && recipes.length === 0 && recipeHistory.length > 0 && hasEdamam && (
        <div className="space-y-3">
          <button onClick={() => setShowHistory(!showHistory)} className="w-full text-left">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-sm text-muted-foreground">Recent Recipes ({recipeHistory.length})</h3>
              <span className="text-xs text-muted-foreground">{showHistory ? '▾' : '▸'}</span>
            </div>
          </button>
          {showHistory && recipeHistory.map(batch => (
            <div key={batch.timestamp} className="space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                {new Date(batch.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
              {batch.recipes.map(recipe => (
                <Card key={recipe.id} className="border-border/30 bg-card/30 cursor-pointer hover:border-primary/20 transition-colors"
                  onClick={() => onLoadFromHistory(batch.recipes)}>
                  <CardContent className="p-3">
                    <p className="text-sm font-medium">{recipe.name}</p>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px] font-normal">⏱ {recipe.cookTime}</Badge>
                      <Badge variant="secondary" className="text-[10px] font-normal">🍽 {recipe.cuisine}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && recipes.length === 0 && recipeHistory.length === 0 && !error && hasEdamam && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-sm">Search for any dish, ingredient, or cuisine</p>
          <p className="text-xs mt-1 opacity-70">Results come from real sites like AllRecipes, Food Network &amp; more</p>
        </div>
      )}

      <PlanDialog
        recipe={planRecipe}
        open={!!planRecipe}
        onClose={() => setPlanRecipe(null)}
        onAdd={entries => { onAddToMealPlan(entries); showToast?.('Added to meal plan'); }}
      />
      <RecipeEditDialog
        recipe={editRecipe}
        open={!!editRecipe}
        onClose={() => setEditRecipe(null)}
        onSave={updated => {
          onRecipesGenerated(recipes.map(r => r.id === updated.id ? updated : r));
          showToast?.('Recipe updated');
        }}
      />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[][] }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function RecipeCard({ recipe, expanded, onToggle, onFavorite, isFavorite, onAddToMealPlan, onAddToShoppingList, onEdit, showImage, pexelsKey, instructionsLoading, hasAIKey, fnDebug }: {
  recipe: Recipe; expanded: boolean; onToggle: () => void; onFavorite: () => void; isFavorite: boolean;
  onAddToMealPlan: (r: Recipe) => void; onAddToShoppingList: () => void; onEdit: () => void;
  showImage: boolean; pexelsKey?: string; instructionsLoading: boolean; hasAIKey: boolean; fnDebug?: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  useEffect(() => {
    if (!showImage || !pexelsKey || imgUrl) return;
    setImgLoading(true);
    const searchTerm = recipe.name.replace(/[^a-zA-Z\s]/g, '').trim();
    fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm + ' food')}&per_page=1&orientation=landscape`, {
      headers: { Authorization: pexelsKey },
    })
      .then(r => r.json())
      .then(data => { const photo = data.photos?.[0]; if (photo) setImgUrl(photo.src?.medium || photo.src?.small || null); })
      .catch(() => {})
      .finally(() => setImgLoading(false));
  }, [showImage, pexelsKey, recipe.name]);

  const sourceDomain = (() => {
    try { return new URL(recipe.sourceUrl || '').hostname.replace('www.', ''); } catch { return ''; }
  })();

  return (
    <Card className="border-border/50 bg-card/60 overflow-hidden transition-all hover:border-primary/30">
      <CardContent className="p-0">
        {showImage && pexelsKey && (imgUrl || imgLoading) && (
          <div className="w-full h-36 bg-secondary/30 overflow-hidden relative">
            {imgLoading && <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground animate-pulse">Loading photo...</div>}
            {imgUrl && <img src={imgUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy" />}
          </div>
        )}
        <button onClick={onToggle} className="w-full text-left p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-base leading-tight">{recipe.name}</h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{recipe.description}</p>
              {sourceDomain && <p className="text-[10px] text-primary/70 mt-0.5">📖 {sourceDomain}</p>}
            </div>
            <span className="text-lg shrink-0">{expanded ? '▾' : '▸'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <Badge variant="secondary" className="text-[10px] font-normal">⏱ {recipe.cookTime}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">🍽 {recipe.cuisine}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">👥 {recipe.servings} servings</Badge>
            {recipe.kidFriendly && <Badge variant="secondary" className="text-[10px] font-normal">👶 Kid-friendly</Badge>}
            {recipe.instructionSource === 'real' && <Badge variant="secondary" className="text-[10px] font-normal text-green-400">✓ Real instructions</Badge>}
            {recipe.instructionSource === 'ai' && <Badge variant="secondary" className="text-[10px] font-normal text-blue-400">✨ AI instructions</Badge>}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            <Separator className="opacity-50" />

            {/* Nutrition */}
            {(recipe.macros.calories > 0 || recipe.macros.protein > 0) && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Nutrition per serving</p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: 'Calories', value: recipe.macros.calories, unit: 'kcal', color: 'text-orange-400' },
                    { label: 'Protein',  value: recipe.macros.protein,  unit: 'g',    color: 'text-blue-400' },
                    { label: 'Carbs',    value: recipe.macros.carbs,    unit: 'g',    color: 'text-yellow-400' },
                    { label: 'Fat',      value: recipe.macros.fat,      unit: 'g',    color: 'text-red-400' },
                    { label: 'Fiber',    value: recipe.macros.fiber,    unit: 'g',    color: 'text-green-400' },
                  ].map(m => (
                    <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/50">
                      <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[10px] font-normal opacity-70">{m.unit}</span></p>
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Ingredients</p>
              <ul className="space-y-1">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <span className="text-primary mt-0.5 text-xs shrink-0">●</span><span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Instructions</p>
              {instructionsLoading && (
                <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground animate-pulse">
                  <span className="animate-spin">⏳</span><span>Fetching instructions from source...</span>
                </div>
              )}
              {!instructionsLoading && recipe.instructions.length > 0 && (
                <ol className="space-y-2">
                  {recipe.instructions.map((step, i) => (
                    <li key={i} className="text-sm flex items-start gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{i + 1}</span>
                      <span>{step.replace(/^\d+[.)]\s*/, '')}</span>
                    </li>
                  ))}
                </ol>
              )}
              {!instructionsLoading && recipe.instructions.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {hasAIKey ? 'Instructions could not be fetched automatically.' : 'Add an AI key in Settings to auto-generate instructions, or view the original recipe.'}
                  </p>
                  {recipe.sourceUrl && (
                    <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                      📖 View full recipe on {sourceDomain} →
                    </a>
                  )}
                </div>
              )}
              {/* Debug info — shown whenever a function attempt was made */}
              {fnDebug && (
                <p className="text-[10px] text-muted-foreground/50 mt-1 font-mono leading-relaxed">
                  🔧 {fnDebug}
                </p>
              )}
            </div>

            {/* Source link (when instructions loaded) */}
            {recipe.sourceUrl && recipe.instructions.length > 0 && (
              <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors">
                📖 Original recipe on {sourceDomain} →
              </a>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button onClick={onFavorite} disabled={isFavorite}
                className={`inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border transition-colors ${isFavorite ? 'bg-secondary text-muted-foreground border-border/50' : 'border-border/50 hover:bg-secondary'}`}>
                {isFavorite ? '✓ Saved' : '❤️ Favorite'}
              </button>
              <button onClick={() => onAddToMealPlan(recipe)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border/50 hover:bg-secondary transition-colors">
                📅 Add to Plan
              </button>
              <button onClick={onAddToShoppingList}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border/50 hover:bg-secondary transition-colors">
                🛒 Missing → List
              </button>
              <button onClick={onEdit}
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-border/50 hover:bg-secondary transition-colors">
                ✏️ Edit
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
