import { useQuery } from '@tanstack/react-query';
import { getMovieDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useMovieDetails(id: string) {
  return useQuery({
    queryKey: queryKeys.movieDetails(id),
    queryFn: () => getMovieDetails(id),
    enabled: !!id,
  });
}