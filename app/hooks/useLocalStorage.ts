import { useState, useEffect, useRef } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void, SaveStatus] {
  // State to store our value, initially set to the passed initialValue
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  // Ref to track if this is the initial mount and load from storage
  const isMounted = useRef(false);

  // Effect to load from localStorage on mount (client-side only)
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true; // Mark as mounted
      try {
        const item = localStorage.getItem(key);
        if (item !== null) {
          setStoredValue(JSON.parse(item) as T);
        } else {
          // If not in storage, set the initial value in storage
          localStorage.setItem(key, JSON.stringify(initialValue));
        }
      } catch (error) {
        console.error(`Error reading from localStorage with key "${key}" on mount:`, error);
        // Keep initialValue if reading fails, but still set it in storage
        localStorage.setItem(key, JSON.stringify(initialValue));
      }
    }
  }, [key, initialValue]); // Only run on mount and if key/initialValue change


  // Save to localStorage whenever value changes
  useEffect(() => {
    // Only save after the initial mount/load effect has run
    if (!isMounted.current) {
      return;
    }

    // Don't re-save the value that was just loaded from storage
    // This check might be overly cautious but prevents an unnecessary write on load
    try {
      const currentStorageValue = localStorage.getItem(key);
      if (currentStorageValue === JSON.stringify(storedValue)) {
         return;
      }
    } catch {
      // Ignore errors reading here, proceed to save
    }

    try {
      setSaveStatus('saving');
      localStorage.setItem(key, JSON.stringify(storedValue));
      setSaveStatus('success');

      // Reset status after delay
      const timer = setTimeout(() => setSaveStatus('idle'), 2000);
      return () => clearTimeout(timer);
    } catch (error) {
      console.error(`Error saving data to localStorage with key "${key}":`, error);
      setSaveStatus('error');
    }
  // Depend on storedValue to trigger save, key is needed if it changes dynamically
  }, [key, storedValue]);

  // Return a wrapped version of useState's setter function
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      // Save state
      setSaveStatus('saving'); // Indicate saving immediately
      setStoredValue(valueToStore);
      // The useEffect above will handle the actual localStorage update
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
      setSaveStatus('error');
    }
  };


  return [storedValue, setValue, saveStatus];
} 