import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

type Post = Database['public']['Tables']['posts']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type PostWithProfile = Post & {
  user_profile: Profile;
  user_has_liked: boolean;
};

export type CommentWithProfile = Comment & {
  user_profile: Profile;
};

interface FeedState {
  posts: PostWithProfile[];
  commentsMap: Record<string, CommentWithProfile[]>;
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  currentPage: number;

  // Feed fetching
  fetchFeed: (userId: string, tab: 'foryou' | 'following', reset?: boolean) => Promise<void>;
  fetchComments: (postId: string) => Promise<void>;

  // Interactions
  toggleLike: (postId: string, userId: string) => Promise<void>;
  addComment: (postId: string, userId: string, commentText: string) => Promise<{ error: string | null }>;
  createPost: (
    userId: string,
    data: {
      post_type: 'video' | 'photo' | 'build_update' | 'meet_recap';
      media_url: string;
      video_url?: string;
      thumbnail_url?: string;
      caption: string;
      tags: string[];
      vehicle_id?: string;
    }
  ) => Promise<{ error: string | null }>;

  // Media upload
  uploadPostMedia: (userId: string, uri: string, fileName: string, mimeType: string) => Promise<{ url: string | null; error: string | null }>;

  // Realtime
  subscribeToFeed: () => RealtimeChannel;
  unsubscribeFromFeed: () => void;
  _channel: RealtimeChannel | null;
}

const PAGE_SIZE = 10;

