import { create } from 'zustand';

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceName: string;
  category: 'Oil Service' | 'Spark Plugs' | 'Brakes' | 'Tires' | 'Transmission' | 'Custom';
  date: string;
  odometerMiles: number;
  cost: number;
  provider: string;
  notes: string;
  nextDueDate: string;
  nextDueMiles: number;
}

interface MaintenanceState {
  records: MaintenanceRecord[];
  addRecord: (record: Omit<MaintenanceRecord, 'id'>) => void;
  deleteRecord: (id: string) => void;
  getVehicleRecords: (vehicleId: string) => MaintenanceRecord[];
  getTotalMaintenanceCost: (vehicleId: string) => number;
}

const INITIAL_RECORDS: MaintenanceRecord[] = [
  {
    id: 'm1',
    vehicleId: '11111111-1111-1111-1111-111111111111',
    serviceName: 'Motul 300V Synthetic Oil & Filter Change',
    category: 'Oil Service',
    date: '2026-07-15',
    odometerMiles: 14200,
    cost: 185.00,
    provider: 'AMS Performance Shop',
    notes: 'Replaced with 15W-50 race oil. Filter magnet inspected clean.',
    nextDueDate: '2026-10-15',
    nextDueMiles: 17200,
  },
  {
    id: 'm2',
    vehicleId: '11111111-1111-1111-1111-111111111111',
    serviceName: 'NGK Iridium Spark Plugs (Cold Heat Range 9)',
    category: 'Spark Plugs',
    date: '2026-06-01',
    odometerMiles: 12500,
    cost: 240.00,
    provider: 'Self Installed in Garage',
    notes: 'Gapped to 0.022 in for E85 boost stability.',
    nextDueDate: '2027-06-01',
    nextDueMiles: 22500,
  },
];

export const useMaintenanceStore = create<MaintenanceState>((set, get) => ({
  records: INITIAL_RECORDS,

  addRecord: (data) => {
    const newRecord: MaintenanceRecord = {
      ...data,
      id: `m_${Date.now()}`,
    };
    set((state) => ({ records: [newRecord, ...state.records] }));
  },

  deleteRecord: (id) => {
    set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
  },

  getVehicleRecords: (vehicleId) => {
    return get().records.filter((r) => r.vehicleId === vehicleId);
  },

  getTotalMaintenanceCost: (vehicleId) => {
    return get()
      .getVehicleRecords(vehicleId)
      .reduce((sum, r) => sum + r.cost, 0);
  },
}));
