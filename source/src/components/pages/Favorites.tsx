import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { Recipe, MealPlanEntry, ShoppingItem } from '@/types';

interface FavoritesProps {
  favorites: Recipe[];
  onRemove: (id: string) => void;
  onAddToMealPlan: (entry: MealPlanEntry) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  currentUserId?: string;
  inHousehold?: boolean;
  getMemberName?: (uid?: string) => string;
  getMemberColor?: (uid?: string) => string;
}

type FavFilter = 'all' | 'mine' | 'household';

export function Favorites({ favorites, onRemove, onAddToMealPlan, onAddToShoppingList, currentUserId, inHousehold, getMemberName, getMemberColor }: FavoritesProps) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Recipe | null>(null);
  const [favFilter, setFavFilter] = useState<FavFilter>('all');

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

  const addToMealPlan = (recipe: Recipe, meal: string) => {
    const today = new Date().toISOString().split('T')[0];
    onAddToMealPlan({
      id: `mp-${Date.now()}`,
      date: today,
      mealType: meal as any,
      recipe,
    });
  };

  const addToShoppingList = (recipe: Recipe) => {
    const items: ShoppingItem[] = recipe.ingredients.map((ing, i) => ({
      id: `shop-${Date.now()}-${i}`,
      name: ing,
      quantity: '',
      checked: false,
      category: 'Favorites',
    }));
    onAddToShoppingList(items);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Favorites</h2>
        <p className="text-sm text-muted-foreground">{favorites.length} saved recipes</p>
      </div>

      {favorites.length > 0 && (
        <Input
          placeholder="Search favorites..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-9 text-sm bg-card/50"
        />
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
          <Card
            key={recipe.id}
            className="border-border/50 bg-card/50 cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => setSelected(recipe)}
          >
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
          <p className="text-xs mt-1 opacity-70">Heart recipes from Chef AI to save them here!</p>
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

                {/* Macros */}
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

                {/* Ingredients */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingredients</p>
                  <ul className="space-y-0.5">
                    {selected.ingredients.map((ing, i) => (
                      <li key={i} className="text-xs flex gap-1.5"><span className="text-primary">●</span>{ing}</li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
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

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="flex gap-1">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(m => (
                      <Button key={m} variant="outline" size="sm" onClick={() => addToMealPlan(selected, m)} className="text-[10px] h-7 capitalize">
                        📅 {m}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => addToShoppingList(selected)} className="text-xs h-7">
                    🛒 Ingredients → List
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => { onRemove(selected.id); setSelected(null); }} className="text-xs h-7">
                    Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
