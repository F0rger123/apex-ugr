import { useAuthStore } from '../stores/authStore';

describe('Phase 2 Authentication & Profile Verification', () => {
  test('Login updates user state and authentication flag', () => {
    const { login, isAuthenticated } = useAuthStore.getState();
    login('pilot@apexugr.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.username).toBeDefined();
  });

  test('Privacy mode toggle updates visibility state', () => {
    const { togglePrivacyMode } = useAuthStore.getState();
    togglePrivacyMode('invisible');

    const state = useAuthStore.getState();
    expect(state.user?.privacy_mode).toBe('invisible');
  });

  test('Logout resets authentication state', () => {
    const { logout } = useAuthStore.getState();
    logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
  });
});
