import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PlanDialog } from '@/components/PlanDialog';
import { RecipeEditDialog } from '@/components/RecipeEditDialog';
import type { Recipe, MealPlanEntry, ShoppingItem, UserSettings, AIProvider } from '@/types';

interface FavoritesProps {
  favorites: Recipe[];
  onRemove: (id: string) => void;
  onUpdate: (recipe: Recipe) => void;
  onAddToMealPlan: (entries: MealPlanEntry | MealPlanEntry[]) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  onAddCustomRecipe: (recipe: Recipe) => void;
  settings: UserSettings;
  currentUserId?: string;
  inHousehold?: boolean;
  getMemberName?: (uid?: string) => string;
  getMemberColor?: (uid?: string) => string;
  showToast?: (msg: string) => void;
  onCook: (recipe: Recipe) => void;
}

type FavFilter = 'all' | 'mine' | 'household';

const PROVIDER_LABELS: Record<AIProvider, string> = { grok: 'Groq', gemini: 'Gemini', claude: 'Claude', openai: 'OpenAI' };

async function callAI(provider: AIProvider, apiKey: string, prompt: string): Promise<string> {
  const systemPrompt = 'You are a professional chef and nutritionist. Return ONLY valid JSON (no markdown, no backticks, no extra text).';
  let url = '', headers: Record<string, string> = {}, body: any = {};

  if (provider === 'grok') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: 2000 };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], max_tokens: 2000 };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    body = { contents: [{ parts: [{ text: systemPrompt + '\n\n' + prompt }] }], generationConfig: { maxOutputTokens: 2000 } };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2024-01-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    body = { model: 'claude-sonnet-4-20250514', max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: prompt }] };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`${PROVIDER_LABELS[provider]} error ${res.status}: ${err.slice(0, 200)}`); }
  const data = await res.json();
  if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (provider === 'claude') return data.content?.map((b: any) => b.text || '').join('') || '';
  return data.choices?.[0]?.message?.content || '';
}

const emptyForm = {
  name: '', description: '', ingredientsRaw: '', instructionsRaw: '',
  cookTime: '', servings: '4', cuisine: '', difficulty: '', spiceLevel: '', mealType: '', cookingMethod: '', kidFriendly: false,
};

