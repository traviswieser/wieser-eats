import { useState, useEffect, useCallback } from 'react';
import {
  db, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, onSnapshot, serverTimestamp,
} from '@/firebase';
import type { User } from '@/firebase';
import type { PantryItem, Recipe, MealPlanEntry, ShoppingItem } from '@/types';

const COLORS = ['#F97316','#3B82F6','#10B981','#A855F7','#EC4899','#EAB308','#06B6D4','#EF4444'];

export interface HouseholdMember {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
  color: string;
}

export interface Household {
  id: string;
  name: string;
  code: string;
  members: Record<string, HouseholdMember>;
  createdBy: string;
}

export interface SharedData {
  pantry: PantryItem[];
  mealPlan: (MealPlanEntry & { addedBy?: string })[];
  shopping: ShoppingItem[];
  favorites: (Recipe & { addedBy?: string })[];
}

function genCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function useHousehold(user: User | null) {
  const [household, setHousehold] = useState<Household | null>(null);
  const [shared, setShared] = useState<SharedData>({ pantry: [], mealPlan: [], shopping: [], favorites: [] });
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  // Load user's household ID
  useEffect(() => {
    if (!user) { setHousehold(null); setLoading(false); return; }
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.data();
      setHouseholdId(data?.householdId || null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Listen to household doc
  useEffect(() => {
    if (!householdId) { setHousehold(null); return; }
    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() } as Household);
      } else {
        setHousehold(null);
      }
    });
    return unsub;
  }, [householdId]);

  // Listen to shared data collections
  useEffect(() => {
    if (!householdId) { setShared({ pantry: [], mealPlan: [], shopping: [], favorites: [] }); return; }
    const unsubs: (() => void)[] = [];

    unsubs.push(onSnapshot(doc(db, 'households', householdId, 'data', 'pantry'), (snap) => {
      setShared(prev => ({ ...prev, pantry: snap.data()?.items || [] }));
    }));
    unsubs.push(onSnapshot(doc(db, 'households', householdId, 'data', 'mealplan'), (snap) => {
      setShared(prev => ({ ...prev, mealPlan: snap.data()?.items || [] }));
    }));
    unsubs.push(onSnapshot(doc(db, 'households', householdId, 'data', 'shopping'), (snap) => {
      setShared(prev => ({ ...prev, shopping: snap.data()?.items || [] }));
    }));
    unsubs.push(onSnapshot(doc(db, 'households', householdId, 'data', 'favorites'), (snap) => {
      setShared(prev => ({ ...prev, favorites: snap.data()?.items || [] }));
    }));

    return () => unsubs.forEach(u => u());
  }, [householdId]);

  const createHousehold = useCallback(async (name: string) => {
    if (!user) return;
    const code = genCode();
    const id = `hh_${Date.now()}`;
    const member: HouseholdMember = {
      uid: user.uid,
      name: user.displayName || user.email || 'User',
      email: user.email || '',
      photoURL: user.photoURL,
      color: COLORS[0],
    };
    await setDoc(doc(db, 'households', id), {
      name, code, members: { [user.uid]: member }, createdBy: user.uid, createdAt: serverTimestamp(),
    });
    // Initialize empty data docs
    await setDoc(doc(db, 'households', id, 'data', 'pantry'), { items: [] });
    await setDoc(doc(db, 'households', id, 'data', 'mealplan'), { items: [] });
    await setDoc(doc(db, 'households', id, 'data', 'shopping'), { items: [] });
    await setDoc(doc(db, 'households', id, 'data', 'favorites'), { items: [] });
    await setDoc(doc(db, 'users', user.uid), { householdId: id }, { merge: true });
  }, [user]);

  const joinHousehold = useCallback(async (code: string): Promise<string | null> => {
    if (!user) return 'Not signed in';
    // Find household by code
    const q = query(collection(db, 'households'), where('code', '==', code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return 'No household found with that code';
    const hhDoc = snap.docs[0];
    const hh = hhDoc.data();
    const memberCount = Object.keys(hh.members || {}).length;
    const color = COLORS[memberCount % COLORS.length];
    const member: HouseholdMember = {
      uid: user.uid,
      name: user.displayName || user.email || 'User',
      email: user.email || '',
      photoURL: user.photoURL,
      color,
    };
    await updateDoc(doc(db, 'households', hhDoc.id), { [`members.${user.uid}`]: member });
    await setDoc(doc(db, 'users', user.uid), { householdId: hhDoc.id }, { merge: true });
    return null;
  }, [user]);

  const leaveHousehold = useCallback(async () => {
    if (!user || !householdId || !household) return;
    const remaining = Object.keys(household.members).filter(uid => uid !== user.uid);
    if (remaining.length === 0) {
      // Last member - delete household
      await deleteDoc(doc(db, 'households', householdId, 'data', 'pantry'));
      await deleteDoc(doc(db, 'households', householdId, 'data', 'mealplan'));
      await deleteDoc(doc(db, 'households', householdId, 'data', 'shopping'));
      await deleteDoc(doc(db, 'households', householdId, 'data', 'favorites'));
      await deleteDoc(doc(db, 'households', householdId));
    } else {
      await updateDoc(doc(db, 'households', householdId), { [`members.${user.uid}`]: deleteDoc as any });
    }
    await setDoc(doc(db, 'users', user.uid), { householdId: null }, { merge: true });
  }, [user, householdId, household]);

  // Shared data setters
  const savePantry = useCallback(async (items: PantryItem[]) => {
    if (!householdId) return;
    await setDoc(doc(db, 'households', householdId, 'data', 'pantry'), { items });
  }, [householdId]);

  const saveMealPlan = useCallback(async (items: MealPlanEntry[]) => {
    if (!householdId) return;
    await setDoc(doc(db, 'households', householdId, 'data', 'mealplan'), { items });
  }, [householdId]);

  const saveShopping = useCallback(async (items: ShoppingItem[]) => {
    if (!householdId) return;
    await setDoc(doc(db, 'households', householdId, 'data', 'shopping'), { items });
  }, [householdId]);

  const saveFavorites = useCallback(async (items: Recipe[]) => {
    if (!householdId) return;
    await setDoc(doc(db, 'households', householdId, 'data', 'favorites'), { items });
  }, [householdId]);

  const getMemberColor = useCallback((uid?: string) => {
    if (!uid || !household) return '#888';
    return household.members[uid]?.color || '#888';
  }, [household]);

  const getMemberName = useCallback((uid?: string) => {
    if (!uid || !household) return 'Unknown';
    return household.members[uid]?.name || 'Unknown';
  }, [household]);

  return {
    household, loading, shared, householdId,
    createHousehold, joinHousehold, leaveHousehold,
    savePantry, saveMealPlan, saveShopping, saveFavorites,
    getMemberColor, getMemberName,
  };
}
