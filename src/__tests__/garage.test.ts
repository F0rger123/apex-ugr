import { useGarageStore } from '../stores/garageStore';

describe('Phase 3 Garage & Vehicle Verification', () => {
  test('Adding vehicle increases fleet count', () => {
    const initialLength = useGarageStore.getState().vehicles.length;

    useGarageStore.getState().addVehicle({
      year: 2024,
      make: 'Porsche',
      model: '911 GT3 RS',
      color: 'Lizard Green',
      engine: '4.0L NA Flat-6',
      transmission: '7-Speed PDK',
      horsepower: 518,
      torque: 343,
      weight_lbs: 3268,
      top_speed_mph: 184,
      drivetrain: 'RWD',
      fuel_type: '93 Octane',
      photos: [],
      is_primary: false,
    });

    const newLength = useGarageStore.getState().vehicles.length;
    expect(newLength).toBe(initialLength + 1);
  });

  test('Setting primary vehicle updates active vehicle ID', () => {
    const { vehicles, setActiveVehicle } = useGarageStore.getState();
    const secondVehicleId = vehicles[1]?.id || vehicles[0].id;

    setActiveVehicle(secondVehicleId);
    expect(useGarageStore.getState().activeVehicleId).toBe(secondVehicleId);
  });
});
