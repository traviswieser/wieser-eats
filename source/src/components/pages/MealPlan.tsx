import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { MealPlanEntry, ShoppingItem } from '@/types';

const MEAL_TIMES: Record<string, { hour: number; label: string }> = {
  breakfast: { hour: 8, label: 'Breakfast' },
  lunch: { hour: 12, label: 'Lunch' },
  dinner: { hour: 18, label: 'Dinner' },
  snack: { hour: 15, label: 'Snack' },
};

function toICSDate(dateStr: string, hour: number): string {
  const d = new Date(dateStr + 'T00:00:00');
  d.setHours(hour, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function buildICSContent(entries: MealPlanEntry[]): string {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Wieser Eats//Meal Plan//EN\r\nCALSCALE:GREGORIAN\r\n';
  for (const e of entries) {
    const mt = MEAL_TIMES[e.mealType] || MEAL_TIMES.dinner;
    const start = toICSDate(e.date, mt.hour);
    const end = toICSDate(e.date, mt.hour + 1);
    const desc = `${e.recipe.cookTime} | ${e.recipe.difficulty} | ${e.recipe.cuisine}\\n\\nIngredients:\\n${e.recipe.ingredients.join('\\n')}`;
    ics += `BEGIN:VEVENT\r\nDTSTART:${start}\r\nDTEND:${end}\r\nSUMMARY:${mt.label}: ${e.recipe.name}\r\nDESCRIPTION:${desc}\r\nEND:VEVENT\r\n`;
  }
  return ics + 'END:VCALENDAR\r\n';
}

function downloadICS(entries: MealPlanEntry[]) {
  const blob = new Blob([buildICSContent(entries)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'wieser-eats-meals.ics';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToGoogleCalendar(entries: MealPlanEntry[], days: { date: string }[]) {
  for (const e of entries.slice(0, 5)) {
    const mt = MEAL_TIMES[e.mealType] || MEAL_TIMES.dinner;
    const start = toICSDate(e.date, mt.hour);
    const end = toICSDate(e.date, mt.hour + 1);
    const title = encodeURIComponent(`${mt.label}: ${e.recipe.name}`);
    const details = encodeURIComponent(`${e.recipe.cookTime} | ${e.recipe.difficulty}\n\nIngredients:\n${e.recipe.ingredients.join('\n')}`);
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`, '_blank');
  }
  if (entries.length > 5) alert(`Opened 5 of ${entries.length} events. For all events, use the .ics download option.`);
}

function exportToOutlookCalendar(entries: MealPlanEntry[], days: { date: string }[]) {
  for (const e of entries.slice(0, 5)) {
    const mt = MEAL_TIMES[e.mealType] || MEAL_TIMES.dinner;
    const d = new Date(e.date + 'T00:00:00');
    d.setHours(mt.hour);
    const startISO = d.toISOString();
    d.setHours(mt.hour + 1);
    const endISO = d.toISOString();
    const title = encodeURIComponent(`${mt.label}: ${e.recipe.name}`);
    const body = encodeURIComponent(`${e.recipe.cookTime} | ${e.recipe.difficulty}\n\nIngredients:\n${e.recipe.ingredients.join('\n')}`);
    window.open(`https://outlook.live.com/calendar/0/action/compose?subject=${title}&startdt=${startISO}&enddt=${endISO}&body=${body}`, '_blank');
  }
  if (entries.length > 5) alert(`Opened 5 of ${entries.length} events. For all events, use the .ics download option.`);
}

interface MealPlanProps {
  mealPlan: MealPlanEntry[];
  onRemove: (id: string) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  onAdd: (entry: MealPlanEntry) => void;
}

const MEAL_SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

function getWeekDays(offset: number = 0): { date: string; label: string; day: string; isToday: boolean }[] {
  const days = [];
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() + (offset * 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      isToday: dateStr === today.toISOString().split('T')[0],
    });
  }
  return days;
}

export function MealPlan({ mealPlan, onRemove, onAddToShoppingList, onAdd }: MealPlanProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntry | null>(null);
  const [quickAdd, setQuickAdd] = useState<{ date: string; meal: string } | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickTime, setQuickTime] = useState('30 min');
  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

  const getEntries = (date: string, meal: string) => {
    return mealPlan.filter(e => e.date === date && e.mealType === meal);
  };

  const weekLabel = () => {
    if (weekOffset === 0) return 'This Week';
    if (weekOffset === 1) return 'Next Week';
    if (weekOffset === -1) return 'Last Week';
    return `${days[0].label} – ${days[6].label}`;
  };

  const weekEntries = mealPlan.filter(e => days.some(d => d.date === e.date));

  const handleQuickAdd = () => {
    if (!quickAdd || !quickName.trim()) return;
    const entry: MealPlanEntry = {
      id: `mp-${Date.now()}`,
      date: quickAdd.date,
      mealType: quickAdd.meal as any,
      recipe: {
        id: `quick-${Date.now()}`, name: quickName.trim(), description: 'Manually added meal',
        ingredients: [], instructions: [], cookTime: quickTime, difficulty: 'Easy',
        mealType: quickAdd.meal, cuisine: '', cookingMethod: '', servings: 4,
        spiceLevel: 'Mild', macros: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        kidFriendly: true,
      },
    };
    onAdd(entry);
    setQuickAdd(null);
    setQuickName('');
  };

  const addAllIngredientsToShoppingList = () => {
    const allIngredients = weekEntries.flatMap(e => e.recipe.ingredients);
    const unique = [...new Set(allIngredients)];
    const items: ShoppingItem[] = unique.map((ing, i) => ({
      id: `shop-${Date.now()}-${i}`,
      name: ing,
      quantity: '',
      checked: false,
      category: 'Meal Plan',
    }));
    onAddToShoppingList(items);
  };

  const weekMacros = useMemo(() => {
    return weekEntries.reduce(
      (acc, e) => ({
        calories: acc.calories + (e.recipe.macros?.calories || 0) * (e.recipe.servings || 1),
        protein: acc.protein + (e.recipe.macros?.protein || 0) * (e.recipe.servings || 1),
        carbs: acc.carbs + (e.recipe.macros?.carbs || 0) * (e.recipe.servings || 1),
        fat: acc.fat + (e.recipe.macros?.fat || 0) * (e.recipe.servings || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }, [weekEntries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Meal Planner</h2>
          <p className="text-sm text-muted-foreground">{weekLabel()}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o - 1)} className="h-8 w-8 p-0 text-xs">◀</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} className="h-8 px-2 text-xs">Today</Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(o => o + 1)} className="h-8 w-8 p-0 text-xs">▶</Button>
        </div>
      </div>

      {/* Week Macros Summary */}
      {weekMacros.calories > 0 && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Weekly Total (all servings)</p>
            <div className="flex gap-4 text-xs">
              <span className="text-orange-400 font-semibold">{weekMacros.calories.toLocaleString()} cal</span>
              <span className="text-blue-400">{weekMacros.protein}g protein</span>
              <span className="text-yellow-400">{weekMacros.carbs}g carbs</span>
              <span className="text-red-400">{weekMacros.fat}g fat</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar Grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {days.map(d => (
              <div
                key={d.date}
                className={`text-center p-2 rounded-lg text-xs ${
                  d.isToday ? 'bg-primary/15 text-primary font-bold' : 'text-muted-foreground'
                }`}
              >
                <div className="font-semibold">{d.day}</div>
                <div className="text-[10px] opacity-75">{d.label}</div>
              </div>
            ))}
          </div>

          {/* Meal Rows */}
          {MEAL_SLOTS.map(meal => (
            <div key={meal} className="mb-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-0.5 flex items-center gap-1">
                {MEAL_ICONS[meal]} {meal}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map(d => {
                  const entries = getEntries(d.date, meal);
                  return (
                    <button
                      key={`${d.date}-${meal}`}
                      onClick={() => entries.length > 0 ? setSelectedEntry(entries[0]) : setQuickAdd({ date: d.date, meal })}
                      className={`min-h-[52px] rounded-lg border text-[10px] p-1 text-left transition-colors ${
                        entries.length > 0
                          ? 'border-primary/30 bg-primary/5 hover:bg-primary/10'
                          : 'border-border/30 bg-card/20 hover:border-primary/20 hover:bg-primary/5'
                      }`}
                    >
                      {entries.length > 0 ? entries.map(entry => (
                        <div key={entry.id} className="p-0.5">
                          <p className="font-medium truncate leading-tight">{entry.recipe.name}</p>
                          <p className="text-muted-foreground opacity-75">{entry.recipe.cookTime}</p>
                        </div>
                      )) : (
                        <div className="flex items-center justify-center h-full opacity-0 hover:opacity-40 transition-opacity">
                          <span className="text-xs text-muted-foreground">+</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generate Shopping List */}
      <Button
        variant="outline"
        size="sm"
        onClick={addAllIngredientsToShoppingList}
        className="w-full text-xs"
        disabled={!mealPlan.some(e => days.some(d => d.date === e.date))}
      >
        🛒 Generate Shopping List from This Week
      </Button>

      {/* Calendar Sync */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            disabled={!mealPlan.some(e => days.some(d => d.date === e.date))}
          >
            📆 Sync Week to Calendar
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="font-display text-base">Sync to Calendar</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Export this week's meals to your calendar app.</p>
          <div className="space-y-2 pt-1">
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2" onClick={() => exportToGoogleCalendar(weekEntries, days)}>
              <span>📅</span> Google Calendar
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2" onClick={() => exportToOutlookCalendar(weekEntries, days)}>
              <span>📧</span> Outlook Calendar
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2" onClick={() => downloadICS(weekEntries)}>
              <span>🍎</span> Apple Calendar / Other (.ics)
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">Google & Outlook open in a new tab. The .ics file works with any calendar app.</p>
        </DialogContent>
      </Dialog>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-lg">{selectedEntry.recipe.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground text-xs">{selectedEntry.recipe.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">⏱ {selectedEntry.recipe.cookTime}</Badge>
                  <Badge variant="secondary" className="text-[10px]">📊 {selectedEntry.recipe.difficulty}</Badge>
                  <Badge variant="secondary" className="text-[10px]">🍽 {selectedEntry.recipe.cuisine}</Badge>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Macros per serving</p>
                  <div className="flex gap-3 text-xs">
                    <span className="text-orange-400">{selectedEntry.recipe.macros.calories} cal</span>
                    <span className="text-blue-400">{selectedEntry.recipe.macros.protein}g P</span>
                    <span className="text-yellow-400">{selectedEntry.recipe.macros.carbs}g C</span>
                    <span className="text-red-400">{selectedEntry.recipe.macros.fat}g F</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingredients</p>
                  <ul className="space-y-0.5">
                    {selectedEntry.recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <span className="text-primary">●</span> {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { onRemove(selectedEntry.id); setSelectedEntry(null); }}
                  className="text-xs w-full"
                >
                  Remove from Plan
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Quick Add Dialog */}
      <Dialog open={!!quickAdd} onOpenChange={open => { if (!open) setQuickAdd(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              Add {quickAdd ? MEAL_ICONS[quickAdd.meal] : ''} {quickAdd?.meal} meal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">What are you making?</label>
              <Input
                placeholder="e.g. Chicken stir fry"
                value={quickName}
                onChange={e => setQuickName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                className="h-9 text-sm bg-background/50"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cook time</label>
              <Input
                placeholder="e.g. 30 min"
                value={quickTime}
                onChange={e => setQuickTime(e.target.value)}
                className="h-9 text-sm bg-background/50"
              />
            </div>
            <Button onClick={handleQuickAdd} disabled={!quickName.trim()} className="w-full bg-primary text-primary-foreground text-xs font-semibold">
              Add to Plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {mealPlan.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">No meals planned yet</p>
          <p className="text-xs mt-1 opacity-70">Tap any empty cell above to add a meal, or use Chef AI!</p>
        </div>
      )}
    </div>
  );
}
