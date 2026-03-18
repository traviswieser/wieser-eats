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

export function useStorage<T>(key: string, defaultValue: T, shared: boolean = true) {
  const [data, setData] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        if (window.storage) {
          const result = await window.storage.get(key, shared);
          if (result?.value) {
            setData(JSON.parse(result.value));
          }
        }
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
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(newData), shared);
      }
    } catch (e) {
      console.error('Storage save error:', e);
    }
  }, [key, shared]);

  return { data, save, loaded };
}
