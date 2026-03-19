import { useState, useEffect, useCallback, useRef } from 'react';
import { db, doc, setDoc, onSnapshot } from '@/firebase';
import type { User } from '@/firebase';
import type { UserSettings } from '@/types';

// Per-user localStorage key — never shared between accounts on the same device.
function lsKey(uid: string) { return `mealmate-settings-${uid}`; }

// Wipe every mealmate-settings-* key that does NOT belong to the current user.
// Called on sign-in so no previous account's data is left in localStorage.
function clearOtherUsersCache(currentUid: string) {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('mealmate-settings-') && k !== lsKey(currentUid)) {
      toRemove.push(k);
    }
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

export function useUserSettings(user: User | null, defaultValue: UserSettings) {
  // Always start with defaults — never seed from a shared/anonymous localStorage key.
  const [data, setData] = useState<UserSettings>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const prevUidRef = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.uid ?? null;

    // User changed (including sign-out) → reset to defaults immediately
    // so no previous user's data is ever visible to the new one.
    if (uid !== prevUidRef.current) {
      setData(defaultValue);
      setLoaded(false);
      prevUidRef.current = uid;
    }

    if (!uid) {
      setLoaded(true);
      return;
    }

    // Safe: remove any other user's cached settings on this device.
    clearOtherUsersCache(uid);

    // Warm load from this user's own localStorage cache to avoid blank flash.
    try {
      const cached = localStorage.getItem(lsKey(uid));
      if (cached) setData({ ...defaultValue, ...JSON.parse(cached) });
    } catch {}

    // Live sync from Firestore — source of truth.
    const unsub = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const remote = snap.data()?.settings as UserSettings | undefined;
          if (remote) {
            const merged = { ...defaultValue, ...remote };
            setData(merged);
            localStorage.setItem(lsKey(uid), JSON.stringify(merged));
          }
        }
        setLoaded(true);
      },
      (_err) => {
        // Offline — already loaded from per-user cache above.
        setLoaded(true);
      }
    );

    return unsub;
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(async (newData: UserSettings) => {
    setData(newData);
    const uid = user?.uid;
    if (uid) {
      // Cache under per-user key only.
      localStorage.setItem(lsKey(uid), JSON.stringify(newData));
      try {
        await setDoc(doc(db, 'users', uid), { settings: newData }, { merge: true });
      } catch (e) {
        console.error('Settings sync error:', e);
      }
    }
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, save, loaded };
}
