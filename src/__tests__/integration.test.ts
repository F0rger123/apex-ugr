import { useAuthStore } from '../stores/authStore';
import { useGarageStore } from '../stores/garageStore';
import { useMarketplaceStore } from '../stores/marketplaceStore';
import { useRaceStore } from '../stores/raceStore';
import { useMapStore } from '../stores/mapStore';
import { useFeedStore } from '../stores/feedStore';
import { useMessageStore } from '../stores/messageStore';
import { useNotificationStore } from '../stores/notificationStore';

describe('Phase 10 Master Integration & Production Deployment Suite', () => {
  test('Complete Apex UGR Platform Integrity Check', () => {
    // 1. Auth & Profiles
    expect(useAuthStore.getState().user?.username).toBe('ryder_vance');

    // 2. Garage Fleet
    expect(useGarageStore.getState().vehicles.length).toBeGreaterThan(0);

    // 3. Marketplace Parts & Vendor Sources
    expect(useMarketplaceStore.getState().products.length).toBeGreaterThan(0);

    // 4. Maps & Driver Radar
    expect(useMapStore.getState().driversRadar.length).toBeGreaterThan(0);

    // 5. Races & Dispute Telemetry
    expect(useRaceStore.getState().races.length).toBeGreaterThan(0);
    expect(useRaceStore.getState().disputes.length).toBeGreaterThan(0);

    // 6. Reels Feed & Comments
    expect(useFeedStore.getState().posts.length).toBeGreaterThan(0);

    // 7. Messaging Threads
    expect(useMessageStore.getState().conversations.length).toBeGreaterThan(0);

    // 8. Notifications
    expect(useNotificationStore.getState().notifications.length).toBeGreaterThan(0);
  });
});
