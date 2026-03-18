import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import type { ShoppingItem } from '@/types';

interface ShoppingListProps {
  list: ShoppingItem[];
  saveList: (items: ShoppingItem[]) => void;
}

export function ShoppingList({ list, saveList }: ShoppingListProps) {
  const [newItem, setNewItem] = useState('');
  const [newQty, setNewQty] = useState('');

  const addItem = () => {
    if (!newItem.trim()) return;
    const item: ShoppingItem = {
      id: `shop-${Date.now()}`,
      name: newItem.trim(),
      quantity: newQty.trim() || '',
      checked: false,
      category: 'Manual',
    };
    saveList([...list, item]);
    setNewItem('');
    setNewQty('');
  };

  const toggleItem = (id: string) => {
    saveList(list.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const removeItem = (id: string) => {
    saveList(list.filter(i => i.id !== id));
  };

  const clearChecked = () => {
    saveList(list.filter(i => !i.checked));
  };

  const clearAll = () => {
    if (confirm('Clear entire shopping list?')) saveList([]);
  };

  const unchecked = list.filter(i => !i.checked);
  const checked = list.filter(i => i.checked);

  // Group unchecked by category
  const grouped = unchecked.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    const cat = item.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Shopping List</h2>
          <p className="text-sm text-muted-foreground">
            {unchecked.length} to buy · {checked.length} done
          </p>
        </div>
      </div>

      {/* Add Item */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-3">
          <div className="flex gap-2">
            <Input
              placeholder="Add item..."
              value={newItem}
              onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 h-9 text-sm bg-background/50"
            />
            <Input
              placeholder="Qty"
              value={newQty}
              onChange={e => setNewQty(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="w-20 h-9 text-sm bg-background/50"
            />
            <Button onClick={addItem} size="sm" className="h-9 px-4 bg-primary text-primary-foreground text-xs font-semibold">
              + Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unchecked Items */}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5 px-1">{cat}</p>
          <div className="space-y-0.5">
            {items.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-card/40 border border-border/30 group hover:border-border/60 transition-colors"
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <span className="flex-1 text-sm">{item.name}</span>
                {item.quantity && <span className="text-xs text-muted-foreground">{item.quantity}</span>}
                <button
                  onClick={() => removeItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-destructive text-xs px-1.5 hover:bg-destructive/10 rounded transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Checked Items */}
      {checked.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
              ✓ Done ({checked.length})
            </p>
            <Button variant="ghost" size="sm" onClick={clearChecked} className="text-[10px] text-muted-foreground h-6 px-2">
              Clear done
            </Button>
          </div>
          <div className="space-y-0.5 opacity-60">
            {checked.map(item => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-card/20 border border-border/20"
              >
                <Checkbox
                  checked={true}
                  onCheckedChange={() => toggleItem(item.id)}
                  className="border-primary data-[state=checked]:bg-primary"
                />
                <span className="flex-1 text-sm line-through">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-sm">Shopping list is empty</p>
          <p className="text-xs mt-1 opacity-70">Add items here or generate from your meal plan!</p>
        </div>
      )}

      {list.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-destructive hover:text-destructive w-full">
          Clear Entire List
        </Button>
      )}
    </div>
  );
}
