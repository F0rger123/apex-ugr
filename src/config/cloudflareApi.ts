import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'apex.cloudflare.session';
const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

export type CloudflareSession = {
  token: string;
  user: { id: string; email: string; username: string; displayName: string; avatarUrl: string | null; credits: number; points: number; tier: string; wins: number; losses: number; reputation: number; declineStreak: number };
};

async function token() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sessionToken = await token();
  const response = await fetch(`${configuredBase}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}

export const cloudflareApi = {
  request,
  async signUp(email: string, password: string) {
    const session = await request<CloudflareSession>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password }) });
    await AsyncStorage.setItem(TOKEN_KEY, session.token);
    return session;
  },
  async signIn(email: string, password: string) {
    const session = await request<CloudflareSession>('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
    await AsyncStorage.setItem(TOKEN_KEY, session.token);
    return session;
  },
  async session() {
    try { return await request<{ user: CloudflareSession['user'] }>('/api/session'); } catch { return null; }
  },
  async signOut() {
    try { await request('/api/auth/signout', { method: 'POST' }); } finally { await AsyncStorage.removeItem(TOKEN_KEY); }
  },
  async upload(uri: string, mediaType: 'photo' | 'video') {
    const file = await (await fetch(uri)).blob();
    const form = new FormData();
    form.append('file', file, `upload.${mediaType === 'video' ? 'mp4' : 'jpg'}`);
    return request<{ url: string }>('/api/upload', { method: 'POST', body: form });
  },
};

export const hasCloudflareBackend = true;
