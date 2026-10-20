'use client';

import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export function readDemoValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeDemoValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be unavailable in private browsing or when quota is exceeded.
  }
}

export function useDemoValue<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
  const initialValueRef = useRef(initialValue);
  const [value, setValue] = useState(initialValue);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setValue(readDemoValue(key, initialValueRef.current));
    setReady(true);
  }, [key]);

  useEffect(() => {
    if (ready) writeDemoValue(key, value);
  }, [key, ready, value]);

  return [value, setValue, ready];
}
