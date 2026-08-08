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
  savedPostIds: string[];
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
  toggleSave: (postId: string) => void;
  repostPost: (postId: string) => void;
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

const SEED_POSTS: PostWithProfile[] = [
  {
    id: 'p_seed_1',
    user_id: '00000000-0000-0000-0000-000000000001',
    post_type: 'video',
    media_url: 'https://assets.mixkit.co/videos/preview/mixkit-sports-car-driving-on-a-road-at-night-41584-large.mp4',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-sports-car-driving-on-a-road-at-night-41584-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    caption: '1,150WHP R35 GT-R highway roll sprint against 1000HP Twin Turbo Audi R8 V10! Pure telemetry mayhem.',
    tags: ['#gtr', '#rollrace', '#boosted', '#1000hp'],
    vehicle_id: 'v1',
    likes_count: 342,
    comments_count: 48,
    reposts_count: 14,
    created_at: new Date().toISOString(),
    user_has_liked: true,
    user_profile: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'phantom_gtr',
      display_name: 'Ryder Vance',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      bio: '1,150WHP R35 GT-R. Drag & Roll race pilot.',
      home_city: 'Los Angeles, CA',
      reputation_points: 1850,
      reputation_level: 'master',
      credits_balance: 25000,
      privacy_mode: 'all',
      visibility_radius_km: 25,
      is_verified: true,
      push_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any,
  },
  {
    id: 'p_seed_2',
    user_id: '00000000-0000-0000-0000-000000000002',
    post_type: 'video',
    media_url: 'https://assets.mixkit.co/videos/preview/mixkit-red-sports-car-driving-fast-on-a-road-41582-large.mp4',
    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-red-sports-car-driving-fast-on-a-road-41582-large.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?q=80&w=800&auto=format&fit=crop',
    caption: 'Angeles Crest Highway downhill attack in the 992 GT3 RS. 1.35 G cornering load locked in.',
    tags: ['#gt3rs', '#canyoncarving', '#porsche', '#telemetry'],
    vehicle_id: 'v2',
    likes_count: 512,
    comments_count: 64,
    reposts_count: 28,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    user_has_liked: false,
    user_profile: {
      id: '00000000-0000-0000-0000-000000000002',
      username: 'apex_gt3',
      display_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
      bio: '992 GT3 RS Canyon Carver. Track telemetry addict.',
      home_city: 'Malibu, CA',
      reputation_points: 2100,
      reputation_level: 'legend',
      credits_balance: 45000,
      privacy_mode: 'all',
      visibility_radius_km: 50,
      is_verified: true,
      push_token: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any,
  },
];

export const useFeedStore = create<FeedState>((set, get) => ({
  posts: SEED_POSTS,
  savedPostIds: [],
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

    set(reset ? { isLoading: get().posts.length === 0, error: null } : { isLoadingMore: true });

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
        set({ error: error.message, isLoading: false, isLoadingMore: false });
        return;
      }

      if (!data || data.length === 0) {
        if (tab === 'foryou') {
          const SEED_POSTS: PostWithProfile[] = [
            {
              id: 'p_seed_1',
              user_id: '00000000-0000-0000-0000-000000000001',
              post_type: 'video',
              media_url: 'https://assets.mixkit.co/videos/preview/mixkit-sports-car-driving-on-a-road-at-night-41584-large.mp4',
              video_url: 'https://assets.mixkit.co/videos/preview/mixkit-sports-car-driving-on-a-road-at-night-41584-large.mp4',
              thumbnail_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
              caption: '1,150WHP R35 GT-R highway roll sprint against 1000HP Twin Turbo Audi R8 V10! Pure telemetry mayhem.',
              tags: ['#gtr', '#rollrace', '#boosted', '#1000hp'],
              vehicle_id: 'v1',
              likes_count: 342,
              comments_count: 48,
              reposts_count: 14,
              created_at: new Date().toISOString(),
              user_has_liked: true,
              user_profile: {
                id: '00000000-0000-0000-0000-000000000001',
                username: 'phantom_gtr',
                display_name: 'Ryder Vance',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
                bio: '1,150WHP R35 GT-R. Drag & Roll race pilot.',
                home_city: 'Los Angeles, CA',
                reputation_points: 1850,
                reputation_level: 'master',
                credits_balance: 25000,
                privacy_mode: 'all',
                visibility_radius_km: 25,
                is_verified: true,
                push_token: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as any,
            },
            {
              id: 'p_seed_2',
              user_id: '00000000-0000-0000-0000-000000000002',
              post_type: 'video',
              media_url: 'https://assets.mixkit.co/videos/preview/mixkit-red-sports-car-driving-fast-on-a-road-41582-large.mp4',
              video_url: 'https://assets.mixkit.co/videos/preview/mixkit-red-sports-car-driving-fast-on-a-road-41582-large.mp4',
              thumbnail_url: 'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?q=80&w=800&auto=format&fit=crop',
              caption: 'Angeles Crest Highway downhill attack in the 992 GT3 RS. 1.35 G cornering load locked in.',
              tags: ['#gt3rs', '#canyoncarving', '#porsche', '#telemetry'],
              vehicle_id: 'v2',
              likes_count: 512,
              comments_count: 64,
              reposts_count: 28,
              created_at: new Date(Date.now() - 3600000).toISOString(),
              user_has_liked: false,
              user_profile: {
                id: '00000000-0000-0000-0000-000000000002',
                username: 'apex_gt3',
                display_name: 'Elena Rostova',
                avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
                bio: '992 GT3 RS Canyon Carver. Track telemetry addict.',
                home_city: 'Malibu, CA',
                reputation_points: 2100,
                reputation_level: 'legend',
                credits_balance: 45000,
                privacy_mode: 'all',
                visibility_radius_km: 50,
                is_verified: true,
                push_token: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as any,
            },
          ];

          set({ posts: SEED_POSTS, isLoading: false, isLoadingMore: false, hasMore: false });
          return;
        }
        set({ posts: reset ? [] : get().posts, isLoading: false, isLoadingMore: false, hasMore: false });
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
      set({ error: err?.message || 'Failed to load feed', isLoading: false, isLoadingMore: false });
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

  toggleSave: (postId) => set((state) => ({
    savedPostIds: state.savedPostIds.includes(postId)
      ? state.savedPostIds.filter((id) => id !== postId)
      : [...state.savedPostIds, postId],
  })),

  repostPost: (postId) => set((state) => ({
    posts: state.posts.map((post) => post.id === postId ? { ...post, reposts_count: post.reposts_count + 1 } : post),
  })),

  // ─── Add comment ──────────────────────────────────────────────────────────
  addComment: async (postId, userId, commentText) => {
    const localComment: CommentWithProfile = {
      id: `local-comment-${Date.now()}`,
      post_id: postId,
      user_id: userId,
      comment_text: commentText,
      parent_id: null,
      created_at: new Date().toISOString(),
      user_profile: {
        ...(SEED_POSTS[0].user_profile as any),
        id: userId,
        username: 'you',
        display_name: 'You',
      },
    } as CommentWithProfile;
    const addLocalComment = () => set((state) => ({
      commentsMap: { ...state.commentsMap, [postId]: [...(state.commentsMap[postId] || []), localComment] },
      posts: state.posts.map((p) => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p),
    }));
    try {
      const request = supabase
        .from('comments')
        .insert({ post_id: postId, user_id: userId, comment_text: commentText })
        .select('*, user_profile:profiles!comments_user_id_fkey(*)')
        .single();
      const { data, error }: any = await Promise.race([
        request,
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'sync timeout' } }), 4000)),
      ]);

      if (error) {
        addLocalComment();
        return { error: null };
      }

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
      addLocalComment();
      return { error: null };
    }
  },

  // ─── Create post ──────────────────────────────────────────────────────────
  createPost: async (userId, postData) => {
    const localPost: PostWithProfile = {
      ...postData,
      id: `local-post-${Date.now()}`,
      user_id: userId,
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      created_at: new Date().toISOString(),
      user_has_liked: false,
      user_profile: { ...(SEED_POSTS[0].user_profile as any), id: userId, username: 'you', display_name: 'You' },
    } as PostWithProfile;
    try {
      const request = supabase
        .from('posts')
        .insert({ ...postData, user_id: userId })
        .select('*, user_profile:profiles!posts_user_id_fkey(*)')
        .single();
      const { data, error }: any = await Promise.race([
        request,
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'sync timeout' } }), 4000)),
      ]);

      if (error) {
        set((state) => ({ posts: [localPost, ...state.posts] }));
        return { error: null };
      }

      const newPost: PostWithProfile = { ...(data as any), user_has_liked: false };

      set((state) => ({
        posts: [newPost, ...state.posts],
      }));

      return { error: null };
    } catch (err: any) {
      set((state) => ({ posts: [localPost, ...state.posts] }));
      return { error: null };
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
