import { useState } from 'react';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

interface ListUser {
  username: string;
  full_name: string;
  avatar: string;
  list_title: string;
  list_id: string;
}

export function useWhoAdded() {
  const [users, setUsers] = useState<ListUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async (contentType: string, contentId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('list_items')
        .select(`
          lists!list_items_list_id_fkey (
            id,
            title,
            user_id,
            profiles!lists_user_id_fkey (
              username,
              full_name,
              avatar
            )
          )
        `)
        .eq('type', contentType)
        .eq('external_id', contentId);

      if (error) throw error;

      // Veri yapısını any olarak ele alıp güvenli bir şekilde erişim sağlayalım
      const listUsers = data.map((item: any) => ({
        username: item.lists.profiles.username || '',
        full_name: item.lists.profiles.full_name || '',
        avatar: `${item.lists.profiles.avatar || ''}${item.lists.profiles.avatar?.includes('?') ? '&' : '?'}t=1`,
        list_title: item.lists.title || '',
        list_id: item.lists.id || '',
        user_id: item.lists.user_id || ''
      }));

      setUsers(listUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bir hata oluştu');
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    users,
    isLoading,
    error,
    fetchUsers
  };
}