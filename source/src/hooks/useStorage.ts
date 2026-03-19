import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    storage?: {
      get: (key: string, shared?: boolean) => Promise<{ key: string; value: string; shared: boolean } | null>;
      set: (key: string, value: string, shared?: boolean) => Promise<{ key: string; value: string; shared: boolean } | null>;
      delete: (key: string, shared?: boolean) => Promise<{ key: string; deleted: boolean; shared: boolean } | null>;
      list: (prefix?: string, shared?: boolean) => Promise<{ keys: string[]; prefix?: string; shared: boolean } | null>;
    };
  }
}

// Use Claude artifact storage if available, otherwise fall back to localStorage
export function useStorage<T>(key: string, defaultValue: T, shared: boolean = true) {
  const [data, setData] = useState<T>(() => {
    // Sync read from localStorage on first render to avoid flash
    try {
      const stored = localStorage.getItem(key);
      if (stored) return JSON.parse(stored);
    } catch {}
    return defaultValue;
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.storage) {
          // Claude artifact environment — use artifact storage
          const result = await window.storage.get(key, shared);
          if (result?.value) {
            setData(JSON.parse(result.value));
          }
        }
        // localStorage was already read in useState initializer
      } catch {
        // Key doesn't exist, use default
      }
      setLoaded(true);
    };
    load();
  }, [key, shared]);

  const save = useCallback(async (newData: T) => {
    setData(newData);
    try {
      // Always save to localStorage (works on standalone sites)
      localStorage.setItem(key, JSON.stringify(newData));
      // Also save to artifact storage if available (works in Claude)
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(newData), shared);
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }, [key, shared]);

  return { data, save, loaded };
}
