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
    // Only save after the initial mount/load effect has run.
    // isMounted.current ensures the load effect tried to run at least once.
    if (!isMounted.current) {
      return;
    }

    // Do not save the initialValue on the first run after mount
    // if it hasn't been changed by setValue yet. This prevents overwriting
    // the stored value with the default initialValue before loading finishes.
    // We can check if the value is still the initial one passed to the hook.
    // Note: This comparison might be tricky for objects/arrays if they are mutated.
    // Consider a deep comparison or a different flag if initialValue isn't primitive.
    if (storedValue === initialValue) {
        // Check if the value actually exists in storage. If it does, don't overwrite with initial.
        try {
            const currentItem = localStorage.getItem(key);
            if (currentItem !== null && JSON.parse(currentItem) !== initialValue) {
                // console.log("Skipping save of initialValue, stored value exists:", key);
                return;
            }
        } catch (error) {
            console.error(`Error reading localStorage during initial value check for key "${key}":`, error);
            // If read fails, maybe safer not to save initialValue yet.
            return;
        }
    }

    // Avoid re-saving the exact value currently in storage
    try {
        const currentItem = localStorage.getItem(key);
        // Check if currentItem is not null before parsing
        if (currentItem !== null && JSON.stringify(storedValue) === currentItem) {
            // console.log("Skipping save, value already in storage:", key);
            return;
        }
    } catch (error) {
        console.error(`Error reading localStorage before save for key "${key}":`, error);
        // Proceed with saving even if read fails, as the value has changed
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