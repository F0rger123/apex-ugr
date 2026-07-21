import { useAuthStore } from '../stores/authStore';

describe('Phase 7 Credits & Reputation Verification', () => {
  test('User possesses credits balance and reputation tier', () => {
    const { user } = useAuthStore.getState();
    expect(user?.credits_balance).toBeGreaterThan(0);
    expect(user?.reputation_level).toBeDefined();
    expect(user?.reputation_points).toBeGreaterThan(0);
  });
});
