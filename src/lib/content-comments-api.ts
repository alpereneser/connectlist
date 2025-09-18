import { supabaseBrowser as supabase } from './supabase-browser';

export interface ContentComment {
  id: string;
  content_type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place';
  content_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    username: string;
    full_name: string;
    avatar?: string;
  };
  replies?: ContentComment[];
}

export interface CreateContentCommentData {
  content_type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place';
  content_id: string;
  content: string;
  parent_comment_id?: string;
}

// İçerik yorumlarını getir
export async function getContentComments(
  contentType: string,
  contentId: string
): Promise<{ data: ContentComment[] | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from('content_comments')
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar
        )
      `)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Yorumları thread'lere organize et
    const commentThreads = data?.reduce((acc: ContentComment[], comment: ContentComment) => {
      if (!comment.parent_comment_id) {
        comment.replies = data?.filter(reply => reply.parent_comment_id === comment.id) || [];
        acc.push(comment);
      }
      return acc;
    }, []) || [];

    return { data: commentThreads, error: null };
  } catch (error) {
    console.error('Error fetching content comments:', error);
    return { data: null, error };
  }
}

// Yeni yorum ekle
export async function createContentComment(
  commentData: CreateContentCommentData
): Promise<{ data: ContentComment | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('content_comments')
      .insert({
        ...commentData,
        user_id: user.id
      })
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar
        )
      `)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error creating content comment:', error);
    return { data: null, error };
  }
}

// Yorum sil
export async function deleteContentComment(
  commentId: string
): Promise<{ error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('content_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    console.error('Error deleting content comment:', error);
    return { error };
  }
}

// Yorum güncelle
export async function updateContentComment(
  commentId: string,
  content: string
): Promise<{ data: ContentComment | null; error: any }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('content_comments')
      .update({ content })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar
        )
      `)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating content comment:', error);
    return { data: null, error };
  }
}

// Yorum sayısını getir
export async function getContentCommentsCount(
  contentType: string,
  contentId: string
): Promise<{ count: number; error: any }> {
  try {
    const { count, error } = await supabase
      .from('content_comments')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching content comments count:', error);
    return { count: 0, error };
  }
}

// Realtime subscription oluştur
export function subscribeToContentComments(
  contentType: string,
  contentId: string,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`content_comments:${contentType}:${contentId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'content_comments',
      filter: `content_type=eq.${contentType}.and.content_id=eq.${contentId}`
    }, callback)
    .subscribe();
}