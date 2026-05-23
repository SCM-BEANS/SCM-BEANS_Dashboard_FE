import { create } from "zustand";
import { SystemStatus, Inventory, Production, Thermodynamics } from "@/types";

interface IoTState {
  status: SystemStatus;
  inventory: Inventory;
  production: Production;
  thermodynamics: Thermodynamics;
  isMobileMenuOpen: boolean;
  startCycle: () => void;
  emergencyStop: () => void;
  toggleMobileMenu: () => void;
}

export const useIoTStore = create<IoTState>((set) => ({
  status: {
    id: "DEER_01",
    name: "PRECISION BREW",
    status: "Online",
    state: "Brewing",
    lastSync: "1s ago",
    uptime: "24h 12m",
    firmware: "v2.4.1",
  },
  inventory: {
    coffeeBeans: { amount: 1.2, capacity: 2.0, unit: "kg" },
    water: { volume: 2.5, unit: "L", isMainsConnected: true },
    milk: { volume: 3.5, unit: "L", chamber: "Chamber 1 & 2" },
  },
  production: {
    cupsToday: 150,
    lifetimeCups: 15420,
  },
  thermodynamics: {
    boiler1Temp: 80,
    boiler2Temp: 96,
    outputTemp: 55,
    brewPressure: 9.2,
    milkCh1Temp: 4,
    milkCh2Temp: 5,
  },
  isMobileMenuOpen: false,
  startCycle: () => {
    set((state) => ({
      status: { ...state.status, state: "Brewing" },
      production: { ...state.production, cupsToday: state.production.cupsToday + 1 },
    }));
  },
  emergencyStop: () => {
    set((state) => ({
      status: { ...state.status, state: "Maintenance", status: "Offline" },
      thermodynamics: { ...state.thermodynamics, brewPressure: 0 },
    }));
  },
  toggleMobileMenu: () => set((state) => ({ isMobileMenuOpen: !state.isMobileMenuOpen })),
}));
