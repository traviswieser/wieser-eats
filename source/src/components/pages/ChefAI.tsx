import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { PantryItem, Recipe, MealPlanEntry, ShoppingItem, UserSettings, AIFilters, AIProvider } from '@/types';

interface ChefAIProps {
  pantry: PantryItem[];
  settings: UserSettings;
  onAddFavorite: (recipe: Recipe) => void;
  onAddToMealPlan: (entry: MealPlanEntry) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  isFavorite: (id: string) => boolean;
  onGoToSettings: () => void;
}

const defaultFilters: AIFilters = {
  mealType: 'any', cookTime: 'any', difficulty: 'any', cuisine: 'any',
  cookingMethod: 'any', servings: 4, spiceLevel: 'any',
};

const CUISINES = ['Any','American','Mexican','Italian','Chinese','Japanese','Indian','Thai','Mediterranean','Korean','French','Greek','Southern/BBQ'];
const METHODS = ['Any','Stovetop','Oven/Bake','Grill','Air Fryer','Slow Cooker','Instant Pot','No-Cook','Sous Vide','Smoker'];
const PROTEINS = ['Chicken','Beef','Ground Beef','Pork','Salmon','Shrimp','Turkey','Tofu','Eggs'];

const PROVIDER_LABELS: Record<AIProvider, string> = { grok: 'Groq', gemini: 'Gemini', claude: 'Claude', openai: 'OpenAI' };

async function callAI(provider: AIProvider, apiKey: string, messages: any[], hasImage: boolean): Promise<string> {
  let url = '', headers: Record<string,string> = {}, body: any = {};
  const systemPrompt = 'You are a professional chef assistant. Return ONLY valid JSON (no markdown, no backticks, no extra text).';

  if (provider === 'grok') {
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model: 'llama-3.3-70b-versatile', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 4000 };
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions';
    headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    body = { model: hasImage ? 'gpt-4o' : 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 4000 };
  } else if (provider === 'gemini') {
    url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    const parts = messages[0].content;
    const geminiParts = typeof parts === 'string'
      ? [{ text: systemPrompt + '\n\n' + parts }]
      : parts.map((p: any) => p.type === 'text' ? { text: systemPrompt + '\n\n' + p.text } : { inline_data: { mime_type: p.image_url?.url?.split(';')[0]?.split(':')[1] || 'image/jpeg', data: p.image_url?.url?.split(',')[1] || '' } });
    body = { contents: [{ parts: geminiParts }], generationConfig: { maxOutputTokens: 4000 } };
  } else if (provider === 'claude') {
    url = 'https://api.anthropic.com/v1/messages';
    headers = { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2024-01-01', 'anthropic-dangerous-direct-browser-access': 'true' };
    const content = messages[0].content;
    const claudeContent = typeof content === 'string' ? content
      : content.map((p: any) => p.type === 'text' ? { type: 'text', text: p.text } : { type: 'image', source: { type: 'base64', media_type: p.image_url?.url?.split(';')[0]?.split(':')[1] || 'image/jpeg', data: p.image_url?.url?.split(',')[1] || '' } });
    body = { model: 'claude-sonnet-4-20250514', max_tokens: 4000, system: systemPrompt, messages: [{ role: 'user', content: claudeContent }] };
  }

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) { const err = await res.text(); throw new Error(`${PROVIDER_LABELS[provider]} error ${res.status}: ${err.slice(0, 200)}`); }
  const data = await res.json();

  if (provider === 'gemini') return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (provider === 'claude') return data.content?.map((b: any) => b.text || '').join('') || '';
  return data.choices?.[0]?.message?.content || '';
}

