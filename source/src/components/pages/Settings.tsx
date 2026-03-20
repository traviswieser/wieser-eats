const SETTINGS_LOGO = 'data:image/png;base64,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';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { UserSettings, AIProvider, AIKeyEntry } from '@/types';

const COMMON_ALLERGIES = ['Dairy','Eggs','Fish','Shellfish','Tree Nuts','Peanuts','Wheat/Gluten','Soy','Sesame','Corn'];
const DIET_TYPES = [
  { value: 'none', label: 'No Restriction' }, { value: 'keto', label: 'Keto' }, { value: 'low-carb', label: 'Low Carb' },
  { value: 'paleo', label: 'Paleo' }, { value: 'vegetarian', label: 'Vegetarian' }, { value: 'vegan', label: 'Vegan' },
  { value: 'pescatarian', label: 'Pescatarian' }, { value: 'mediterranean', label: 'Mediterranean' },
  { value: 'whole30', label: 'Whole30' }, { value: 'gluten-free', label: 'Gluten Free' }, { value: 'dairy-free', label: 'Dairy Free' },
];

const AI_PROVIDERS: { id: AIProvider; name: string; icon: string; free: boolean; color: string; instructions: string[]; link: string }[] = [
  { id: 'grok', name: 'Groq', icon: '⚡', free: true, color: 'text-blue-400',
    instructions: ['Go to console.groq.com/keys', 'Create an account or sign in with Google/GitHub', 'Click "Create API Key"', 'Name your key, copy it, and paste it below'],
    link: 'https://console.groq.com/keys' },
  { id: 'claude', name: 'Claude', icon: '💲', free: false, color: 'text-orange-400',
    instructions: ['Go to console.anthropic.com', 'Create an account or sign in', 'Go to "API Keys" in settings', 'Click "Create Key", name it, and copy the key'],
    link: 'https://console.anthropic.com/settings/keys' },
  { id: 'openai', name: 'OpenAI', icon: '💲', free: false, color: 'text-green-400',
    instructions: ['Go to platform.openai.com', 'Create an account or sign in', 'Navigate to API Keys section', 'Click "Create new secret key" and copy it'],
    link: 'https://platform.openai.com/api-keys' },
  { id: 'gemini', name: 'Gemini', icon: '💲', free: false, color: 'text-purple-400',
    instructions: ['Go to aistudio.google.com/apikey', 'Sign in with your Google account', 'Click "Create API key"', 'Select a project and copy the key'],
    link: 'https://aistudio.google.com/apikey' },
];

interface SettingsProps {
  settings: UserSettings; saveSettings: (s: UserSettings) => void;
  user?: any; onSignOut?: () => void; appName?: string;
  household?: any; onCreateHousehold?: (name: string) => Promise<void>;
  onJoinHousehold?: (code: string) => Promise<string | null>;
  onLeaveHousehold?: () => Promise<void>;
  onGoToUpdates?: () => void;
}

