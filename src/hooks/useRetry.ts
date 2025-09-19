import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onMaxRetriesReached?: () => void;
}

interface UseRetryReturn<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  retryCount: number;
  execute: () => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
}

export function useRetry<T>(
  asyncFunction: () => Promise<T>,
  options: UseRetryOptions = {}
): UseRetryReturn<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onMaxRetriesReached
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await asyncFunction();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      
      if (retryCount < maxRetries) {
        onRetry?.(retryCount + 1);
        setRetryCount(prev => prev + 1);
        
        // Exponential backoff
        const delay = retryDelay * Math.pow(2, retryCount);
        setTimeout(() => {
          execute();
        }, delay);
      } else {
        onMaxRetriesReached?.();
      }
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction, retryCount, maxRetries, retryDelay, onRetry, onMaxRetriesReached]);

  const retry = useCallback(async () => {
    setRetryCount(0);
    await execute();
  }, [execute]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setRetryCount(0);
  }, []);

  return {
    data,
    error,
    isLoading,
    retryCount,
    execute,
    retry,
    reset
  };
}

export default useRetry;