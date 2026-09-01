import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'apex.cloudflare.session';
const TOKEN_COOKIE = 'apex_cloudflare_session';
const configuredBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';
export const apexApiBaseUrl = configuredBase;
export const apexApiEnvironment = process.env.EXPO_PUBLIC_API_ENV || (configuredBase.includes('apex-ugr-pr23-qa') ? 'QA' : configuredBase ? 'PROD' : 'SAME_ORIGIN');
export const apexBuildCommit = process.env.EXPO_PUBLIC_COMMIT_SHA || '';

export type CloudflareSession = {
  token: string;
  user: { id: string; email: string; username: string; displayName: string; avatarUrl: string | null; credits: number; points: number; tier: string; wins: number; losses: number; reputation: number; declineStreak: number; isDeveloper:boolean };
};

function canUseDocument() {
  return typeof document !== 'undefined';
}

function readCookieToken() {
  if (!canUseDocument()) return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookieToken(value: string) {
  if (!canUseDocument()) return;
  document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(value)}; Max-Age=2592000; Path=/; SameSite=Lax`;
}

function clearCookieToken() {
  if (!canUseDocument()) return;
  document.cookie = `${TOKEN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
}

async function token() {
  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    if (stored) return stored;
  } catch {
    // Some embedded/mobile webviews disable localStorage. Keep auth usable with the cookie fallback below.
  }
  return readCookieToken();
}

async function saveToken(value: string) {
  writeCookieToken(value);
  try {
    await AsyncStorage.setItem(TOKEN_KEY, value);
  } catch {
    // Cookie fallback has already persisted the session for webviews without localStorage.
  }
}

async function clearToken() {
  clearCookieToken();
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing else to clear when localStorage is unavailable.
  }
}

export class ApexApiError extends Error {
  constructor(message: string, public status: number, public requestId: string | null, public code: string | null) {
    super(message);
    this.name = 'ApexApiError';
  }
}

function failureMessage(status: number, fallback?: string) {
  if (status === 401) return 'SESSION EXPIRED // SIGN IN AGAIN';
  if (status === 403) return fallback || 'ACCESS DENIED';
  if (status === 409) return fallback || 'STATE CHANGED // REFRESH AND RETRY';
  if (status === 429) return 'NETWORK BUSY // WAIT A MOMENT AND RETRY';
  if (status >= 500) return 'APEX NETWORK INTERRUPTED // RETRY';
  return fallback || `REQUEST FAILED (${status})`;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sessionToken = await token();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${configuredBase}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...(init.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApexApiError(failureMessage(response.status, payload.error), response.status, response.headers.get('x-request-id'), payload.code || null);
    return payload as T;
  } catch (error) {
    if (error instanceof ApexApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new ApexApiError('NETWORK TIMEOUT // RETRY', 0, null, 'TIMEOUT');
    throw new ApexApiError('OFFLINE OR NETWORK UNAVAILABLE // RETRY', 0, null, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
}

export const cloudflareApi = {
  request,
  async signUp(email: string, password: string, inviteCode?:string) {
    const session = await request<CloudflareSession>('/api/auth/signup', { method: 'POST', body: JSON.stringify({ email, password, inviteCode }) });
    await saveToken(session.token);
    return session;
  },
  async signIn(email: string, password: string) {
    const session = await request<CloudflareSession>('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) });
    await saveToken(session.token);
    return session;
  },
  async session() {
    try { return await request<{ user: CloudflareSession['user'] }>('/api/session'); } catch { return null; }
  },
  async signOut() {
    try { await request('/api/auth/signout', { method: 'POST' }); } finally { await clearToken(); }
  },
  async upload(uri: string, mediaType: 'photo' | 'video') {
    const file = await (await fetch(uri)).blob();
    const form = new FormData();
    form.append('file', file, `upload.${mediaType === 'video' ? 'mp4' : 'jpg'}`);
    return request<{ url: string }>('/api/upload', { method: 'POST', body: form });
  },
};

export const hasCloudflareBackend = true;
