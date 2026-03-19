import { useState, useEffect, useCallback } from 'react';
import { db, doc, setDoc, onSnapshot } from '@/firebase';
import type { User } from '@/firebase';
import type { UserSettings } from '@/types';

const LS_KEY = 'mealmate-settings';

// Syncs user settings to Firestore users/{uid}/data/settings so they
// persist and sync across all signed-in devices. Falls back to
// localStorage when offline or not signed in.
export function useUserSettings(user: User | null, defaultValue: UserSettings) {
  const [data, setData] = useState<UserSettings>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return { ...defaultValue, ...JSON.parse(stored) };
    } catch {}
    return defaultValue;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoaded(true);
      return;
    }
    const ref = doc(db, 'users', user.uid, 'data', 'settings');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const remote = snap.data() as UserSettings;
        const merged = { ...defaultValue, ...remote };
        setData(merged);
        localStorage.setItem(LS_KEY, JSON.stringify(merged));
      }
      setLoaded(true);
    }, () => {
      // Snapshot error (e.g. offline) — loaded from localStorage already
      setLoaded(true);
    });
    return unsub;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (newData: UserSettings) => {
    setData(newData);
    localStorage.setItem(LS_KEY, JSON.stringify(newData));
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'data', 'settings'), newData);
      } catch (e) {
        console.error('Settings sync error:', e);
      }
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, save, loaded };
}
