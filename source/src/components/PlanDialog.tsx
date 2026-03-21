import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Recipe, MealPlanEntry } from '@/types';

interface PlanDialogProps {
  recipe: Recipe | null;
  open: boolean;
  onClose: () => void;
  onAdd: (entries: MealPlanEntry[]) => void;
}

const MEAL_ICONS: Record<string, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍿' };

// Use local time to avoid timezone-induced date offset
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function addWeeks(dateStr: string, n: number) { return addDays(dateStr, n * 7); }
function addMonths(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setMonth(d.getMonth() + n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildEntries(recipe: Recipe, startDate: string, mealType: string, recurring: string, endDate: string): MealPlanEntry[] {
  const entries: MealPlanEntry[] = [];
  let current = startDate;
  const end = recurring === 'none' ? startDate : endDate;
  let safetyLimit = 366;

  while (current <= end && safetyLimit-- > 0) {
    entries.push({
      id: `mp-${Date.now()}-${entries.length}-${Math.random().toString(36).slice(2, 6)}`,
      date: current,
      mealType: mealType as any,
      recipe,
    });
    if (recurring === 'none') break;
    if (recurring === 'daily') current = addDays(current, 1);
    else if (recurring === 'weekly') current = addWeeks(current, 1);
    else if (recurring === 'monthly') current = addMonths(current, 1);
  }
  return entries;
}

export function PlanDialog({ recipe, open, onClose, onAdd }: PlanDialogProps) {
  const today = todayStr();
  const [date, setDate] = useState(today);
  const [mealType, setMealType] = useState('dinner');
  const [recurring, setRecurring] = useState('none');
  const [endDate, setEndDate] = useState(addWeeks(today, 4));

  const handleAdd = () => {
    if (!recipe) return;
    const entries = buildEntries(recipe, date, mealType, recurring, endDate);
    onAdd(entries);
    onClose();
  };

  const entryCount = (() => {
    if (recurring === 'none') return 1;
    const msPerUnit = recurring === 'daily' ? 86_400_000 : recurring === 'weekly' ? 7 * 86_400_000 : 30 * 86_400_000;
    return Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(date).getTime()) / msPerUnit) + 1);
  })();

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-sm mx-auto"
        onPointerDownOutside={(e) => {
          const t = e.target as Element;
          if (t.closest('[data-radix-popper-content-wrapper]') || t.closest('[role="listbox"]')) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          const t = e.target as Element;
          if (t.closest('[data-radix-popper-content-wrapper]') || t.closest('[role="listbox"]')) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base">📅 Add to Meal Plan</DialogTitle>
        </DialogHeader>
        {recipe && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground line-clamp-2 font-medium">"{recipe.name}"</p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Meal</label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="h-10 text-sm bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['breakfast','lunch','dinner','snack'] as const).map(m => (
                    <SelectItem key={m} value={m}>{MEAL_ICONS[m]} {m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Repeat</label>
              <Select value={recurring} onValueChange={setRecurring}>
                <SelectTrigger className="h-10 text-sm bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Just this day</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {recurring !== 'none' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Repeat until</label>
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background/50 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <p className="text-[10px] text-muted-foreground">
                  Will create {entryCount} {entryCount === 1 ? 'entry' : 'entries'}
                </p>
              </div>
            )}

            <Button onClick={handleAdd} className="w-full bg-primary text-primary-foreground text-sm font-semibold h-11">
              {recurring === 'none' ? 'Add to Plan' : `Add ${entryCount} Recurring Entries`}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
