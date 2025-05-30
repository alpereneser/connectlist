import { useState } from 'react';

export function useApi<T>(apiCall: (...args: any[]) => Promise<T>) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = async (...args: any[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiCall(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error, data };
}