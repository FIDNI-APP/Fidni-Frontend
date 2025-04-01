import { useState, useEffect } from 'react';

/**
 * A hook that debounces a value by delaying updates for the specified time
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set debouncedValue to value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or component unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * A more advanced version of useDebounce that also provides the pending state
 * @param value The value to debounce
 * @param delay The delay in milliseconds
 * @returns An object with the debounced value and a boolean indicating if a change is pending
 */
export function useAdvancedDebounce<T>(value: T, delay: number): { 
  debouncedValue: T;
  isPending: boolean;
} {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isPending, setIsPending] = useState<boolean>(false);

  useEffect(() => {
    if (value !== debouncedValue) {
      setIsPending(true);
      const handler = setTimeout(() => {
        setDebouncedValue(value);
        setIsPending(false);
      }, delay);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay, debouncedValue]);

  return { debouncedValue, isPending };
}