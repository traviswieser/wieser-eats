import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from '@/firebase';

interface AuthScreenProps {
  logoSrc: string;
}

export function AuthScreen({ logoSrc }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(friendlyError(err.code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6 && mode !== 'reset') {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email);
        setResetSent(true);
      }
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo + Title */}
        <div className="text-center space-y-3">
          <img src={logoSrc} alt="Wieser Eats" className="w-16 h-16 mx-auto object-contain" />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">
              <span className="text-primary">Wieser</span> Eats
            </h1>
            <p className="text-sm text-muted-foreground mt-1">AI-powered meal planning</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-5 space-y-4">
            {/* Google Sign-in */}
            <Button
              variant="outline"
              className="w-full h-11 text-sm font-medium gap-2.5"
              onClick={handleGoogle}
              disabled={loading}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </Button>

            <div className="flex items-center gap-3">
              <Separator className="flex-1 opacity-50" />
              <span className="text-xs text-muted-foreground">or</span>
              <Separator className="flex-1 opacity-50" />
            </div>

            {/* Email Form */}
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-10 text-sm bg-background/50"
                />
              </div>

              {mode !== 'reset' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Password</Label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="h-10 text-sm bg-background/50"
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Confirm Password</Label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    className="h-10 text-sm bg-background/50"
                  />
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive bg-destructive/5 p-2 rounded-md">{error}</p>
              )}

              {resetSent && mode === 'reset' && (
                <p className="text-xs text-green-400 bg-green-400/5 p-2 rounded-md">
                  Password reset email sent! Check your inbox.
                </p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm"
              >
                {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              </Button>
            </form>

            {/* Mode Switchers */}
            <div className="text-center space-y-1.5">
              {mode === 'login' && (
                <>
                  <button onClick={() => { setMode('reset'); setError(null); setResetSent(false); }} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                    Forgot password?
                  </button>
                  <p className="text-xs text-muted-foreground">
                    No account?{' '}
                    <button onClick={() => { setMode('signup'); setError(null); }} className="text-primary font-medium hover:underline">
                      Sign up
                    </button>
                  </p>
                </>
              )}
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  Already have an account?{' '}
                  <button onClick={() => { setMode('login'); setError(null); }} className="text-primary font-medium hover:underline">
                    Sign in
                  </button>
                </p>
              )}
              {mode === 'reset' && (
                <p className="text-xs text-muted-foreground">
                  Remember your password?{' '}
                  <button onClick={() => { setMode('login'); setError(null); setResetSent(false); }} className="text-primary font-medium hover:underline">
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Install as App Instructions */}
        <div className="text-center space-y-2 pt-2 pb-6">
          <p className="text-xs font-semibold text-muted-foreground">Install as an App</p>
          <div className="text-[11px] text-muted-foreground/70 space-y-1 leading-relaxed">
            <p><span className="font-medium text-muted-foreground">Android:</span> Tap the menu (⋮) in Chrome → "Add to Home screen" or "Install app"</p>
            <p><span className="font-medium text-muted-foreground">iPhone/iPad:</span> Tap the Share button (↑) in Safari → "Add to Home Screen"</p>
          </div>
          <p className="text-[10px] text-muted-foreground/50">Full-screen app experience with an icon on your home screen</p>
        </div>
      </div>
    </div>
  );
}

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/user-not-found': return 'No account found with this email.';
    case 'auth/wrong-password': return 'Incorrect password. Try again.';
    case 'auth/invalid-credential': return 'Invalid email or password.';
    case 'auth/email-already-in-use': return 'An account with this email already exists.';
    case 'auth/weak-password': return 'Password must be at least 6 characters.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment.';
    case 'auth/network-request-failed': return 'Network error. Check your connection.';
    default: return 'Something went wrong. Please try again.';
  }
}