export function Settings({ settings, saveSettings, user, onSignOut, appName, household, onCreateHousehold, onJoinHousehold, onLeaveHousehold, onGoToUpdates }: SettingsProps) {
  const [customAllergy, setCustomAllergy] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('grok');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [showAddKey, setShowAddKey] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<AIProvider | null>(null);
  const [hhName, setHhName] = useState('');
  const [hhJoinCode, setHhJoinCode] = useState('');
  const [hhError, setHhError] = useState<string | null>(null);
  const [hhLoading, setHhLoading] = useState(false);

  const toggleAllergy = (allergy: string) => {
    const lower = allergy.toLowerCase();
    if (settings.allergies.includes(lower)) saveSettings({ ...settings, allergies: settings.allergies.filter(a => a !== lower) });
    else saveSettings({ ...settings, allergies: [...settings.allergies, lower] });
  };
  const addCustomAllergy = () => {
    if (!customAllergy.trim()) return;
    const lower = customAllergy.trim().toLowerCase();
    if (!settings.allergies.includes(lower)) saveSettings({ ...settings, allergies: [...settings.allergies, lower] });
    setCustomAllergy('');
  };
  const addAIKey = () => {
    if (!newKeyValue.trim()) return;
    const entry: AIKeyEntry = { provider: newKeyProvider, key: newKeyValue.trim(), label: newKeyLabel.trim() || AI_PROVIDERS.find(p => p.id === newKeyProvider)!.name };
    const existing = settings.aiKeys.filter(k => !(k.provider === newKeyProvider && k.label === entry.label));
    const newKeys = [...existing, entry];
    saveSettings({ ...settings, aiKeys: newKeys, activeAIProvider: settings.activeAIProvider || newKeyProvider });
    setNewKeyValue(''); setNewKeyLabel(''); setShowAddKey(false);
  };
  const removeAIKey = (idx: number) => {
    const newKeys = settings.aiKeys.filter((_, i) => i !== idx);
    const active = newKeys.find(k => k.provider === settings.activeAIProvider) ? settings.activeAIProvider : (newKeys[0]?.provider || null);
    saveSettings({ ...settings, aiKeys: newKeys, activeAIProvider: active });
  };
  const setActiveProvider = (provider: AIProvider) => {
    if (settings.aiKeys.some(k => k.provider === provider)) saveSettings({ ...settings, activeAIProvider: provider });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">Customize your cooking experience</p>
      </div>

      {/* AI API Keys */}
      <Card className="border-primary/30 bg-card/50" id="ai-keys">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display flex items-center gap-2">🤖 AI API Keys</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">Add your API key to power recipe suggestions. Grok is free!</p>

          {/* Existing Keys */}
          {settings.aiKeys.length > 0 && (
            <div className="space-y-1.5">
              {settings.aiKeys.map((k, i) => {
                const prov = AI_PROVIDERS.find(p => p.id === k.provider)!;
                const isActive = settings.activeAIProvider === k.provider;
                return (
                  <div key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-colors ${isActive ? 'border-primary/50 bg-primary/5' : 'border-border/30 bg-card/40'}`}>
                    <span className="text-sm">{prov.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{k.label || prov.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">...{k.key.slice(-8)}</p>
                    </div>
                    {isActive ? (
                      <Badge variant="default" className="text-[10px] bg-primary/20 text-primary border-0">Active</Badge>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setActiveProvider(k.provider)} className="text-[10px] h-6 px-2">Use</Button>
                    )}
                    <button onClick={() => removeAIKey(i)} className="text-destructive text-xs px-1 hover:bg-destructive/10 rounded">✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Key */}
          {!showAddKey ? (
            <Button variant="outline" size="sm" onClick={() => { setShowAddKey(true); setExpandedProvider(newKeyProvider); }} className="w-full text-xs">+ Add API Key</Button>
          ) : (
            <div className="space-y-2.5 p-3 rounded-lg bg-secondary/30 border border-border/50">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Provider</label>
                <Select value={newKeyProvider} onValueChange={v => { setNewKeyProvider(v as AIProvider); setExpandedProvider(v as AIProvider); }}>
                  <SelectTrigger className="h-9 text-xs bg-background/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AI_PROVIDERS.map(p => <SelectItem key={p.id} value={p.id}><span className="flex items-center gap-1.5">{p.icon} {p.name} {p.free && <span className="text-[10px] text-green-400">(Free)</span>}</span></SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Setup Instructions */}
              {expandedProvider && (() => {
                const prov = AI_PROVIDERS.find(p => p.id === expandedProvider)!;
                return (
                  <div className="p-2.5 rounded-lg bg-background/50 border border-border/30">
                    <p className="text-xs font-semibold mb-1.5">How to get your {prov.name} API key:</p>
                    <ol className="space-y-1">
                      {prov.instructions.map((step, i) => (
                        <li key={i} className="text-[11px] text-muted-foreground flex gap-1.5">
                          <span className="text-primary font-bold shrink-0">{i+1}.</span>{step}
                        </li>
                      ))}
                    </ol>
                    <a href={prov.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline font-medium">
                      Open {prov.name} Console →
                    </a>
                  </div>
                );
              })()}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">API Key</label>
                <Input type="password" placeholder="Paste your API key..." value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} className="h-9 text-xs bg-background/50 font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Label (optional)</label>
                <Input placeholder="e.g. Personal, Work..." value={newKeyLabel} onChange={e => setNewKeyLabel(e.target.value)} className="h-9 text-xs bg-background/50" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addAIKey} disabled={!newKeyValue.trim()} className="flex-1 bg-primary text-primary-foreground text-xs font-semibold">Save Key</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddKey(false); setExpandedProvider(null); }} className="text-xs">Cancel</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Meal Images */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display flex items-center gap-2">🖼️ AI Meal Images</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Show Food Photos</Label><p className="text-xs text-muted-foreground">Show food photos on recipe cards (free via Pexels)</p></div>
            <Switch checked={settings.aiImageGen ?? false} onCheckedChange={checked => saveSettings({ ...settings, aiImageGen: checked })} />
          </div>
          {(settings.aiImageGen ?? false) && (
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-medium text-muted-foreground">Pexels API Key (free)</label>
              <Input type="password" placeholder="Paste your Pexels API key..." value={settings.pexelsKey || ''} onChange={e => saveSettings({ ...settings, pexelsKey: e.target.value })} className="h-8 text-xs bg-background/50 font-mono" />
              <div className="text-[11px] text-muted-foreground space-y-0.5">
                <p>1. Go to <a href="https://www.pexels.com/api/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">pexels.com/api</a> and create a free account</p>
                <p>2. Click "Your API Key", fill out the form, and copy your key</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Household */}
      <Card className="border-border/50 bg-card/50" id="household">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display flex items-center gap-2">🏠 Household</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          {household ? (
            <>
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold">{household.name}</p>
                  <Badge variant="outline" className="text-[10px] font-mono">{household.code}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mb-2">Share this code for others to join</p>
                <div className="space-y-1">
                  {Object.values(household.members || {}).map((m: any) => (
                    <div key={m.uid} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: m.color }} />
                      {m.photoURL ? (
                        <img src={m.photoURL} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" alt="" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">{(m.name || '?')[0]}</div>
                      )}
                      <span className="truncate">{m.name}</span>
                      {m.uid === household.createdBy && <Badge variant="secondary" className="text-[8px] h-4">Owner</Badge>}
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(household.code);
                alert('Invite code copied!');
              }} className="w-full text-xs">📋 Copy Invite Code</Button>
              <Button variant="outline" size="sm" onClick={async () => {
                if (confirm('Leave this household? Your shared data will stay with the household.')) {
                  await onLeaveHousehold?.();
                }
              }} className="w-full text-xs text-destructive hover:text-destructive">Leave Household</Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Share pantry, meals, shopping lists, and favorites with your household.</p>
              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Create a new household</label>
                  <div className="flex gap-2">
                    <Input placeholder="Household name (e.g. Wieser Family)" value={hhName} onChange={e => setHhName(e.target.value)} className="h-8 text-xs bg-background/50" />
                    <Button size="sm" disabled={!hhName.trim() || hhLoading} className="h-8 text-xs bg-primary text-primary-foreground" onClick={async () => {
                      setHhLoading(true); setHhError(null);
                      try { await onCreateHousehold?.(hhName.trim()); setHhName(''); } catch { setHhError('Failed to create'); }
                      setHhLoading(false);
                    }}>Create</Button>
                  </div>
                </div>
                <div className="flex items-center gap-3"><Separator className="flex-1 opacity-50" /><span className="text-[10px] text-muted-foreground">or</span><Separator className="flex-1 opacity-50" /></div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Join with invite code</label>
                  <div className="flex gap-2">
                    <Input placeholder="Enter code..." value={hhJoinCode} onChange={e => setHhJoinCode(e.target.value.toUpperCase())} className="h-8 text-xs bg-background/50 font-mono uppercase" maxLength={6} />
                    <Button size="sm" disabled={hhJoinCode.length < 4 || hhLoading} variant="outline" className="h-8 text-xs" onClick={async () => {
                      setHhLoading(true); setHhError(null);
                      const err = await onJoinHousehold?.(hhJoinCode);
                      if (err) setHhError(err); else setHhJoinCode('');
                      setHhLoading(false);
                    }}>Join</Button>
                  </div>
                </div>
                {hhError && <p className="text-xs text-destructive">{hhError}</p>}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Theme */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Appearance</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Dark Mode</Label><p className="text-xs text-muted-foreground">Toggle between dark and light themes</p></div>
            <Switch checked={settings.theme === 'dark'} onCheckedChange={checked => saveSettings({ ...settings, theme: checked ? 'dark' : 'light' })} />
          </div>
        </CardContent>
      </Card>

      {/* Diet */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Diet Type</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4">
          <Select value={settings.dietType} onValueChange={v => saveSettings({ ...settings, dietType: v })}>
            <SelectTrigger className="bg-background/50 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{DIET_TYPES.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}</SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1.5">AI recipes will follow this diet when possible</p>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Allergies & Intolerances</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGIES.map(a => {
              const active = settings.allergies.includes(a.toLowerCase());
              return <Badge key={a} variant={active ? 'default' : 'outline'}
                className={`cursor-pointer text-xs transition-all ${active ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'hover:bg-secondary'}`}
                onClick={() => toggleAllergy(a)}>{active ? '✕ ' : ''}{a}</Badge>;
            })}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add custom allergy..." value={customAllergy} onChange={e => setCustomAllergy(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomAllergy()} className="h-8 text-xs bg-background/50" />
            <Button onClick={addCustomAllergy} variant="outline" size="sm" className="h-8 text-xs">Add</Button>
          </div>
          {settings.allergies.filter(a => !COMMON_ALLERGIES.map(c => c.toLowerCase()).includes(a)).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {settings.allergies.filter(a => !COMMON_ALLERGIES.map(c => c.toLowerCase()).includes(a)).map(a => (
                <Badge key={a} variant="default" className="bg-destructive text-destructive-foreground cursor-pointer text-xs" onClick={() => toggleAllergy(a)}>✕ {a}</Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Preferences</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-4">
          <div className="flex items-center justify-between">
            <div><Label className="text-sm font-medium">Kid-Friendly Default</Label><p className="text-xs text-muted-foreground">Only suggest kid-friendly recipes</p></div>
            <Switch checked={settings.kidFriendly} onCheckedChange={checked => saveSettings({ ...settings, kidFriendly: checked })} />
          </div>
          <Separator className="opacity-50" />
          <div>
            <Label className="text-sm font-medium">Default Servings</Label>
            <p className="text-xs text-muted-foreground mb-2">Starting serving size for recipe suggestions</p>
            <Input type="number" min={1} max={20} value={settings.defaultServings} onChange={e => saveSettings({ ...settings, defaultServings: parseInt(e.target.value) || 4 })} className="w-24 h-9 text-sm bg-background/50" />
          </div>
        </CardContent>
      </Card>

      {/* Share */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Share App</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          <p className="text-xs text-muted-foreground">Invite friends and family to use {appName || 'Wieser Eats'}!</p>
          <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={() => {
            const url = window.location.origin;
            const text = `Check out ${appName || 'Wieser Eats'} — an AI-powered meal planning app!`;
            if (navigator.share) {
              navigator.share({ title: appName || 'Wieser Eats', text, url }).catch(() => {});
            } else {
              navigator.clipboard.writeText(text).then(() => alert('Link copied to clipboard!'));
            }
          }}>
            📤 Share {appName || 'Wieser Eats'}
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      {user && (
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-display">Account</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full border border-border/50" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                {user.displayName && <p className="text-sm font-medium truncate">{user.displayName}</p>}
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onSignOut} className="w-full text-xs text-destructive hover:text-destructive">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      )}

      {/* About */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="p-4 text-center">
          <img src={SETTINGS_LOGO} alt="App logo" className="w-10 h-10 object-contain mx-auto mb-1" />
          <p className="font-display font-bold text-sm"><span className="text-primary">{(appName || 'Wieser Eats').split(' ')[0]}</span> {(appName || 'Wieser Eats').split(' ').slice(1).join(' ')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">AI-powered meal planning for the whole household</p>
          <button onClick={onGoToUpdates} className="text-xs text-primary mt-2 hover:underline font-medium">📋 App Updates &amp; Changelog →</button>
          <p className="text-[10px] text-muted-foreground mt-2 opacity-50">v1.6.0</p>
        </CardContent>
      </Card>
    </div>
  );
}
