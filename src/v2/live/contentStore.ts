import { create } from 'zustand';
import { hasLiveBackend, supabase } from '../../config/supabase';

export type LivePost = {
  id: string;
  userId: string;
  alias: string;
  avatarUrl: string | null;
  mediaUrl: string;
  videoUrl: string | null;
  caption: string;
  likes: number;
  comments: number;
  liked: boolean;
  saved: boolean;
  createdAt: string;
};

export type Ranking = {
  id: string;
  alias: string;
  avatarUrl: string | null;
  tier: string;
  points: number;
  wins: number;
  entered: number;
  topSpeed: number;
};

export type ActiveVehicle = {
  id: string;
  nickname: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engine: string;
  drivetrain: string;
  horsepower: number;
  color: string;
  photoUrl: string | null;
};

export type ProviderProduct = {
  id: string;
  provider: string;
  title: string;
  imageUrl: string | null;
  price: number;
  currency: string;
  condition: string | null;
  seller: string | null;
  shipping: string | null;
  purchaseUrl: string;
  compatibility: string;
};

export type ProviderLink = { name: string; mode: string; url?: string };

interface ContentState {
  userId: string | null;
  profile: { alias: string; displayName: string; credits: number; points: number; tier: string; wins: number; entered: number } | null;
  posts: LivePost[];
  rankings: Ranking[];
  vehicles: ActiveVehicle[];
  activeVehicleId: string | null;
  products: ProviderProduct[];
  providers: ProviderLink[];
  loading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  loadFeed: () => Promise<void>;
  toggleLike: (postId: string) => Promise<void>;
  toggleSave: (postId: string) => Promise<void>;
  addComment: (postId: string, text: string) => Promise<boolean>;
  createPost: (uri: string, caption: string, mediaType: 'photo' | 'video') => Promise<boolean>;
  loadRankings: () => Promise<void>;
  loadVehicles: () => Promise<void>;
  setActiveVehicle: (id: string) => void;
  searchParts: (query: string) => Promise<void>;
}