export function ChefAI({ pantry, settings, onAddFavorite, onAddToMealPlan, onAddToShoppingList, isFavorite, onGoToSettings }: ChefAIProps) {
  const [filters, setFilters] = useState<AIFilters>({ ...defaultFilters, servings: settings.defaultServings });
  const [query, setQuery] = useState('');
  const [selectedProteins, setSelectedProteins] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasAPIKey = settings.aiKeys.length > 0 && settings.activeAIProvider !== null;
  const activeKey = settings.aiKeys.find(k => k.provider === settings.activeAIProvider);

  const toggleProtein = (p: string) => setSelectedProteins(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const buildPrompt = () => {
    let p = 'Generate exactly 3 recipe suggestions as a JSON array. Each recipe object must have: "name" (string), "description" (1-2 sentences), "ingredients" (array of strings with quantities), "instructions" (array of step strings), "cookTime" (e.g. "30 min"), "difficulty" (Easy/Medium/Hard), "mealType", "cuisine", "cookingMethod", "servings" (number), "spiceLevel" (Mild/Medium/Hot/Extra Hot), "macros" (object: calories, protein, carbs, fat, fiber as numbers per serving), "kidFriendly" (boolean).\n\n';
    if (query) p += `User request: ${query}\n`;
    if (selectedProteins.length > 0) p += `Main proteins: ${selectedProteins.join(', ')}\n`;
    if (pantry.length > 0) p += `Available pantry: ${pantry.map(i => `${i.name} (${i.quantity})`).join(', ')}\nUse pantry items when possible.\n`;
    if (filters.mealType !== 'any') p += `Meal: ${filters.mealType}\n`;
    if (filters.cookTime !== 'any') p += `Max cook time: ${filters.cookTime}\n`;
    if (filters.difficulty !== 'any') p += `Difficulty: ${filters.difficulty}\n`;
    if (filters.cuisine !== 'any') p += `Cuisine: ${filters.cuisine}\n`;
    if (filters.cookingMethod !== 'any') p += `Method: ${filters.cookingMethod}\n`;
    if (filters.spiceLevel !== 'any') p += `Spice: ${filters.spiceLevel}\n`;
    p += `Servings: ${filters.servings}\n`;
    if (settings.allergies.length > 0) p += `AVOID allergies: ${settings.allergies.join(', ')}\n`;
    if (settings.dietType !== 'none') p += `Diet: ${settings.dietType}\n`;
    if (settings.kidFriendly) p += 'Must be kid-friendly.\n';
    return p;
  };

  const askAI = async () => {
    if (!activeKey) return;
    setLoading(true); setError(null); setRecipes([]);
    try {
      const hasImage = !!photoPreview;
      let content: any;
      if (photoPreview) {
        content = [
          { type: 'image_url', image_url: { url: photoPreview } },
          { type: 'text', text: 'Identify all visible food ingredients. Then, ' + buildPrompt() },
        ];
      } else {
        content = buildPrompt();
      }
      const text = await callAI(activeKey.provider, activeKey.key, [{ role: 'user', content }], hasImage);
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('Could not parse recipe response');
      const parsed = JSON.parse(jsonMatch[0]);
      setRecipes(parsed.map((r: any, i: number) => ({
        ...r, id: `recipe-${Date.now()}-${i}`,
        macros: r.macros || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      })));
    } catch (err: any) { setError(err.message || 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  const addRecipeToMealPlan = (recipe: Recipe, mealSlot: string) => {
    onAddToMealPlan({ id: `mp-${Date.now()}`, date: new Date().toISOString().split('T')[0], mealType: mealSlot as any, recipe });
  };
  const addMissingToShoppingList = (recipe: Recipe) => {
    const pantryNames = pantry.map(p => p.name.toLowerCase());
    const missing = recipe.ingredients.filter(ing => !pantryNames.some(pn => ing.toLowerCase().includes(pn)));
    onAddToShoppingList(missing.map((ing, i) => ({ id: `shop-${Date.now()}-${i}`, name: ing, quantity: '', checked: false, category: 'Recipe Ingredients' })));
  };

  return (
    <div className="space-y-4">
      <div className="text-center py-4">
        <h2 className="font-display text-2xl sm:text-3xl font-bold mb-1">What should we cook<span className="text-primary">?</span></h2>
        <p className="text-muted-foreground text-sm">Tell me what you have or what you're craving</p>
      </div>

      {/* API Key Setup Banner */}
      {!hasAPIKey && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-3xl">🔑</p>
            <p className="font-display font-bold text-sm">Set up your AI to get started</p>
            <p className="text-xs text-muted-foreground">You need an API key to generate recipe suggestions. Grok is free!</p>
            <Button size="sm" onClick={onGoToSettings} className="bg-primary text-primary-foreground text-xs font-semibold">
              Go to Settings → AI Keys
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active Provider Badge */}
      {hasAPIKey && activeKey && (
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            {activeKey.provider === 'grok' ? '⚡' : '💲'} Using {PROVIDER_LABELS[activeKey.provider]}
          </Badge>
        </div>
      )}

      {/* Input Area */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <Textarea placeholder="e.g. I have chicken thighs and want something quick" value={query} onChange={e => setQuery(e.target.value)} className="min-h-[80px] bg-background/50 resize-none border-border/50 text-sm" />
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs gap-1.5">📸 Upload Photo</Button>
            {photoPreview && (
              <div className="flex items-center gap-2">
                <img src={photoPreview} alt="upload" className="w-10 h-10 rounded-lg object-cover border border-border" />
                <button onClick={() => { setPhotoPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="text-xs text-destructive hover:underline">Remove</button>
              </div>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2 font-medium">Quick protein select:</p>
            <div className="flex flex-wrap gap-1.5">
              {PROTEINS.map(p => (
                <Badge key={p} variant={selectedProteins.includes(p) ? 'default' : 'outline'}
                  className={`cursor-pointer text-xs transition-all ${selectedProteins.includes(p) ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'hover:bg-secondary'}`}
                  onClick={() => toggleProtein(p)}>{p}</Badge>
              ))}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="text-xs text-muted-foreground w-full">
            {showFilters ? '▾ Hide Filters' : '▸ More Filters (cuisine, cook time, method...)'}
          </Button>
          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <FilterSelect label="Meal Type" value={filters.mealType} onChange={v => setFilters({...filters, mealType: v})} options={[['any','Any'],['breakfast','Breakfast'],['lunch','Lunch'],['dinner','Dinner'],['snack','Snack']]} />
              <FilterSelect label="Cook Time" value={filters.cookTime} onChange={v => setFilters({...filters, cookTime: v})} options={[['any','Any'],['15 minutes','Under 15 min'],['30 minutes','Under 30 min'],['45 minutes','Under 45 min'],['60 minutes','Under 1 hour'],['120 minutes','1-2 hours']]} />
              <FilterSelect label="Difficulty" value={filters.difficulty} onChange={v => setFilters({...filters, difficulty: v})} options={[['any','Any'],['Easy','Easy'],['Medium','Medium'],['Hard','Hard']]} />
              <FilterSelect label="Cuisine" value={filters.cuisine} onChange={v => setFilters({...filters, cuisine: v})} options={CUISINES.map(c => [c.toLowerCase(), c])} />
              <FilterSelect label="Cooking Method" value={filters.cookingMethod} onChange={v => setFilters({...filters, cookingMethod: v})} options={METHODS.map(m => [m.toLowerCase(), m])} />
              <FilterSelect label="Spice Level" value={filters.spiceLevel} onChange={v => setFilters({...filters, spiceLevel: v})} options={[['any','Any'],['Mild','Mild'],['Medium','Medium'],['Hot','Hot 🌶️'],['Extra Hot','Extra Hot 🔥']]} />
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Servings</label>
                <Input type="number" min={1} max={20} value={filters.servings} onChange={e => setFilters({...filters, servings: parseInt(e.target.value) || 4})} className="h-9 text-xs bg-background/50" />
              </div>
            </div>
          )}
          <Button onClick={askAI} disabled={loading || !hasAPIKey} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-display font-semibold text-sm tracking-wide">
            {loading ? <span className="flex items-center gap-2"><span className="animate-spin">⏳</span> Finding recipes...</span> : "🍳 What Should I Cook?"}
          </Button>
        </CardContent>
      </Card>

      {error && <Card className="border-destructive/50 bg-destructive/5"><CardContent className="p-3"><p className="text-sm text-destructive">{error}</p></CardContent></Card>}

      {recipes.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display font-bold text-lg">Here's what I'd make 👇</h3>
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} expanded={expandedRecipe === recipe.id}
              onToggle={() => setExpandedRecipe(expandedRecipe === recipe.id ? null : recipe.id)}
              onFavorite={() => onAddFavorite(recipe)} isFavorite={isFavorite(recipe.id)}
              onAddToMealPlan={addRecipeToMealPlan} onAddToShoppingList={() => addMissingToShoppingList(recipe)}
              showImage={settings.aiImageGen ?? false} />
          ))}
        </div>
      )}

      {!loading && recipes.length === 0 && !error && hasAPIKey && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-4xl mb-3">🧑‍🍳</p>
          <p className="text-sm">Describe what you have, upload a photo, or just hit the button!</p>
          <p className="text-xs mt-1 opacity-70">Your pantry items will be included automatically</p>
        </div>
      )}
    </div>
  );
}

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

function RecipeCard({ recipe, expanded, onToggle, onFavorite, isFavorite, onAddToMealPlan, onAddToShoppingList, showImage }: {
  recipe: Recipe; expanded: boolean; onToggle: () => void; onFavorite: () => void; isFavorite: boolean;
  onAddToMealPlan: (recipe: Recipe, meal: string) => void; onAddToShoppingList: () => void; showImage: boolean;
}) {
  const imageUrl = showImage ? `https://image.pollinations.ai/prompt/${encodeURIComponent(`Professional food photography of ${recipe.name}, ${recipe.cuisine} cuisine, plated beautifully, warm lighting, top-down view`)}/width/400/height/240?nologo=true&seed=${recipe.id.replace(/\D/g,'').slice(0,6)}` : null;
  return (
    <Card className="border-border/50 bg-card/60 overflow-hidden transition-all hover:border-primary/30">
      <CardContent className="p-0">
        {imageUrl && (
          <div className="w-full h-36 bg-secondary/30 overflow-hidden">
            <img src={imageUrl} alt={recipe.name} className="w-full h-full object-cover" loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
        <button onClick={onToggle} className="w-full text-left p-4 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-base leading-tight">{recipe.name}</h4>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{recipe.description}</p>
            </div>
            <span className="text-lg shrink-0">{expanded ? '▾' : '▸'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <Badge variant="secondary" className="text-[10px] font-normal">⏱ {recipe.cookTime}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">📊 {recipe.difficulty}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">🍽 {recipe.cuisine}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">🔥 {recipe.spiceLevel}</Badge>
            <Badge variant="secondary" className="text-[10px] font-normal">👥 {recipe.servings} servings</Badge>
            {recipe.kidFriendly && <Badge variant="secondary" className="text-[10px] font-normal">👶 Kid-friendly</Badge>}
          </div>
        </button>
        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            <Separator className="opacity-50" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Nutrition per serving</p>
              <div className="grid grid-cols-5 gap-2">
                {[{ label: 'Calories', value: recipe.macros.calories, unit: 'kcal', color: 'text-orange-400' },
                  { label: 'Protein', value: recipe.macros.protein, unit: 'g', color: 'text-blue-400' },
                  { label: 'Carbs', value: recipe.macros.carbs, unit: 'g', color: 'text-yellow-400' },
                  { label: 'Fat', value: recipe.macros.fat, unit: 'g', color: 'text-red-400' },
                  { label: 'Fiber', value: recipe.macros.fiber, unit: 'g', color: 'text-green-400' },
                ].map(m => (
                  <div key={m.label} className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[10px] font-normal opacity-70">{m.unit}</span></p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Ingredients</p>
              <ul className="space-y-1">{recipe.ingredients.map((ing, i) => <li key={i} className="text-sm flex items-start gap-2"><span className="text-primary mt-0.5 text-xs">●</span><span>{ing}</span></li>)}</ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Instructions</p>
              <ol className="space-y-2">{recipe.instructions.map((step, i) => (
                <li key={i} className="text-sm flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center font-bold mt-0.5">{i+1}</span>
                  <span>{step.replace(/^\d+[\.\)]\s*/, '')}</span>
                </li>
              ))}</ol>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant={isFavorite ? 'secondary' : 'outline'} onClick={onFavorite} className="text-xs gap-1" disabled={isFavorite}>{isFavorite ? '✓ Saved' : '❤️ Favorite'}</Button>
              <Dialog>
                <DialogTrigger asChild><Button size="sm" variant="outline" className="text-xs gap-1">📅 Add to Plan</Button></DialogTrigger>
                <DialogContent className="max-w-xs">
                  <DialogHeader><DialogTitle className="font-display">Add to Meal Plan</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {['breakfast','lunch','dinner','snack'].map(meal => <Button key={meal} variant="outline" onClick={() => onAddToMealPlan(recipe, meal)} className="capitalize text-sm">{meal}</Button>)}
                  </div>
                </DialogContent>
              </Dialog>
              <Button size="sm" variant="outline" onClick={onAddToShoppingList} className="text-xs gap-1">🛒 Missing → List</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