const DEFAULT_FEED_POSTS: PostWithProfile[] = [
  {
    id: 'demo-post-1',
    user_id: 'demo-user-1',
    post_type: 'video',
    media_url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4',
    video_url: null,
    thumbnail_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
    caption: 'Dialing in the new turbo setup! 🚀 Boost hits hard. #ApexUGR #Tuned',
    tags: ['#ApexUGR', '#Tuned'],
    vehicle_id: null,
    likes_count: 1420,
    comments_count: 89,
    reposts_count: 12,
    created_at: new Date().toISOString(),
    user_profile: {
      id: 'demo-user-1',
      username: 'BoostedV8',
      display_name: 'Alex Mercer',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      bio: 'Track day enthusiast',
      reputation_level: 'PRO',
      reputation_points: 4500,
      credits_balance: 12000,
      races_won: 45,
      races_total: 60,
      top_speed_recorded: 165,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_verified: true,
      home_city: 'Los Angeles'
    } as any,
    user_has_liked: false,
  },
  {
    id: 'demo-post-2',
    user_id: 'demo-user-2',
    post_type: 'photo',
    media_url: 'https://images.unsplash.com/photo-1503371456621-0a6d0c41031f?q=80&w=800&auto=format&fit=crop',
    video_url: null,
    thumbnail_url: null,
    caption: 'Late night canyon run with the crew. 🌙 #NightRun #ApexUGR',
    tags: ['#NightRun', '#ApexUGR'],
    vehicle_id: null,
    likes_count: 843,
    comments_count: 24,
    reposts_count: 5,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    user_profile: {
      id: 'demo-user-2',
      username: 'MidnightRunner',
      display_name: 'Sarah J.',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
      bio: 'Canyon carver',
      reputation_level: 'VETERAN',
      reputation_points: 3200,
      credits_balance: 8500,
      races_won: 22,
      races_total: 40,
      top_speed_recorded: 142,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_verified: false,
      home_city: 'Malibu'
    } as any,
    user_has_liked: true,
  }
];

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: DEFAULT_FEED_POSTS,
  commentsMap: {},
  isLoading: false,
  isLoadingMore: false,
  error: null,
  hasMore: true,
  currentPage: 0,
  _channel: null,

  // ─── Fetch feed ───────────────────────────────────────────────────────────
  fetchFeed: async (userId, tab, reset = false) => {
    const page = reset ? 0 : get().currentPage;
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    set(reset ? { isLoading: true, error: null } : { isLoadingMore: true });

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          user_profile:profiles!posts_user_id_fkey(*),
          user_has_liked:post_likes!left(id)
        `)
        .range(from, to)
        .order('created_at', { ascending: false });

      if (tab === 'following') {
        // Only show posts from users the current user follows
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        const followingIds = followData?.map((f) => f.following_id) || [];
        if (followingIds.length === 0) {
          set({ posts: reset ? [] : get().posts, isLoading: false, isLoadingMore: false, hasMore: false });
          return;
        }
        query = query.in('user_id', followingIds);
      }

      const { data, error } = await query;

      if (error) {
        if (reset) set({ posts: DEFAULT_FEED_POSTS, isLoading: false, isLoadingMore: false });
        else set({ error: error.message, isLoading: false, isLoadingMore: false });
        return;
      }

      if (reset && (!data || data.length === 0)) {
        set({ posts: DEFAULT_FEED_POSTS, isLoading: false, isLoadingMore: false, hasMore: false });
        return;
      }

      // Normalize the liked status — post_likes returns an array if joined
      const normalized: PostWithProfile[] = (data || []).map((post: any) => ({
        ...post,
        user_has_liked: Array.isArray(post.user_has_liked)
          ? post.user_has_liked.some((like: any) => like !== null)
          : !!post.user_has_liked,
      }));

      set((state) => ({
        posts: reset ? normalized : [...state.posts, ...normalized],
        currentPage: page + 1,
        hasMore: normalized.length === PAGE_SIZE,
        isLoading: false,
        isLoadingMore: false,
      }));
    } catch (err: any) {
      if (reset) {
        set({ posts: DEFAULT_FEED_POSTS, isLoading: false, isLoadingMore: false, hasMore: false });
      } else {
        set({ error: err?.message || 'Failed to load feed', isLoading: false, isLoadingMore: false });
      }
    }
  },

  // ─── Fetch comments ───────────────────────────────────────────────────────
  fetchComments: async (postId) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, user_profile:profiles!comments_user_id_fkey(*)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        set((state) => ({
          commentsMap: { ...state.commentsMap, [postId]: data as CommentWithProfile[] },
        }));
      }
    } catch (err) {
      console.error('[FeedStore] fetchComments error:', err);
    }
  },

  // ─── Toggle like ──────────────────────────────────────────────────────────
  toggleLike: async (postId, userId) => {
    const post = get().posts.find((p) => p.id === postId);
    if (!post) return;

    const wasLiked = post.user_has_liked;

    // Optimistic update
    set((state) => ({
      posts: state.posts.map((p) =>
        p.id === postId
          ? {
              ...p,
              user_has_liked: !wasLiked,
              likes_count: wasLiked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      ),
    }));

    try {
      if (wasLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: userId });
      }
    } catch (err) {
      // Revert optimistic update on failure
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === postId
            ? { ...p, user_has_liked: wasLiked, likes_count: post.likes_count }
            : p
        ),
      }));
    }
  },

  // ─── Add comment ──────────────────────────────────────────────────────────
  addComment: async (postId, userId, commentText) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, comment_text: commentText })
        .select('*, user_profile:profiles!comments_user_id_fkey(*)')
        .single();

      if (error) return { error: error.message };

      set((state) => ({
        commentsMap: {
          ...state.commentsMap,
          [postId]: [...(state.commentsMap[postId] || []), data as CommentWithProfile],
        },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to post comment' };
    }
  },

  // ─── Create post ──────────────────────────────────────────────────────────
  createPost: async (userId, postData) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({ ...postData, user_id: userId })
        .select('*, user_profile:profiles!posts_user_id_fkey(*)')
        .single();

      if (error) return { error: error.message };

      const newPost: PostWithProfile = { ...(data as any), user_has_liked: false };

      set((state) => ({
        posts: [newPost, ...state.posts],
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to create post' };
    }
  },

  // ─── Upload media to Supabase Storage ─────────────────────────────────────
  uploadPostMedia: async (userId, uri, fileName, mimeType) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filePath = `posts/${userId}/${Date.now()}_${fileName}`;

      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(filePath, blob, { contentType: mimeType, upsert: false });

      if (error) return { url: null, error: error.message };

      const { data: urlData } = supabase.storage
        .from('post-media')
        .getPublicUrl(filePath);

      return { url: urlData.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err?.message || 'Upload failed' };
    }
  },

  // ─── Realtime subscription ────────────────────────────────────────────────
  subscribeToFeed: () => {
    const channel = supabase
      .channel('feed-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          // Fetch the full post with profile when a new post appears
          const { data } = await supabase
            .from('posts')
            .select('*, user_profile:profiles!posts_user_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            set((state) => ({
              posts: [{ ...(data as any), user_has_liked: false }, ...state.posts],
            }));
          }
        }
      )
      .subscribe();

    set({ _channel: channel });
    return channel;
  },

  unsubscribeFromFeed: () => {
    const { _channel } = get();
    if (_channel) {
      supabase.removeChannel(_channel);
      set({ _channel: null });
    }
  },
}));