export const useContentStore = create<ContentState>((set, get) => ({
  userId: null,
  profile: null,
  posts: [],
  rankings: [],
  vehicles: [],
  activeVehicleId: null,
  products: [],
  providers: [],
  loading: false,
  error: null,

  initialize: async () => {
    if (!hasLiveBackend) {
      set({ error: 'Live backend connection required.' });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user.id || null;
    set({ userId, error: userId ? null : 'Sign in to access the live network.' });
    if (!userId) return;
    const profileRequest = supabase.from('profiles').select('username,display_name,credits_balance,reputation_points,reputation_level,stats').eq('id', userId).single();
    const [{ data: profile }] = await Promise.all([profileRequest, get().loadFeed(), get().loadRankings(), get().loadVehicles()]);
    if (profile) set({ profile: { alias: profile.username, displayName: profile.display_name, credits: Number(profile.credits_balance || 0), points: Number(profile.reputation_points || 0), tier: profile.reputation_level, wins: Number((profile.stats as any)?.races_won || 0), entered: Number((profile.stats as any)?.races_entered || 0) } });
  },

  loadFeed: async () => {
    if (!get().userId) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('posts')
      .select('*, user_profile:profiles!posts_user_id_fkey(username,avatar_url), post_likes(user_id), post_saves(user_id)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    const userId = get().userId;
    set({
      loading: false,
      posts: (data || []).map((row: any): LivePost => ({
        id: row.id, userId: row.user_id, alias: row.user_profile?.username || 'UNKNOWN', avatarUrl: row.user_profile?.avatar_url || null,
        mediaUrl: row.media_url, videoUrl: row.video_url, caption: row.caption, likes: Number(row.likes_count || row.post_likes?.length || 0),
        comments: Number(row.comments_count || 0), liked: row.post_likes?.some((like: any) => like.user_id === userId) || false,
        saved: row.post_saves?.some((save: any) => save.user_id === userId) || false, createdAt: row.created_at,
      })),
    });
  },

  toggleLike: async postId => {
    const userId = get().userId;
    const post = get().posts.find(item => item.id === postId);
    if (!userId || !post) return;
    set(state => ({ posts: state.posts.map(item => item.id === postId ? { ...item, liked: !item.liked, likes: Math.max(0, item.likes + (item.liked ? -1 : 1)) } : item) }));
    const request = post.liked
      ? supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId)
      : supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
    const { error } = await request;
    if (error) { set({ error: error.message }); await get().loadFeed(); }
  },

  toggleSave: async postId => {
    const userId = get().userId;
    const post = get().posts.find(item => item.id === postId);
    if (!userId || !post) return;
    set(state => ({ posts: state.posts.map(item => item.id === postId ? { ...item, saved: !item.saved } : item) }));
    const request = post.saved
      ? supabase.from('post_saves').delete().eq('post_id', postId).eq('user_id', userId)
      : supabase.from('post_saves').insert({ post_id: postId, user_id: userId });
    const { error } = await request;
    if (error) { set({ error: error.message }); await get().loadFeed(); }
  },

  addComment: async (postId, text) => {
    const userId = get().userId;
    const clean = text.trim().slice(0, 500);
    if (!userId || !clean) return false;
    const { error } = await supabase.from('comments').insert({ post_id: postId, user_id: userId, comment_text: clean });
    if (error) { set({ error: error.message }); return false; }
    set(state => ({ posts: state.posts.map(post => post.id === postId ? { ...post, comments: post.comments + 1 } : post) }));
    return true;
  },

  createPost: async (uri, caption, mediaType) => {
    const userId = get().userId;
    if (!userId) { set({ error: 'Sign in before posting.' }); return false; }
    set({ loading: true, error: null });
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const extension = mediaType === 'video' ? 'mp4' : (blob.type.split('/')[1] || 'jpg');
      const path = `${userId}/${Date.now()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from('post-media').upload(path, blob, { contentType: blob.type, upsert: false });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from('post-media').getPublicUrl(path);
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: userId, post_type: mediaType, media_url: publicUrl.publicUrl,
        video_url: mediaType === 'video' ? publicUrl.publicUrl : null, thumbnail_url: null,
        caption: caption.trim(), tags: [], vehicle_id: get().activeVehicleId,
      });
      if (insertError) throw insertError;
      await get().loadFeed();
      return true;
    } catch (error: any) {
      set({ error: error?.message || 'Post upload failed.' });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  loadRankings: async () => {
    if (!get().userId) return;
    const { data, error } = await supabase.from('leaderboard').select('*').limit(100);
    if (error) { set({ error: error.message }); return; }
    set({ rankings: (data || []).map((row: any): Ranking => ({
      id: row.id, alias: row.username, avatarUrl: row.avatar_url, tier: row.reputation_level,
      points: Number(row.reputation_points || 0), wins: Number(row.races_won || 0), entered: Number(row.races_entered || 0),
      topSpeed: Number(row.top_speed_recorded || 0),
    })) });
  },

  loadVehicles: async () => {
    const userId = get().userId;
    if (!userId) return;
    const { data, error } = await supabase.from('vehicles').select('id,nickname,year,make,model,trim,engine,drivetrain,horsepower,color,photos,is_primary').eq('user_id', userId).order('is_primary', { ascending: false });
    if (error) { set({ error: error.message }); return; }
    const vehicles = (data || []).map((row: any): ActiveVehicle => ({ id: row.id, nickname: row.nickname || `${row.make} ${row.model}`, year: row.year, make: row.make, model: row.model, trim: row.trim, engine: row.engine, drivetrain: row.drivetrain, horsepower: Number(row.horsepower || 0), color: row.color, photoUrl: row.photos?.[0] || null }));
    set(state => ({ vehicles, activeVehicleId: state.activeVehicleId || vehicles[0]?.id || null }));
  },

  setActiveVehicle: id => set({ activeVehicleId: id, products: [], providers: [] }),

  searchParts: async query => {
    const vehicle = get().vehicles.find(item => item.id === get().activeVehicleId);
    if (!vehicle) { set({ error: 'Add and select a vehicle before searching parts.' }); return; }
    set({ loading: true, error: null, products: [], providers: [] });
    const { data, error } = await supabase.functions.invoke('parts-search', { body: { vehicle, query } });
    if (error) { set({ loading: false, error: error.message }); return; }
    set({ loading: false, products: data.products || [], providers: data.providers || [] });
  },
}));
