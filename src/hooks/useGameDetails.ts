import { useQuery } from '@tanstack/react-query';
import { getGameDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useGameDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.gameDetails(id),
    queryFn: () => getGameDetails(id),
    enabled: !!id,
  });
}