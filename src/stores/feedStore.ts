import { create } from 'zustand';
import { Post, Comment } from '../types/database.types';

interface FeedState {
  posts: Post[];
  commentsMap: Record<string, Comment[]>;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;
  createPost: (postData: Omit<Post, 'id' | 'created_at' | 'likes_count' | 'comments_count' | 'reposts_count'>) => void;
}

const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    user_id: '00000000-0000-0000-0000-000000000001',
    post_type: 'photo',
    media_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
    caption: 'Dyno tune complete at AMS! Made 1,150WHP on E85 FlexFuel. Staged for Friday night wagers! ⚡🏎️',
    tags: ['#GTR', '#Alpha12', '#ApexUGR', '#E85'],
    likes_count: 412,
    comments_count: 3,
    reposts_count: 34,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    user_has_liked: true,
    user_profile: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'phantom_gtr',
      display_name: 'Ryder Vance',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Community Favorite',
      bio: null,
      home_city: 'Los Angeles, CA',
      reputation_points: 4850,
      credits_balance: 18500,
      favorite_car_type: 'JDM',
      racing_specialties: [],
      stats: { races_entered: 14, races_won: 11, top_speed_recorded: 224, meets_hosted: 5 },
      achievements: [],
      is_verified: true,
      privacy_mode: 'all',
      visibility_radius_km: 50,
      created_at: new Date().toISOString()
    }
  },
  {
    id: 'post-2',
    user_id: '00000000-0000-0000-0000-000000000002',
    post_type: 'video',
    media_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop',
    thumbnail_url: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop',
    caption: 'Morning telemetry laps at Homestead Speedway. 911 GT3 RS aero load at 180 MPH is insane! 🏁',
    tags: ['#GT3RS', '#Weissach', '#TrackDemon'],
    likes_count: 589,
    comments_count: 2,
    reposts_count: 52,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user_has_liked: false,
    user_profile: {
      id: '00000000-0000-0000-0000-000000000002',
      username: 'apex_gt3',
      display_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Street Specialist',
      bio: null,
      home_city: 'Miami, FL',
      reputation_points: 3920,
      credits_balance: 14200,
      favorite_car_type: 'Euro',
      racing_specialties: [],
      stats: { races_entered: 10, races_won: 8, top_speed_recorded: 184, meets_hosted: 2 },
      achievements: [],
      is_verified: true,
      privacy_mode: 'all',
      visibility_radius_km: 50,
      created_at: new Date().toISOString()
    }
  }
];

const INITIAL_COMMENTS: Record<string, Comment[]> = {
  'post-1': [
    {
      id: 'cmt-1',
      post_id: 'post-1',
      user_id: '00000000-0000-0000-0000-000000000002',
      comment_text: 'That launch boost is terrifying! Let’s set up the roll race challenge.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      user_profile: {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'apex_gt3',
        display_name: 'Elena Rostova',
        avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
        reputation_level: 'Street Specialist',
        bio: null, home_city: 'Miami, FL', reputation_points: 3920, credits_balance: 14200, favorite_car_type: 'Euro', racing_specialties: [], stats: { races_entered: 10, races_won: 8, top_speed_recorded: 184, meets_hosted: 2 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
      }
    },
    {
      id: 'cmt-2',
      post_id: 'post-1',
      user_id: '00000000-0000-0000-0000-000000000003',
      comment_text: 'Clean setup! What pressure are you running on the rear slicks?',
      created_at: new Date(Date.now() - 900000).toISOString(),
      user_profile: {
        id: '00000000-0000-0000-0000-000000000003',
        username: 'boosted_2jz',
        display_name: 'Kenji Sato',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
        reputation_level: 'Veteran',
        bio: null, home_city: 'Tokyo', reputation_points: 2800, credits_balance: 9500, favorite_car_type: 'JDM', racing_specialties: [], stats: { races_entered: 8, races_won: 5, top_speed_recorded: 210, meets_hosted: 1 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
      }
    }
  ]
};

export const useFeedStore = create<FeedState>((set) => ({
  posts: INITIAL_POSTS,
  commentsMap: INITIAL_COMMENTS,

  toggleLike: (postId) => {
    set((state) => ({
      posts: state.posts.map((p) => {
        if (p.id === postId) {
          const liked = !p.user_has_liked;
          return {
            ...p,
            user_has_liked: liked,
            likes_count: liked ? p.likes_count + 1 : p.likes_count - 1
          };
        }
        return p;
      })
    }));
  },

  addComment: (postId, commentText) => {
    const newComment: Comment = {
      id: `cmt-${Date.now()}`,
      post_id: postId,
      user_id: '00000000-0000-0000-0000-000000000001',
      comment_text: commentText,
      created_at: new Date().toISOString(),
      user_profile: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'phantom_gtr',
        display_name: 'Ryder Vance',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        reputation_level: 'Community Favorite',
        bio: null, home_city: 'Los Angeles, CA', reputation_points: 4850, credits_balance: 18500, favorite_car_type: 'JDM', racing_specialties: [], stats: { races_entered: 14, races_won: 11, top_speed_recorded: 224, meets_hosted: 5 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
      }
    };

    set((state) => {
      const existing = state.commentsMap[postId] || [];
      return {
        commentsMap: {
          ...state.commentsMap,
          [postId]: [...existing, newComment]
        },
        posts: state.posts.map((p) =>
          p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        )
      };
    });
  },

  createPost: (postData) => {
    const newPost: Post = {
      ...postData,
      id: `post-${Date.now()}`,
      likes_count: 0,
      comments_count: 0,
      reposts_count: 0,
      created_at: new Date().toISOString(),
      user_has_liked: false,
      user_profile: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'phantom_gtr',
        display_name: 'Ryder Vance',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
        reputation_level: 'Community Favorite',
        bio: null, home_city: 'Los Angeles, CA', reputation_points: 4850, credits_balance: 18500, favorite_car_type: 'JDM', racing_specialties: [], stats: { races_entered: 14, races_won: 11, top_speed_recorded: 224, meets_hosted: 5 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
      }
    };
    set((state) => ({ posts: [newPost, ...state.posts] }));
  }
}));
