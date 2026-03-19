import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Update {
  version: string;
  date: string;
  title: string;
  notes: string[];
  tag?: 'new' | 'fix' | 'improvement';
}

const UPDATES: Update[] = [
  {
    version: '1.5.0',
    date: 'Mar 19, 2026',
    title: 'Household Sharing & Pexels Images',
    tag: 'new',
    notes: [
      'Household sharing — invite family/friends to share pantry, planner, shopping list, and favorites in real-time via Firestore',
      'Color-coded household members in the meal planner',
      'Favorites filter: All / Mine / Household',
      'Recipe images via Pexels API (free, toggle in Settings)',
      'Camera capture support — take photos directly on Chef AI and Pantry pages',
      'App Updates page (you\'re reading it!)',
    ],
  },
  {
    version: '1.4.0',
    date: 'Mar 18, 2026',
    title: 'Recipe Persistence & Dynamic App Name',
    tag: 'improvement',
    notes: [
      'Recipes persist across page navigation and app refreshes',
      'Last 12 recipe batch history saved — tap to reload',
      'App title dynamically shows your last name (e.g. "Smith Eats")',
      'Clickable app title to return to Chef AI homepage',
      'Share button in Settings to invite friends',
    ],
  },
  {
    version: '1.3.0',
    date: 'Mar 18, 2026',
    title: 'localStorage Persistence',
    tag: 'fix',
    notes: [
      'All data now saves to localStorage for standalone deployments',
      'Settings, pantry, favorites, meal plan, and shopping list persist across refreshes',
    ],
  },
  {
    version: '1.2.0',
    date: 'Mar 18, 2026',
    title: 'Groq API, Tappable Planner, Install Instructions',
    tag: 'fix',
    notes: [
      'Fixed AI provider: Groq (free) with correct API endpoint and llama-3.3-70b model',
      'Meal Planner cells are now tappable — quick-add meals to any slot',
      'Install-as-app instructions on the login screen for Android and iOS',
      'API key setup instructions show immediately when adding a key',
    ],
  },
  {
    version: '1.1.0',
    date: 'Mar 18, 2026',
    title: 'Firebase Auth, AI Keys, Calendar Sync',
    tag: 'new',
    notes: [
      'Firebase Authentication — Google Sign-in and Email/Password',
      'Multi-provider AI — Groq (free), Claude, OpenAI, Gemini',
      'API key management with step-by-step instructions per provider',
      'Calendar sync — Google Calendar, Outlook, and .ics download',
      'Steak W logo update',
    ],
  },
  {
    version: '1.0.0',
    date: 'Mar 18, 2026',
    title: 'Initial Release',
    tag: 'new',
    notes: [
      'Chef AI — AI-powered recipe suggestions with photo upload and filters',
      'Pantry tracker with categories and search',
      'Meal Planner — weekly calendar grid with macro tracking',
      'Shopping List — grouped items with check-off',
      'Favorites — save and search recipes',
      'Dark mode default with warm food-inspired theme',
    ],
  },
];

const TAG_STYLES: Record<string, string> = {
  new: 'bg-green-500/15 text-green-400 border-green-500/30',
  fix: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  improvement: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
};

export function AppUpdates({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">← Back</button>
        <div>
          <h2 className="font-display text-2xl font-bold">App Updates</h2>
          <p className="text-sm text-muted-foreground">What's new in Wieser Eats</p>
        </div>
      </div>

      <div className="space-y-3">
        {UPDATES.map((update, i) => (
          <Card key={update.version} className={`border-border/50 bg-card/50 ${i === 0 ? 'border-primary/30' : ''}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-mono">v{update.version}</Badge>
                  {update.tag && (
                    <Badge variant="outline" className={`text-[10px] capitalize ${TAG_STYLES[update.tag] || ''}`}>
                      {update.tag}
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{update.date}</span>
              </div>
              <p className="text-sm font-display font-semibold">{update.title}</p>
              <ul className="space-y-1">
                {update.notes.map((note, j) => (
                  <li key={j} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5 text-[10px]">●</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
