import { useAuthStore } from '../stores/authStore';
import { useGarageStore } from '../stores/garageStore';
import { useMarketplaceStore } from '../stores/marketplaceStore';
import { useRaceStore } from '../stores/raceStore';

describe('Phase 1 Architecture & State Model Verification', () => {
  test('Auth store initializes default user profile', () => {
    const { user, isAuthenticated } = useAuthStore.getState();
    expect(user).toBeDefined();
    expect(user?.username).toBe('ryder_vance');
    expect(user?.reputation_level).toBe('Drag Specialist');
    expect(isAuthenticated).toBe(true);
  });

  test('Garage store contains initial vehicle profile and modifications', () => {
    const { vehicles, getVehicleModifications, getTotalBuildValue, getTotalHpGain } = useGarageStore.getState();
    expect(vehicles.length).toBeGreaterThan(0);

    const primaryCar = vehicles[0];
    expect(primaryCar.make).toBe('Nissan');
    expect(primaryCar.model).toBe('GT-R Nismo');
    expect(primaryCar.horsepower).toBe(1150);

    const mods = getVehicleModifications(primaryCar.id);
    expect(mods.length).toBeGreaterThan(0);

    const buildVal = getTotalBuildValue(primaryCar.id);
    expect(buildVal).toBeGreaterThan(0);

    const hpGain = getTotalHpGain(primaryCar.id);
    expect(hpGain).toBeGreaterThan(0);
  });

  test('Marketplace store filters products by vendor and budget', () => {
    const { getFilteredProducts, products } = useMarketplaceStore.getState();
    expect(products.length).toBeGreaterThan(0);

    const filtered = getFilteredProducts('Nissan', 'GT-R');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].vendor_name).toBeDefined();
  });

  test('Race store manages staged challenges and dispute votes', () => {
    const { races, disputes, voteOnDispute } = useRaceStore.getState();
    expect(races.length).toBeGreaterThan(0);
    expect(disputes.length).toBeGreaterThan(0);

    const disputeId = disputes[0].id;
    voteOnDispute(disputeId, true);
    const updatedDispute = useRaceStore.getState().disputes.find(d => d.id === disputeId);
    expect(updatedDispute?.referee_votes.valid_votes).toBe(1);
  });
});
