import { create } from 'zustand';

type StatusFilter = 'all' | 'online' | 'error' | 'offline' | 'maintenance';

interface MachineStoreState {
  selectedMachineId: string | null;
  statusFilter: StatusFilter;
  setSelectedMachineId: (id: string | null) => void;
  setStatusFilter: (filter: StatusFilter) => void;
}

export const useMachineStore = create<MachineStoreState>((set) => ({
  selectedMachineId: null,
  statusFilter: 'all',
  setSelectedMachineId: (id) => set({ selectedMachineId: id }),
  setStatusFilter: (filter) => set({ statusFilter: filter }),
}));
