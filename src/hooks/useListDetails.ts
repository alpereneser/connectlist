import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { getListDetails } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { supabaseBrowser as supabase } from '../lib/supabase-browser';

export function useListDetails(id: string) {
  const [isOwner, setIsOwner] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.listDetails(id),
    queryFn: () => getListDetails(id),
    enabled: !!id,
  });

  useEffect(() => {
    const checkOwnership = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      setIsOwner(currentUserId === query.data?.list.user_id);
    };

    if (query.data?.list) {
      checkOwnership();
    }
  }, [query.data?.list]);

  return {
    ...query,
    isOwner
  };
}