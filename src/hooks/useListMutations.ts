import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateList, deleteList } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';

export function useListMutations(listId: string) {
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: {
      title: string;
      description: string;
      items: Array<{
        external_id: string;
        title: string;
        image_url: string;
        type: string;
        year?: string;
        description?: string;
      }>;
    }) => updateList(listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetails(listId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteList(listId),
    onSuccess: () => {
      // Tüm listeleri içeren sorguyu geçersiz kıl
      queryClient.invalidateQueries({ queryKey: queryKeys.lists() });
      // Kullanıcının listelerini içeren sorguyu geçersiz kıl
      queryClient.invalidateQueries({ queryKey: queryKeys.userLists() });
      // Silinen listenin detaylarını içeren sorguyu geçersiz kıl
      queryClient.invalidateQueries({ queryKey: queryKeys.listDetails(listId) });
      // Anasayfadaki listeleri yeniden yükle
      queryClient.refetchQueries({ queryKey: queryKeys.lists() });
    },
  });

  return {
    updateList: updateMutation.mutate,
    deleteList: deleteMutation.mutate,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    updateError: updateMutation.error,
    deleteError: deleteMutation.error,
  };
}