export function Favorites({ favorites, onRemove, onUpdate, onAddToMealPlan, onAddToShoppingList, onAddCustomRecipe, settings, currentUserId, inHousehold, getMemberName, getMemberColor, showToast, onCook }: FavoritesProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [favFilter, setFavFilter] = useState<FavFilter>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPreview, setAiPreview] = useState<Recipe | null>(null);
  const [planRecipe, setPlanRecipe] = useState<Recipe | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

  const hasAPIKey = settings.aiKeys.length > 0 && settings.activeAIProvider !== null;
  const activeKey = settings.aiKeys.find(k => k.provider === settings.activeAIProvider);

  const filtered = favorites.filter(r => {
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.cuisine?.toLowerCase().includes(search.toLowerCase()) ||
      r.mealType?.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (!inHousehold || favFilter === 'all') return true;
    if (favFilter === 'mine') return (r as any).addedBy === currentUserId;
    if (favFilter === 'household') return (r as any).addedBy && (r as any).addedBy !== currentUserId;
    return true;
  });

  const addToShoppingList = (recipe: Recipe) => {
    const items: ShoppingItem[] = recipe.ingredients.map((ing, i) => ({
      id: `shop-${Date.now()}-${i}`, name: ing, quantity: '', checked: false, category: 'Favorites',
    }));
    onAddToShoppingList(items);
    showToast?.(`${items.length} ingredients added to shopping list`);
  };

  const handleAIComplete = async () => {
    if (!activeKey) return;
    setAiLoading(true); setAiError(null); setAiPreview(null);
    try {
      const ingredients = form.ingredientsRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const instructions = form.instructionsRaw.split('\n').map(s => s.trim()).filter(Boolean);
      const prompt = `I have a recipe and need you to complete any missing details and calculate accurate nutrition macros.

Recipe Name: ${form.name || 'Unknown'}
Description: ${form.description || '(generate a short 1-2 sentence description)'}
Ingredients: ${ingredients.length > 0 ? ingredients.join(', ') : '(not provided — infer from recipe name)'}
Instructions: ${instructions.length > 0 ? instructions.join(' | ') : '(not provided — generate step-by-step)'}
Cook Time: ${form.cookTime || '(estimate)'}
Servings: ${form.servings || '4'}
Cuisine: ${form.cuisine || '(determine from recipe)'}
Difficulty: ${form.difficulty || '(determine from recipe)'}
Spice Level: ${form.spiceLevel || '(determine from recipe)'}
Meal Type: ${form.mealType || '(determine from recipe)'}
Cooking Method: ${form.cookingMethod || '(determine from recipe)'}
Kid Friendly: ${form.kidFriendly}

Return a single JSON object with ALL these fields filled in (use the provided values when available, fill in anything missing):
{
  "name": string,
  "description": string (1-2 sentences),
  "ingredients": string[] (array of strings with quantities),
  "instructions": string[] (array of step strings),
  "cookTime": string (e.g. "30 min"),
  "servings": number,
  "cuisine": string,
  "difficulty": "Easy" | "Medium" | "Hard",
  "spiceLevel": "Mild" | "Medium" | "Hot" | "Extra Hot",
  "mealType": string,
  "cookingMethod": string,
  "kidFriendly": boolean,
  "macros": { "calories": number, "protein": number, "carbs": number, "fat": number, "fiber": number }
}`;

      const text = await callAI(activeKey.provider, activeKey.key, prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse AI response');
      const parsed = JSON.parse(jsonMatch[0]);
      const preview: Recipe = {
        id: `custom-${Date.now()}`,
        name: parsed.name || form.name,
        description: parsed.description || '',
        ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
        instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
        cookTime: parsed.cookTime || form.cookTime || '?',
        difficulty: parsed.difficulty || 'Easy',
        mealType: parsed.mealType || 'dinner',
        cuisine: parsed.cuisine || 'Other',
        cookingMethod: parsed.cookingMethod || 'Stovetop',
        servings: Number(parsed.servings) || 4,
        spiceLevel: parsed.spiceLevel || 'Mild',
        kidFriendly: !!parsed.kidFriendly,
        macros: {
          calories: Number(parsed.macros?.calories) || 0,
          protein: Number(parsed.macros?.protein) || 0,
          carbs: Number(parsed.macros?.carbs) || 0,
          fat: Number(parsed.macros?.fat) || 0,
          fiber: Number(parsed.macros?.fiber) || 0,
        },
      };
      setAiPreview(preview);
    } catch (err: any) {
      setAiError(err.message || 'Something went wrong');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveCustom = (recipe: Recipe) => {
    onAddCustomRecipe(recipe);
    setShowAddDialog(false);
    setForm(emptyForm);
    setAiPreview(null);
    setAiError(null);
    showToast?.('Recipe saved to favorites');
  };

  const handleSaveManual = () => {
    if (!form.name.trim()) return;
    const ingredients = form.ingredientsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const instructions = form.instructionsRaw.split('\n').map(s => s.trim()).filter(Boolean);
    const recipe: Recipe = {
      id: `custom-${Date.now()}`,
      name: form.name.trim(),
      description: form.description.trim(),
      ingredients,
      instructions,
      cookTime: form.cookTime || '?',
      difficulty: form.difficulty || 'Easy',
      mealType: form.mealType || 'dinner',
      cuisine: form.cuisine || 'Other',
      cookingMethod: form.cookingMethod || 'Stovetop',
      servings: Number(form.servings) || 4,
      spiceLevel: form.spiceLevel || 'Mild',
      kidFriendly: form.kidFriendly,
      macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    };
    handleSaveCustom(recipe);
  };

  const setField = (k: keyof typeof form, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Favorites</h2>
          <p className="text-sm text-muted-foreground">{favorites.length} saved recipes</p>
        </div>
        <Button size="sm" onClick={() => { setShowAddDialog(true); setAiPreview(null); setAiError(null); setForm(emptyForm); }}
          className="bg-primary text-primary-foreground text-xs gap-1.5 shrink-0">
          ✏️ Add My Recipe
        </Button>
      </div>

      {favorites.length > 0 && (
        <Input placeholder="Search favorites..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 text-sm bg-card/50" />
      )}

      {inHousehold && favorites.length > 0 && (
        <div className="flex gap-1">
          {(['all', 'mine', 'household'] as FavFilter[]).map(f => (
            <Button key={f} variant={favFilter === f ? 'default' : 'outline'} size="sm"
              onClick={() => setFavFilter(f)}
              className={`text-xs flex-1 h-8 capitalize ${favFilter === f ? 'bg-primary text-primary-foreground' : ''}`}>
              {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Household'}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map(recipe => (
          <Card key={recipe.id} className="border-border/50 bg-card/50 cursor-pointer hover:border-primary/30 transition-all" onClick={() => setSelected(recipe)}>
            <CardContent className="p-3.5">
              <h4 className="font-display font-bold text-sm leading-tight mb-1">{recipe.name}</h4>
              <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{recipe.description}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="secondary" className="text-[10px]">⏱ {recipe.cookTime}</Badge>
                <Badge variant="secondary" className="text-[10px]">🍽 {recipe.cuisine}</Badge>
                <Badge variant="secondary" className="text-[10px]">{recipe.difficulty}</Badge>
              </div>
              <div className="mt-2 flex gap-2 text-[10px] text-muted-foreground">
                <span className="text-orange-400">{recipe.macros.calories} cal</span>
                <span className="text-blue-400">{recipe.macros.protein}g P</span>
                <span className="text-yellow-400">{recipe.macros.carbs}g C</span>
                <span className="text-red-400">{recipe.macros.fat}g F</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {favorites.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-4xl mb-3">❤️</p>
          <p className="text-sm">No favorites yet</p>
          <p className="text-xs mt-1 opacity-70">Heart recipes from Chef AI or add your own above!</p>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg">{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground text-xs">{selected.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">⏱ {selected.cookTime}</Badge>
                  <Badge variant="secondary" className="text-[10px]">📊 {selected.difficulty}</Badge>
                  <Badge variant="secondary" className="text-[10px]">🍽 {selected.cuisine}</Badge>
                  <Badge variant="secondary" className="text-[10px]">🔥 {selected.spiceLevel}</Badge>
                  <Badge variant="secondary" className="text-[10px]">👥 {selected.servings} servings</Badge>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'Cal', val: selected.macros.calories, color: 'text-orange-400' },
                    { label: 'Protein', val: `${selected.macros.protein}g`, color: 'text-blue-400' },
                    { label: 'Carbs', val: `${selected.macros.carbs}g`, color: 'text-yellow-400' },
                    { label: 'Fat', val: `${selected.macros.fat}g`, color: 'text-red-400' },
                    { label: 'Fiber', val: `${selected.macros.fiber}g`, color: 'text-green-400' },
                  ].map(m => (
                    <div key={m.label} className="text-center p-1.5 rounded bg-secondary/50">
                      <p className={`text-xs font-bold ${m.color}`}>{m.val}</p>
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
                <Separator className="opacity-50" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingredients</p>
                  <ul className="space-y-0.5">
                    {selected.ingredients.map((ing, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">●</span>{ing}</li>)}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Instructions</p>
                  <ol className="space-y-1.5">
                    {selected.instructions.map((step, i) => (
                      <li key={i} className="text-xs flex gap-2">
                        <span className="w-4 h-4 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">{i + 1}</span>
                        <span>{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" onClick={() => { onCook(selected); setSelected(null); }} className="text-xs h-7 bg-primary text-primary-foreground">👨‍🍳 Let's Cook!</Button>
                  <Button variant="outline" size="sm" onClick={() => { setPlanRecipe(selected); setSelected(null); }} className="text-xs h-7">📅 Add to Plan</Button>
                  <Button variant="outline" size="sm" onClick={() => addToShoppingList(selected)} className="text-xs h-7">🛒 Ingredients → List</Button>
                  <Button variant="outline" size="sm" onClick={() => { setEditRecipe(selected); setSelected(null); }} className="text-xs h-7">✏️ Edit</Button>
                  <Button variant="destructive" size="sm" onClick={() => { onRemove(selected.id); setSelected(null); }} className="text-xs h-7">Remove</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Custom Recipe Dialog */}
      <Dialog open={showAddDialog} onOpenChange={open => { if (!open) { setShowAddDialog(false); setAiPreview(null); setAiError(null); } }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">✏️ Add My Recipe</DialogTitle>
          </DialogHeader>

          {!aiPreview ? (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">Fill in what you know — AI will complete any missing details and calculate macros.</p>

              <div className="space-y-1">
                <label className="text-xs font-medium">Recipe Name <span className="text-destructive">*</span></label>
                <Input placeholder="e.g. Grandma's Chicken Soup" value={form.name} onChange={e => setField('name', e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Input placeholder="Short description..." value={form.description} onChange={e => setField('description', e.target.value)} className="h-9 text-sm bg-background/50" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Ingredients <span className="text-muted-foreground font-normal">(one per line)</span></label>
                <Textarea placeholder={"2 cups flour\n1 tsp salt\n3 eggs..."} value={form.ingredientsRaw} onChange={e => setField('ingredientsRaw', e.target.value)} className="min-h-[90px] text-sm bg-background/50 resize-none" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Instructions <span className="text-muted-foreground font-normal">(one step per line)</span></label>
                <Textarea placeholder={"Preheat oven to 350°F\nMix dry ingredients\n..."} value={form.instructionsRaw} onChange={e => setField('instructionsRaw', e.target.value)} className="min-h-[90px] text-sm bg-background/50 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Cook Time</label>
                  <Input placeholder="e.g. 30 min" value={form.cookTime} onChange={e => setField('cookTime', e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Servings</label>
                  <Input type="number" min={1} max={20} value={form.servings} onChange={e => setField('servings', e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium">Cuisine</label>
                  <Input placeholder="e.g. Italian" value={form.cuisine} onChange={e => setField('cuisine', e.target.value)} className="h-9 text-sm bg-background/50" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium">Difficulty</label>
                  <Select value={form.difficulty} onValueChange={v => setField('difficulty', v)}>
                    <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {['Easy', 'Medium', 'Hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="kidFriendly" checked={form.kidFriendly} onChange={e => setField('kidFriendly', e.target.checked)} className="w-4 h-4 accent-primary" />
                <label htmlFor="kidFriendly" className="text-xs">Kid-friendly</label>
              </div>

              {aiError && <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">{aiError}</p>}

              <div className="flex gap-2 pt-1">
                {hasAPIKey ? (
                  <Button onClick={handleAIComplete} disabled={!form.name.trim() || aiLoading}
                    className="flex-1 bg-primary text-primary-foreground text-xs h-9 gap-1.5">
                    {aiLoading ? <><span className="animate-spin">⏳</span> AI is completing...</> : `✨ Complete with ${activeKey ? PROVIDER_LABELS[activeKey.provider] : 'AI'}`}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground flex-1">Add an AI key in Settings to auto-complete macros & missing fields.</p>
                )}
                <Button variant="outline" onClick={handleSaveManual} disabled={!form.name.trim()} className="text-xs h-9">
                  Save As-Is
                </Button>
              </div>
            </div>
          ) : (
            // AI Preview
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
                <span className="text-lg">✨</span>
                <p className="text-xs text-primary font-medium">AI completed your recipe! Review and save.</p>
              </div>

              <div>
                <p className="font-display font-bold text-base">{aiPreview.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{aiPreview.description}</p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px]">⏱ {aiPreview.cookTime}</Badge>
                <Badge variant="secondary" className="text-[10px]">📊 {aiPreview.difficulty}</Badge>
                <Badge variant="secondary" className="text-[10px]">🍽 {aiPreview.cuisine}</Badge>
                <Badge variant="secondary" className="text-[10px]">👥 {aiPreview.servings} servings</Badge>
                {aiPreview.kidFriendly && <Badge variant="secondary" className="text-[10px]">👶 Kid-friendly</Badge>}
              </div>

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Nutrition per serving</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { label: 'Cal', val: aiPreview.macros.calories, unit: '', color: 'text-orange-400' },
                    { label: 'Protein', val: aiPreview.macros.protein, unit: 'g', color: 'text-blue-400' },
                    { label: 'Carbs', val: aiPreview.macros.carbs, unit: 'g', color: 'text-yellow-400' },
                    { label: 'Fat', val: aiPreview.macros.fat, unit: 'g', color: 'text-red-400' },
                    { label: 'Fiber', val: aiPreview.macros.fiber, unit: 'g', color: 'text-green-400' },
                  ].map(m => (
                    <div key={m.label} className="text-center p-1.5 rounded bg-secondary/50">
                      <p className={`text-xs font-bold ${m.color}`}>{m.val}{m.unit}</p>
                      <p className="text-[9px] text-muted-foreground">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="opacity-50" />

              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingredients ({aiPreview.ingredients.length})</p>
                <ul className="space-y-0.5">
                  {aiPreview.ingredients.slice(0, 5).map((ing, i) => <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">●</span>{ing}</li>)}
                  {aiPreview.ingredients.length > 5 && <li className="text-xs text-muted-foreground">+{aiPreview.ingredients.length - 5} more...</li>}
                </ul>
              </div>

              <div className="flex gap-2 pt-1">
                <Button onClick={() => handleSaveCustom(aiPreview)} className="flex-1 bg-primary text-primary-foreground text-xs h-9 gap-1">
                  ❤️ Save to Favorites
                </Button>
                <Button variant="outline" onClick={() => setAiPreview(null)} className="text-xs h-9">
                  ← Edit
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PlanDialog
        recipe={planRecipe}
        open={!!planRecipe}
        onClose={() => setPlanRecipe(null)}
        onAdd={(entries) => { onAddToMealPlan(entries); showToast?.('Added to meal plan'); }}
      />

      <RecipeEditDialog
        recipe={editRecipe}
        open={!!editRecipe}
        onClose={() => setEditRecipe(null)}
        onSave={(updated) => { onUpdate(updated); showToast?.('Recipe updated'); }}
      />
    </div>
  );
}

