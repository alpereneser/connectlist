import { useQuery } from '@tanstack/react-query';
import { getPersonDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function usePersonDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.personDetails(id),
    queryFn: () => getPersonDetails(id),
    enabled: !!id,
  });
}