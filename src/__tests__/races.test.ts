import { useRaceStore } from '../stores/raceStore';

describe('Phase 6 Challenges & Races Verification', () => {
  test('Creating race challenge adds open wager to race feed', () => {
    const initialCount = useRaceStore.getState().races.length;

    useRaceStore.getState().createChallenge({
      challenger_id: '00000000-0000-0000-0000-000000000001',
      race_type: 'Drag Race',
      wager_credits: 500,
      start_time: new Date().toISOString(),
      rules: 'Clean Launch, No Jump',
      route_name: 'Terminal Island Strip',
      distance_miles: 0.25,
    });

    const newCount = useRaceStore.getState().races.length;
    expect(newCount).toBe(initialCount + 1);
  });

  test('Accepting challenge updates challenge status to accepted', () => {
    const { races, acceptChallenge } = useRaceStore.getState();
    const openRace = races.find((r) => r.status === 'open');
    if (openRace) {
      acceptChallenge(openRace.id, 'opponent-123');
      const updated = useRaceStore.getState().races.find((r) => r.id === openRace.id);
      expect(updated?.status).toBe('accepted');
    }
  });
});
