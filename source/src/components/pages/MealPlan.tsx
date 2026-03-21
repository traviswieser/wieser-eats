import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RecipeEditDialog } from '@/components/RecipeEditDialog';
import type { MealPlanEntry, Recipe, ShoppingItem, PlannerView } from '@/types';

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const MEAL_TIMES: Record<string, { hour: number; label: string }> = {
  breakfast: { hour: 8, label: 'Breakfast' },
  lunch: { hour: 12, label: 'Lunch' },
  dinner: { hour: 18, label: 'Dinner' },
  snack: { hour: 15, label: 'Snack' },
};
function toICSDate(dateStr: string, hour: number): string {
  const d = new Date(dateStr + 'T00:00:00'); d.setHours(hour, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
function buildICS(entries: MealPlanEntry[]): string {
  let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Wieser Eats//EN\r\nCALSCALE:GREGORIAN\r\n';
  for (const e of entries) {
    const mt = MEAL_TIMES[e.mealType] || MEAL_TIMES.dinner;
    const desc = `${e.recipe.cookTime} | ${e.recipe.difficulty}\\n\\nIngredients:\\n${e.recipe.ingredients.join('\\n')}`;
    ics += `BEGIN:VEVENT\r\nDTSTART:${toICSDate(e.date,mt.hour)}\r\nDTEND:${toICSDate(e.date,mt.hour+1)}\r\nSUMMARY:${mt.label}: ${e.recipe.name}\r\nDESCRIPTION:${desc}\r\nEND:VEVENT\r\n`;
  }
  return ics + 'END:VCALENDAR\r\n';
}
function downloadICS(entries: MealPlanEntry[]) {
  const blob = new Blob([buildICS(entries)], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'wieser-eats-meals.ics';
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ─── Ingredient aggregation ───────────────────────────────────────────────────
function parseLeadingQty(str: string): { qty: number; rest: string } | null {
  const m = str.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.?\d+)\s*(.*)/);
  if (!m || !m[1]) return null;
  const q = m[1].trim();
  let qty: number;
  if (q.includes(' ')) { const [w,f]=q.split(' '); const [n,d]=f.split('/').map(Number); qty=parseInt(w)+n/d; }
  else if (q.includes('/')) { const [n,d]=q.split('/').map(Number); qty=n/d; }
  else qty=parseFloat(q);
  return isNaN(qty) ? null : { qty, rest: m[2].trim() };
}
function fmtQty(qty: number): string {
  if (qty===Math.floor(qty)) return qty.toString();
  const e=Math.round(qty*8)/8; const w=Math.floor(e); const f=e-w;
  const T: [number,string][] = [[0.125,'1/8'],[0.25,'1/4'],[0.375,'3/8'],[0.5,'1/2'],[0.625,'5/8'],[0.75,'3/4'],[0.875,'7/8']];
  const fs=T.find(([v])=>Math.abs(v-f)<0.01)?.[1];
  if (fs) return w>0?`${w} ${fs}`:fs;
  return qty.toFixed(1).replace(/\.0$/,'');
}
export function aggregateIngredients(ingredients: string[]): string[] {
  type G = { totalQty: number; hasQty: boolean; restCase: string; count: number; first: string };
  const map = new Map<string, G>();
  for (const raw of ingredients) {
    const t=raw.trim(), l=t.toLowerCase(), p=parseLeadingQty(l);
    const key=p?p.rest:l, qty=p?p.qty:1;
    const rc=p?t.slice(t.match(/^[\d\s\/\.]+/)?.[0]?.length??0).trim():t;
    const ex=map.get(key);
    if (ex) { ex.totalQty+=qty; ex.count+=1; }
    else map.set(key,{totalQty:qty,hasQty:!!p,restCase:rc,count:1,first:t});
  }
  return Array.from(map.values()).map(({totalQty,hasQty,restCase,count,first})=>{
    if (count===1) return first;
    if (hasQty&&restCase) return `${fmtQty(totalQty)} ${restCase}`;
    return `${count}× ${restCase}`;
  });
}

// ─── Day helpers ──────────────────────────────────────────────────────────────
type DayInfo = { date: string; label: string; day: string; isToday: boolean };
function ds(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
const today = () => ds(new Date());
function mkDay(d: Date): DayInfo {
  return { date: ds(d), label: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), day: d.toLocaleDateString('en-US',{weekday:'short'}), isToday: ds(d)===today() };
}
function getWeekDays(off: number): DayInfo[] {
  const t=new Date(), s=new Date(t); s.setDate(s.getDate()-s.getDay()+off*7);
  return Array.from({length:7},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return mkDay(d);});
}
function getRolling(n: number, off: number): DayInfo[] {
  const s=new Date(); s.setDate(s.getDate()+off*n);
  return Array.from({length:n},(_,i)=>{const d=new Date(s);d.setDate(d.getDate()+i);return mkDay(d);});
}
function getMonth(off: number): DayInfo[][] {
  const t=new Date(), s=new Date(t); s.setDate(s.getDate()-s.getDay()+off*28);
  const weeks: DayInfo[][]=[];
  for (let w=0;w<4;w++){const wk:DayInfo[]=[];for(let d=0;d<7;d++){const day=new Date(s);day.setDate(day.getDate()+w*7+d);wk.push(mkDay(day));}weeks.push(wk);}
  return weeks;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface MealPlanProps {
  mealPlan: MealPlanEntry[];
  onRemove: (id: string) => void;
  onUpdate: (id: string, recipe: Recipe) => void;
  onAddToShoppingList: (items: ShoppingItem[]) => void;
  onAdd: (entries: MealPlanEntry[]) => void;
  getMemberColor?: (uid?: string) => string;
  getMemberName?: (uid?: string) => string;
  inHousehold?: boolean;
  showToast?: (msg: string) => void;
  currentView: PlannerView;
  onViewChange: (v: PlannerView) => void;
  onCook: (recipe: Recipe) => void;
}

const MEAL_SLOTS = ['breakfast','lunch','dinner','snack'] as const;
const MEAL_ICONS: Record<string,string> = {breakfast:'🌅',lunch:'☀️',dinner:'🌙',snack:'🍿'};
const VIEW_LABELS: Record<PlannerView,string> = {weekly:'Week',next7:'Next 7',next3:'Next 3',month:'Month'};

export function MealPlan({mealPlan,onRemove,onUpdate,onAddToShoppingList,onAdd,getMemberColor,getMemberName,inHousehold,showToast,currentView,onViewChange,onCook}: MealPlanProps) {
  const [offset, setOffset] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntry|null>(null);
  const [editEntry, setEditEntry] = useState<MealPlanEntry|null>(null);
  const [quickAdd, setQuickAdd] = useState<{date:string;meal:string}|null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickTime, setQuickTime] = useState('30 min');

  useEffect(()=>{setOffset(0);},[currentView]);

  const flatDays: DayInfo[] = useMemo(()=>{
    if (currentView==='weekly') return getWeekDays(offset);
    if (currentView==='next7') return getRolling(7,offset);
    if (currentView==='next3') return getRolling(3,offset);
    if (currentView==='month') return getMonth(offset).flat();
    return getWeekDays(offset);
  },[currentView,offset]);

  const monthWeeks = useMemo(()=>currentView==='month'?getMonth(offset):null,[currentView,offset]);

  const getEntries = (date: string, meal: string) => mealPlan.filter(e=>e.date===date&&e.mealType===meal);
  const viewEntries = mealPlan.filter(e=>flatDays.some(d=>d.date===e.date));

  const rangeLabel = () => {
    if (!flatDays.length) return '';
    if (currentView==='weekly') { if(offset===0)return'This Week'; if(offset===1)return'Next Week'; if(offset===-1)return'Last Week'; }
    return `${flatDays[0].label} – ${flatDays[flatDays.length-1].label}`;
  };

  const totals = useMemo(()=>viewEntries.reduce((a,e)=>({
    calories:a.calories+(e.recipe.macros?.calories||0), protein:a.protein+(e.recipe.macros?.protein||0),
    carbs:a.carbs+(e.recipe.macros?.carbs||0), fat:a.fat+(e.recipe.macros?.fat||0),
  }),{calories:0,protein:0,carbs:0,fat:0}),[viewEntries]);

  const generateShopping = () => {
    const agg = aggregateIngredients(viewEntries.flatMap(e=>e.recipe.ingredients));
    onAddToShoppingList(agg.map((ing,i)=>({id:`shop-${Date.now()}-${i}`,name:ing,quantity:'',checked:false,category:'Meal Plan'})));
    showToast?.(`${agg.length} ingredients added to shopping list`);
  };

  const doQuickAdd = () => {
    if (!quickAdd||!quickName.trim()) return;
    onAdd([{id:`mp-${Date.now()}`,date:quickAdd.date,mealType:quickAdd.meal as any,recipe:{
      id:`quick-${Date.now()}`,name:quickName.trim(),description:'Manually added',ingredients:[],instructions:[],
      cookTime:quickTime,difficulty:'Easy',mealType:quickAdd.meal,cuisine:'',cookingMethod:'',servings:1,
      spiceLevel:'Mild',macros:{calories:0,protein:0,carbs:0,fat:0,fiber:0},kidFriendly:true,
    }}]);
    setQuickAdd(null); setQuickName(''); showToast?.('Added to meal plan');
  };

  const renderGrid = (days: DayInfo[]) => (
    <div className="grid gap-1" style={{gridTemplateColumns:`repeat(${days.length},minmax(0,1fr))`}}>
      {days.map(d=>(
        <div key={d.date} className={`text-center p-1.5 rounded-lg text-xs ${d.isToday?'bg-primary/15 text-primary font-bold':'text-muted-foreground'}`}>
          <div className="font-semibold">{d.day}</div>
          <div className="text-[10px] opacity-75">{d.label}</div>
        </div>
      ))}
      {MEAL_SLOTS.map(meal=>(
        <div key={meal} style={{gridColumn:`1 / -1`}} className="contents">
          <div style={{gridColumn:`1 / -1`}} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mt-1 flex items-center gap-1">
            {MEAL_ICONS[meal]} {meal}
          </div>
          {days.map(d=>{
            const entries=getEntries(d.date,meal);
            return (
              <button key={`${d.date}-${meal}`}
                onClick={()=>entries.length>0?setSelectedEntry(entries[0]):setQuickAdd({date:d.date,meal})}
                className={`min-h-[48px] rounded-lg border text-[10px] p-1 text-left transition-colors ${entries.length>0?'border-primary/30 bg-primary/5 hover:bg-primary/10':'border-border/30 bg-card/20 hover:border-primary/20 hover:bg-primary/5'}`}>
                {entries.length>0?entries.map(entry=>(
                  <div key={entry.id} className="flex items-start gap-1">
                    {inHousehold&&(entry as any).addedBy&&<span className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{background:getMemberColor?.((entry as any).addedBy)||'#888'}}/>}
                    <div className="min-w-0"><p className="font-medium truncate leading-tight">{entry.recipe.name}</p><p className="text-muted-foreground opacity-70">{entry.recipe.cookTime}</p></div>
                  </div>
                )):(
                  <div className="flex items-center justify-center h-full opacity-0 hover:opacity-30 transition-opacity text-muted-foreground text-lg">+</div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  const renderMonth = (weeks: DayInfo[][]) => (
    <div className="space-y-3">
      {weeks.map((week,wi)=>(
        <div key={wi} className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Week of {week[0].label}</p>
          <div className="grid grid-cols-7 gap-1">
            {week.map(d=>{
              const de=mealPlan.filter(e=>e.date===d.date);
              return (
                <button key={d.date}
                  onClick={()=>de.length>0?setSelectedEntry(de[0]):setQuickAdd({date:d.date,meal:'dinner'})}
                  className={`min-h-[56px] rounded-lg border p-1.5 text-left transition-colors text-[9px] ${d.isToday?'border-primary/50':'border-border/30'} ${de.length>0?'bg-primary/5 hover:bg-primary/10':'bg-card/20 hover:bg-card/40'}`}>
                  <p className={`font-bold mb-0.5 ${d.isToday?'text-primary':'text-muted-foreground'}`}>{d.day} {d.label.split(' ')[1]}</p>
                  {de.slice(0,3).map(e=><p key={e.id} className="truncate leading-tight text-foreground/70">{MEAL_ICONS[e.mealType]} {e.recipe.name}</p>)}
                  {de.length>3&&<p className="text-muted-foreground">+{de.length-3}</p>}
                  {de.length===0&&<p className="text-muted-foreground/30 mt-1">+</p>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-2xl font-bold">Meal Planner</h2>
          <p className="text-sm text-muted-foreground">{rangeLabel()}</p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={()=>setOffset(o=>o-1)} className="h-8 w-8 p-0 text-xs">◀</Button>
          <Button variant="outline" size="sm" onClick={()=>setOffset(0)} className="h-8 px-2 text-xs">Today</Button>
          <Button variant="outline" size="sm" onClick={()=>setOffset(o=>o+1)} className="h-8 w-8 p-0 text-xs">▶</Button>
        </div>
      </div>

      <div className="flex gap-1">
        {(Object.keys(VIEW_LABELS) as PlannerView[]).map(v=>(
          <Button key={v} size="sm" variant={currentView===v?'default':'outline'} onClick={()=>onViewChange(v)}
            className={`flex-1 h-7 text-xs ${currentView===v?'bg-primary text-primary-foreground':''}`}>
            {VIEW_LABELS[v]}
          </Button>
        ))}
      </div>

      {totals.calories>0&&(
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Period Totals</p>
            <div className="flex gap-4 text-xs flex-wrap">
              <span className="text-orange-400 font-semibold">{Math.round(totals.calories).toLocaleString()} cal</span>
              <span className="text-blue-400">{Math.round(totals.protein)}g protein</span>
              <span className="text-yellow-400">{Math.round(totals.carbs)}g carbs</span>
              <span className="text-red-400">{Math.round(totals.fat)}g fat</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto -mx-4 px-4">
        <div className={currentView==='month'?'':currentView==='next3'?'min-w-[300px]':'min-w-[600px]'}>
          {currentView==='month'&&monthWeeks?renderMonth(monthWeeks):renderGrid(flatDays)}
        </div>
      </div>

      <Button variant="outline" size="sm" onClick={generateShopping} className="w-full text-xs" disabled={!viewEntries.length}>
        🛒 Generate Shopping List from {VIEW_LABELS[currentView]}
      </Button>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full text-xs" disabled={!viewEntries.length}>📆 Sync to Calendar</Button>
        </DialogTrigger>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="font-display text-base">Sync to Calendar</DialogTitle></DialogHeader>
          <div className="space-y-2 pt-1">
            {[
              {icon:'📅',label:'Google Calendar',fn:()=>viewEntries.slice(0,5).forEach(e=>{const mt=MEAL_TIMES[e.mealType]||MEAL_TIMES.dinner;window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`${mt.label}: ${e.recipe.name}`)}&dates=${toICSDate(e.date,mt.hour)}/${toICSDate(e.date,mt.hour+1)}`,'_blank');})},
              {icon:'📧',label:'Outlook Calendar',fn:()=>viewEntries.slice(0,5).forEach(e=>{const mt=MEAL_TIMES[e.mealType]||MEAL_TIMES.dinner;const d=new Date(e.date+'T00:00:00');d.setHours(mt.hour);const s=d.toISOString();d.setHours(mt.hour+1);window.open(`https://outlook.live.com/calendar/0/action/compose?subject=${encodeURIComponent(`${mt.label}: ${e.recipe.name}`)}&startdt=${s}&enddt=${d.toISOString()}`,'_blank');})},
              {icon:'🍎',label:'Apple / Other (.ics)',fn:()=>downloadICS(viewEntries)},
            ].map(({icon,label,fn})=>(
              <Button key={label} variant="outline" size="sm" className="w-full text-xs justify-start gap-2" onClick={fn}><span>{icon}</span>{label}</Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Entry Detail */}
      <Dialog open={!!selectedEntry} onOpenChange={o=>!o&&setSelectedEntry(null)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          {selectedEntry&&(
            <>
              <DialogHeader><DialogTitle className="font-display text-lg">{selectedEntry.recipe.name}</DialogTitle></DialogHeader>
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground text-xs">{selectedEntry.recipe.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">⏱ {selectedEntry.recipe.cookTime}</Badge>
                  <Badge variant="secondary" className="text-[10px]">📊 {selectedEntry.recipe.difficulty}</Badge>
                  <Badge variant="secondary" className="text-[10px]">🍽 {selectedEntry.recipe.cuisine}</Badge>
                  <Badge variant="secondary" className="text-[10px]">📅 {new Date(selectedEntry.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</Badge>
                  {selectedEntry.recipe.instructionSource === 'real' && <Badge variant="secondary" className="text-[10px] text-green-400">✓ Real instructions</Badge>}
                  {selectedEntry.recipe.instructionSource === 'ai' && <Badge variant="secondary" className="text-[10px] text-blue-400">✨ AI instructions</Badge>}
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-orange-400">{selectedEntry.recipe.macros.calories} cal</span>
                  <span className="text-blue-400">{selectedEntry.recipe.macros.protein}g P</span>
                  <span className="text-yellow-400">{selectedEntry.recipe.macros.carbs}g C</span>
                  <span className="text-red-400">{selectedEntry.recipe.macros.fat}g F</span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Ingredients</p>
                  <ul className="space-y-0.5">{selectedEntry.recipe.ingredients.map((ing,i)=><li key={i} className="flex items-start gap-1.5 text-xs"><span className="text-primary">●</span>{ing}</li>)}</ul>
                </div>
                {selectedEntry.recipe.instructions.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1 uppercase tracking-wider">Instructions</p>
                    <ol className="space-y-2">
                      {selectedEntry.recipe.instructions.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] flex items-center justify-center font-bold mt-0.5">{i+1}</span>
                          <span>{step.replace(/^\d+[.)]\s*/, '')}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button size="sm" onClick={()=>{onCook(selectedEntry.recipe);setSelectedEntry(null);}} className="flex-1 text-xs bg-primary text-primary-foreground">👨‍🍳 Let's Cook!</Button>
                  <Button size="sm" variant="outline" onClick={()=>{setEditEntry(selectedEntry);setSelectedEntry(null);}} className="flex-1 text-xs">✏️ Edit</Button>
                  <Button size="sm" variant="destructive" onClick={()=>{onRemove(selectedEntry.id);setSelectedEntry(null);showToast?.('Removed from plan');}} className="flex-1 text-xs">Remove</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RecipeEditDialog recipe={editEntry?.recipe??null} open={!!editEntry} onClose={()=>setEditEntry(null)}
        onSave={updated=>{if(editEntry){onUpdate(editEntry.id,updated);showToast?.('Recipe updated');}}}/>

      <Dialog open={!!quickAdd} onOpenChange={o=>{if(!o)setQuickAdd(null);}}>
        <DialogContent className="max-w-xs">
          <DialogHeader><DialogTitle className="font-display text-base">Add {quickAdd?MEAL_ICONS[quickAdd.meal]:''} {quickAdd?.meal}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">What are you making?</label>
              <Input placeholder="e.g. Chicken stir fry" value={quickName} onChange={e=>setQuickName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doQuickAdd()} className="h-9 text-sm bg-background/50" autoFocus/>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Cook time</label>
              <Input placeholder="e.g. 30 min" value={quickTime} onChange={e=>setQuickTime(e.target.value)} className="h-9 text-sm bg-background/50"/>
            </div>
            <Button onClick={doQuickAdd} disabled={!quickName.trim()} className="w-full bg-primary text-primary-foreground text-xs font-semibold">Add to Plan</Button>
          </div>
        </DialogContent>
      </Dialog>

      {mealPlan.length===0&&(
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">No meals planned yet</p>
          <p className="text-xs mt-1 opacity-70">Tap any cell to add a meal, or use Chef AI!</p>
        </div>
      )}
    </div>
  );
}
