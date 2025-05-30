import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { likeList, unlikeList, checkIfLiked } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useLikeMutation(listId: string) {
  const queryClient = useQueryClient();

  const { data: isLiked } = useQuery({
    queryKey: ['isLiked', listId],
    queryFn: () => checkIfLiked(listId),
    enabled: !!listId,
  });

  const likeMutation = useMutation({
    mutationFn: () => likeList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetails(listId) });
      queryClient.invalidateQueries({ queryKey: ['isLiked', listId] });
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: () => unlikeList(listId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetails(listId) });
      queryClient.invalidateQueries({ queryKey: ['isLiked', listId] });
    },
  });

  return {
    isLiked: !!isLiked,
    like: likeMutation.mutate,
    unlike: unlikeMutation.mutate,
    isLiking: likeMutation.isPending,
    isUnliking: unlikeMutation.isPending,
  };
}