import { useQuery } from '@tanstack/react-query';
import { getSeriesDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useSeriesDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.seriesDetails(id),
    queryFn: () => getSeriesDetails(id),
    enabled: !!id,
  });
}