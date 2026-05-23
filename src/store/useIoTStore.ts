import { create } from "zustand";
import { SystemStatus, Inventory, Production, Thermodynamics, Analytics } from "@/types";

interface IoTState {
  status: SystemStatus;
  inventory: Inventory;
  production: Production;
  thermodynamics: Thermodynamics;
  analytics: Analytics;
  isMobileMenuOpen: boolean;
  startCycle: () => void;
  emergencyStop: () => void;
  toggleMobileMenu: () => void;
  setThermodynamicsTarget: (key: keyof Thermodynamics, value: number) => void;
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
    boiler1Target: 85,
    boiler2Temp: 96,
    boiler2Target: 98,
    outputTemp: 55,
    outputTarget: 60,
    brewPressure: 9.2,
    brewPressureTarget: 9.0,
    milkCh1Temp: 4,
    milkCh1Target: 4,
    milkCh2Temp: 5,
    milkCh2Target: 5,
  },
  analytics: {
    day: [
      { label: "06:00", cups: 12 }, { label: "08:00", cups: 45 }, { label: "10:00", cups: 30 },
      { label: "12:00", cups: 15 }, { label: "14:00", cups: 25 }, { label: "16:00", cups: 10 },
      { label: "18:00", cups: 8 }, { label: "20:00", cups: 5 }
    ],
    week: [
      { label: "Mon", cups: 120 }, { label: "Tue", cups: 135 }, { label: "Wed", cups: 140 },
      { label: "Thu", cups: 110 }, { label: "Fri", cups: 160 }, { label: "Sat", cups: 190 },
      { label: "Sun", cups: 175 }
    ],
    month: [
      { label: "Week 1", cups: 950 }, { label: "Week 2", cups: 1020 },
      { label: "Week 3", cups: 980 }, { label: "Week 4", cups: 1100 }
    ],
    year: [
      { label: "Jan", cups: 4200 }, { label: "Feb", cups: 4100 }, { label: "Mar", cups: 4500 },
      { label: "Apr", cups: 4300 }, { label: "May", cups: 4800 }, { label: "Jun", cups: 4600 },
      { label: "Jul", cups: 4700 }, { label: "Aug", cups: 4900 }, { label: "Sep", cups: 5100 },
      { label: "Oct", cups: 5300 }, { label: "Nov", cups: 5400 }, { label: "Dec", cups: 6000 }
    ]
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
  setThermodynamicsTarget: (key, value) =>
    set((state) => ({
      thermodynamics: { ...state.thermodynamics, [key]: value },
    })),
}));
