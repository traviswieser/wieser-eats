import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import type { PantryItem } from '@/types';

const CATEGORIES = ['Proteins', 'Dairy', 'Vegetables', 'Fruits', 'Grains & Pasta', 'Canned Goods', 'Spices & Seasonings', 'Condiments', 'Frozen', 'Baking', 'Snacks', 'Beverages', 'Other'];

interface PantryProps {
  pantry: PantryItem[];
  savePantry: (items: PantryItem[]) => void;
  loaded: boolean;
}

export function Pantry({ pantry, savePantry, loaded }: PantryProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState('Other');
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [detectedItems, setDetectedItems] = useState<{ name: string; quantity: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const addItem = () => {
    if (!name.trim()) return;
    const item: PantryItem = {
      id: `pantry-${Date.now()}`,
      name: name.trim(),
      quantity: quantity.trim() || '1',
      category,
    };
    savePantry([...pantry, item]);
    setName('');
    setQuantity('');
  };

  const removeItem = (id: string) => {
    savePantry(pantry.filter(p => p.id !== id));
  };

  const updateQuantity = (id: string, qty: string) => {
    savePantry(pantry.map(p => p.id === id ? { ...p, quantity: qty } : p));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      setPhotoLoading(true);
      setDetectedItems([]);

      try {
        const base64 = dataUrl.split(',')[1];
        const mediaType = dataUrl.split(';')[0].split(':')[1] || 'image/jpeg';

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            messages: [{
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
                { type: 'text', text: 'Identify all food ingredients visible in this image. Return ONLY a JSON array of objects with "name" (string) and "quantity" (string estimate, e.g. "1 bag", "2 lbs", "1 bunch"). No markdown, no backticks, no extra text.' },
              ],
            }],
          }),
        });

        const data = await response.json();
        const text = data.content?.map((b: any) => b.text || '').join('') || '';
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          setDetectedItems(JSON.parse(jsonMatch[0]));
        }
      } catch (err) {
        console.error('Photo scan error:', err);
      } finally {
        setPhotoLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const addDetectedItem = (item: { name: string; quantity: string }) => {
    const newItem: PantryItem = {
      id: `pantry-${Date.now()}-${Math.random()}`,
      name: item.name,
      quantity: item.quantity || '1',
      category: 'Other',
    };
    savePantry([...pantry, newItem]);
    setDetectedItems(prev => prev.filter(d => d.name !== item.name));
  };

  const addAllDetected = () => {
    const newItems: PantryItem[] = detectedItems.map((item, i) => ({
      id: `pantry-${Date.now()}-${i}`,
      name: item.name,
      quantity: item.quantity || '1',
      category: 'Other',
    }));
    savePantry([...pantry, ...newItems]);
    setDetectedItems([]);
    setPhotoPreview(null);
  };

  const filtered = pantry.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === 'all' || p.category === filterCat;
    return matchSearch && matchCat;
  });

  const grouped = CATEGORIES.reduce<Record<string, PantryItem[]>>((acc, cat) => {
    const items = filtered.filter(p => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Pantry</h2>
          <p className="text-sm text-muted-foreground">{pantry.length} items · Shared with household</p>
        </div>
      </div>

      {/* Add Item Form */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Item name..."
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="flex-1 bg-background/50 text-sm h-9"
            />
            <Input
              placeholder="Qty"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              className="w-20 bg-background/50 text-sm h-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs bg-background/50 flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={addItem} size="sm" className="h-9 px-4 bg-primary text-primary-foreground text-xs font-semibold">
              + Add
            </Button>
          </div>

          {/* Photo Scan */}
          <Separator className="opacity-50" />
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} className="text-xs gap-1.5 flex-1" disabled={photoLoading}>
                {photoLoading ? '🔍 Scanning...' : '🖼️ Scan from Gallery'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => cameraRef.current?.click()} className="text-xs gap-1.5 flex-1" disabled={photoLoading}>
                📸 Take Photo
              </Button>
            </div>
          </div>

          {/* Detected Items */}
          {detectedItems.length > 0 && (
            <div className="space-y-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detected Items</p>
                <Button size="sm" variant="default" onClick={addAllDetected} className="text-xs h-7">
                  Add All ({detectedItems.length})
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedItems.map((item, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-xs py-1 px-2 gap-1"
                    onClick={() => addDetectedItem(item)}
                  >
                    <span className="text-primary">+</span> {item.name} ({item.quantity})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <Input
          placeholder="Search pantry..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 h-9 text-sm bg-card/50"
        />
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="h-9 text-xs bg-card/50 w-36"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Pantry Items */}
      {Object.entries(grouped).length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-4xl mb-3">🥫</p>
          <p className="text-sm">Your pantry is empty</p>
          <p className="text-xs mt-1 opacity-70">Add items above or scan a photo of your fridge!</p>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{cat}</h3>
            <div className="space-y-1">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-card/40 border border-border/30 group hover:border-border/60 transition-colors"
                >
                  <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                  <Input
                    value={item.quantity}
                    onChange={e => updateQuantity(item.id, e.target.value)}
                    className="w-20 h-7 text-xs text-center bg-background/30 border-border/30"
                  />
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive text-xs px-1.5 hover:bg-destructive/10 rounded"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {pantry.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => { if (confirm('Clear all pantry items?')) savePantry([]); }}
          className="text-xs text-destructive hover:text-destructive w-full"
        >
          Clear All Items
        </Button>
      )}
    </div>
  );
}
