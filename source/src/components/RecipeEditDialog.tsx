import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Recipe } from '@/types';

interface RecipeEditDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
  onSave: (updated: Recipe) => void;
}

export function RecipeEditDialog({ recipe, open, onClose, onSave }: RecipeEditDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ingredientsRaw, setIngredientsRaw] = useState('');
  const [instructionsRaw, setInstructionsRaw] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [servings, setServings] = useState('4');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState('Easy');
  const [spiceLevel, setSpiceLevel] = useState('Mild');
  const [mealType, setMealType] = useState('dinner');
  const [cookingMethod, setCookingMethod] = useState('');
  const [kidFriendly, setKidFriendly] = useState(false);
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');

  // Populate fields when recipe changes
  useEffect(() => {
    if (!recipe) return;
    setName(recipe.name);
    setDescription(recipe.description || '');
    setIngredientsRaw(recipe.ingredients.join('\n'));
    setInstructionsRaw(recipe.instructions.join('\n'));
    setCookTime(recipe.cookTime || '');
    setServings(String(recipe.servings || 4));
    setCuisine(recipe.cuisine || '');
    setDifficulty(recipe.difficulty || 'Easy');
    setSpiceLevel(recipe.spiceLevel || 'Mild');
    setMealType(recipe.mealType || 'dinner');
    setCookingMethod(recipe.cookingMethod || '');
    setKidFriendly(!!recipe.kidFriendly);
    setCalories(String(recipe.macros?.calories || ''));
    setProtein(String(recipe.macros?.protein || ''));
    setCarbs(String(recipe.macros?.carbs || ''));
    setFat(String(recipe.macros?.fat || ''));
    setFiber(String(recipe.macros?.fiber || ''));
  }, [recipe]);

  const handleSave = () => {
    if (!recipe || !name.trim()) return;
    const updated: Recipe = {
      ...recipe,
      name: name.trim(),
      description: description.trim(),
      ingredients: ingredientsRaw.split('\n').map(s => s.trim()).filter(Boolean),
      instructions: instructionsRaw.split('\n').map(s => s.trim()).filter(Boolean),
      cookTime: cookTime.trim(),
      servings: parseInt(servings) || 4,
      cuisine: cuisine.trim(),
      difficulty,
      spiceLevel,
      mealType,
      cookingMethod: cookingMethod.trim(),
      kidFriendly,
      macros: {
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        fat: parseFloat(fat) || 0,
        fiber: parseFloat(fiber) || 0,
      },
    };
    onSave(updated);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">✏️ Edit Recipe</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="text-xs font-medium">Name <span className="text-destructive">*</span></label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 text-sm bg-background/50" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Ingredients <span className="text-muted-foreground font-normal">(one per line)</span></label>
            <Textarea value={ingredientsRaw} onChange={e => setIngredientsRaw(e.target.value)} className="min-h-[100px] text-sm bg-background/50 resize-none" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Instructions <span className="text-muted-foreground font-normal">(one step per line)</span></label>
            <Textarea value={instructionsRaw} onChange={e => setInstructionsRaw(e.target.value)} className="min-h-[100px] text-sm bg-background/50 resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Cook Time</label>
              <Input value={cookTime} onChange={e => setCookTime(e.target.value)} placeholder="e.g. 30 min" className="h-9 text-sm bg-background/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Servings</label>
              <Input type="number" min={1} max={20} value={servings} onChange={e => setServings(e.target.value)} className="h-9 text-sm bg-background/50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Cuisine</label>
              <Input value={cuisine} onChange={e => setCuisine(e.target.value)} className="h-9 text-sm bg-background/50" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Easy','Medium','Hard'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium">Spice Level</label>
              <Select value={spiceLevel} onValueChange={setSpiceLevel}>
                <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Mild','Medium','Hot','Extra Hot'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Meal Type</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['breakfast','lunch','dinner','snack'].map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Cooking Method</label>
            <Input value={cookingMethod} onChange={e => setCookingMethod(e.target.value)} placeholder="e.g. Stovetop, Oven..." className="h-9 text-sm bg-background/50" />
          </div>

          <div>
            <p className="text-xs font-medium mb-1.5">Macros per serving</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: 'Cal', value: calories, set: setCalories, color: 'text-orange-400' },
                { label: 'Protein', value: protein, set: setProtein, color: 'text-blue-400' },
                { label: 'Carbs', value: carbs, set: setCarbs, color: 'text-yellow-400' },
                { label: 'Fat', value: fat, set: setFat, color: 'text-red-400' },
                { label: 'Fiber', value: fiber, set: setFiber, color: 'text-green-400' },
              ].map(m => (
                <div key={m.label} className="space-y-0.5">
                  <p className={`text-[10px] font-medium ${m.color} text-center`}>{m.label}</p>
                  <Input
                    type="number"
                    min={0}
                    value={m.value}
                    onChange={e => m.set(e.target.value)}
                    className="h-8 text-xs bg-background/50 text-center px-1"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-kid-friendly" checked={kidFriendly} onChange={e => setKidFriendly(e.target.checked)} className="w-4 h-4 accent-primary" />
            <label htmlFor="edit-kid-friendly" className="text-xs">Kid-friendly</label>
          </div>

          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={!name.trim()} className="flex-1 bg-primary text-primary-foreground text-xs h-9">
              Save Changes
            </Button>
            <Button variant="outline" onClick={onClose} className="text-xs h-9">Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
