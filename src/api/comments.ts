import { supabase } from '../lib/supabase';

export interface Comment {
  id: string;
  content_type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place';
  content_id: string;
  user_id: string;
  parent_comment_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  replies?: Comment[];
}

export interface CreateCommentData {
  content_type: 'movie' | 'series' | 'book' | 'game' | 'person' | 'place';
  content_id: string;
  content: string;
  parent_comment_id?: string;
}

// Yorumları getir
export async function getComments(
  contentType: string,
  contentId: string
): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('content_comments')
      .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq('content_type', contentType)
      .eq('content_id', contentId)
      .is('parent_comment_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Yorumlar getirilemedi:', error);
      return [];
    }

    // Her yorum için yanıtları getir
    const commentsWithReplies = await Promise.all(
      (data || []).map(async (comment) => {
        const replies = await getReplies(comment.id);
        return { ...comment, replies };
      })
    );

    return commentsWithReplies;
  } catch (error) {
    console.error('Yorumlar getirilemedi:', error);
    return [];
  }
}

// Yanıtları getir
export async function getReplies(parentCommentId: string): Promise<Comment[]> {
  try {
    const { data, error } = await supabase
      .from('content_comments')
      .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
      .eq('parent_comment_id', parentCommentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Yanıtlar getirilemedi:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Yanıtlar getirilemedi:', error);
    return [];
  }
}

// Yorum ekle
export async function createComment(
  commentData: CreateCommentData
): Promise<Comment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Kullanıcı oturum açmamış');
    }

    const { data, error } = await supabase
      .from('content_comments')
      .insert({
        ...commentData,
        user_id: user.id
      })
      .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
      .single();

    if (error) {
      console.error('Yorum eklenemedi:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Yorum eklenemedi:', error);
    return null;
  }
}

// Yorum güncelle
export async function updateComment(
  commentId: string,
  content: string
): Promise<Comment | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Kullanıcı oturum açmamış');
    }

    const { data, error } = await supabase
      .from('content_comments')
      .update({ 
        content,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .eq('user_id', user.id)
      .select(`
        *,
        user:user_id (
          id,
          email,
          user_metadata
        )
      `)
      .single();

    if (error) {
      console.error('Yorum güncellenemedi:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Yorum güncellenemedi:', error);
    return null;
  }
}

// Yorum sil
export async function deleteComment(commentId: string): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Kullanıcı oturum açmamış');
    }

    const { error } = await supabase
      .from('content_comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Yorum silinemedi:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Yorum silinemedi:', error);
    return false;
  }
}

// Yorum sayısını getir
export async function getCommentCount(
  contentType: string,
  contentId: string
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('content_comments')
      .select('*', { count: 'exact', head: true })
      .eq('content_type', contentType)
      .eq('content_id', contentId);

    if (error) {
      console.error('Yorum sayısı getirilemedi:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Yorum sayısı getirilemedi:', error);
    return 0;
  }
}