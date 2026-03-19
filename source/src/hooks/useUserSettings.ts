import { useState, useEffect, useCallback } from 'react';
import { db, doc, setDoc, onSnapshot } from '@/firebase';
import type { User } from '@/firebase';
import type { UserSettings } from '@/types';

const LS_KEY = 'mealmate-settings';

// Stores settings in the user document at users/{uid} as a 'settings' field.
// This is the SAME document path useHousehold already reads/writes, so it
// is always covered by Firestore rules. Previously used users/{uid}/data/settings
// (a subcollection) which was blocked by rules and failed silently.
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

    // Listen to the top-level user doc — same path useHousehold uses,
    // so Firestore rules always permit it.
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data()?.settings as UserSettings | undefined;
          if (remote) {
            const merged = { ...defaultValue, ...remote };
            setData(merged);
            localStorage.setItem(LS_KEY, JSON.stringify(merged));
          }
        }
        setLoaded(true);
      },
      (_err) => {
        // Offline or rules error — already loaded from localStorage
        setLoaded(true);
      }
    );

    return unsub;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (newData: UserSettings) => {
    setData(newData);
    localStorage.setItem(LS_KEY, JSON.stringify(newData));
    if (user) {
      try {
        // Merge into the user doc so we don't overwrite householdId etc.
        await setDoc(
          doc(db, 'users', user.uid),
          { settings: newData },
          { merge: true }
        );
      } catch (e) {
        console.error('Settings sync error:', e);
      }
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, save, loaded };
}
