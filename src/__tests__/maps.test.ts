import { useMapStore } from '../stores/mapStore';

describe('Phase 5 Maps & GPS Radar Verification', () => {
  test('Map store contains nearby driver radar markers', () => {
    const { driversRadar, meets } = useMapStore.getState();
    expect(driversRadar.length).toBeGreaterThan(0);

    const firstDriver = driversRadar[0];
    expect(firstDriver.username).toBeDefined();
    expect(firstDriver.horsepower).toBeGreaterThan(0);
    expect(meets.length).toBeGreaterThan(0);
  });

  test('Updating privacy mode changes map visibility setting', () => {
    const { setPrivacyMode } = useMapStore.getState();
    setPrivacyMode('invisible');

    expect(useMapStore.getState().privacyMode).toBe('invisible');
  });
});
