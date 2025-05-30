import { useQuery } from '@tanstack/react-query';
import { getBookDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useBookDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.bookDetails(id),
    queryFn: () => getBookDetails(id),
    enabled: !!id,
  });
}