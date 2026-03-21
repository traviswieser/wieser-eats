import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { Recipe } from '@/types';

interface CookPageProps {
  recipe: Recipe;
  onBack: () => void;
}

export function CookPage({ recipe, onBack }: CookPageProps) {
  const [wakeLock, setWakeLock] = useState(false);
  const [wakeLockSupported] = useState(() => 'wakeLock' in navigator);
  const wakeLockRef = useRef<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  // Wake lock management
  const requestWakeLock = async () => {
    try {
      wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      setWakeLock(true);
      wakeLockRef.current.addEventListener('release', () => setWakeLock(false));
    } catch { setWakeLock(false); }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLock(false);
    }
  };

  const toggleWakeLock = () => wakeLock ? releaseWakeLock() : requestWakeLock();

  // Re-acquire wake lock if page becomes visible again (e.g. user switches app)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (wakeLock && document.visibilityState === 'visible') {
        await requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseWakeLock();
    };
  }, [wakeLock]);

  const toggleIngredient = (i: number) => {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const sourceDomain = (() => {
    try { return new URL(recipe.sourceUrl || '').hostname.replace('www.', ''); } catch { return ''; }
  })();

  const hasInstructions = recipe.instructions.length > 0;
  const progress = hasInstructions ? Math.round(((currentStep) / recipe.instructions.length) * 100) : 0;

  return (
    <div className="space-y-0 pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 py-3 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-lg shrink-0">←</button>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-base leading-tight truncate">{recipe.name}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">⏱ {recipe.cookTime}</span>
              <span className="text-[10px] text-muted-foreground">👥 {recipe.servings} servings</span>
              {recipe.instructionSource === 'real' && <span className="text-[10px] text-green-400">✓ Real recipe</span>}
              {recipe.instructionSource === 'ai' && <span className="text-[10px] text-blue-400">✨ AI instructions</span>}
            </div>
          </div>
          {wakeLockSupported && (
            <button
              onClick={toggleWakeLock}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all shrink-0 ${
                wakeLock
                  ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30'
              }`}
              title={wakeLock ? 'Screen will stay on — tap to turn off' : 'Keep screen awake while cooking'}
            >
              {wakeLock ? '☀️ On' : '🌙 Off'}
            </button>
          )}
        </div>

        {/* Progress bar — only shown if instructions exist */}
        {hasInstructions && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">
                {currentStep === 0 ? 'Not started' : currentStep === recipe.instructions.length ? '✓ Complete!' : `Step ${currentStep} of ${recipe.instructions.length}`}
              </span>
              <span className="text-[10px] text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Nutrition strip */}
      {recipe.macros.calories > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-4 px-4">
          {[
            { label: 'Cal', value: recipe.macros.calories, unit: '', color: 'text-orange-400' },
            { label: 'Protein', value: recipe.macros.protein, unit: 'g', color: 'text-blue-400' },
            { label: 'Carbs', value: recipe.macros.carbs, unit: 'g', color: 'text-yellow-400' },
            { label: 'Fat', value: recipe.macros.fat, unit: 'g', color: 'text-red-400' },
            { label: 'Fiber', value: recipe.macros.fiber, unit: 'g', color: 'text-green-400' },
          ].map(m => (
            <div key={m.label} className="text-center p-2 rounded-lg bg-card/60 border border-border/40 shrink-0 min-w-[56px]">
              <p className={`text-sm font-bold ${m.color}`}>{m.value}<span className="text-[10px] font-normal opacity-70">{m.unit}</span></p>
              <p className="text-[10px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Ingredients */}
      <div className="mb-6">
        <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
          Ingredients
          <span className="ml-2 text-[10px] font-normal normal-case">({checkedIngredients.size}/{recipe.ingredients.length} ready)</span>
        </h3>
        <div className="space-y-2">
          {recipe.ingredients.map((ing, i) => (
            <button
              key={i}
              onClick={() => toggleIngredient(i)}
              className={`w-full text-left flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                checkedIngredients.has(i)
                  ? 'border-primary/30 bg-primary/5 opacity-60'
                  : 'border-border/40 bg-card/40 hover:border-primary/20'
              }`}
            >
              <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center text-[10px] transition-all ${
                checkedIngredients.has(i) ? 'bg-primary border-primary text-primary-foreground' : 'border-border/60'
              }`}>
                {checkedIngredients.has(i) ? '✓' : ''}
              </span>
              <span className={`text-sm ${checkedIngredients.has(i) ? 'line-through text-muted-foreground' : ''}`}>{ing}</span>
            </button>
          ))}
        </div>
      </div>

      <Separator className="opacity-30 mb-6" />

      {/* Instructions */}
      {hasInstructions ? (
        <div className="mb-6">
          <h3 className="font-display font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">Instructions</h3>
          <div className="space-y-3">
            {recipe.instructions.map((step, i) => {
              const stepNum = i + 1;
              const isActive = currentStep === i;
              const isDone = currentStep > i;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentStep(isDone ? i : stepNum)}
                  className={`w-full text-left flex items-start gap-3 p-3.5 rounded-xl border transition-all ${
                    isDone
                      ? 'border-primary/20 bg-primary/5 opacity-50'
                      : isActive
                      ? 'border-primary/60 bg-primary/10 shadow-sm'
                      : 'border-border/40 bg-card/40 hover:border-primary/20'
                  }`}
                >
                  <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all mt-0.5 ${
                    isDone ? 'bg-primary text-primary-foreground' : isActive ? 'bg-primary/20 text-primary border-2 border-primary/60' : 'bg-secondary text-muted-foreground'
                  }`}>
                    {isDone ? '✓' : stepNum}
                  </span>
                  <div className="flex-1 min-w-0">
                    {isActive && (
                      <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">Current Step</p>
                    )}
                    <p className={`text-sm leading-relaxed ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                      {step.replace(/^\d+[.)]\s*/, '')}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Step nav buttons */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline" size="sm"
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="flex-1 text-xs"
            >
              ← Previous
            </Button>
            {currentStep < recipe.instructions.length ? (
              <Button
                size="sm"
                onClick={() => setCurrentStep(s => s + 1)}
                className="flex-1 text-xs bg-primary text-primary-foreground"
              >
                {currentStep === 0 ? 'Start Cooking →' : 'Next Step →'}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setCurrentStep(0)}
                className="flex-1 text-xs bg-green-600 hover:bg-green-700 text-white"
              >
                🎉 Done! Start Over
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-center py-6 space-y-3">
          <p className="text-4xl">📖</p>
          <p className="text-sm text-muted-foreground">Instructions not available in the app.</p>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              View full recipe on {sourceDomain} →
            </a>
          )}
        </div>
      )}

      {/* Source link */}
      {recipe.sourceUrl && hasInstructions && (
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          📖 Original recipe on {sourceDomain} →
        </a>
      )}

    </div>
  );
}
