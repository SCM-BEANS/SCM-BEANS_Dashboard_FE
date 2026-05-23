export interface SystemStatus {
  id: string;
  name: string;
  status: "Online" | "Offline" | "Maintenance";
  state: "Brewing" | "Ready" | "Heating" | "Cooling";
  lastSync: string;
  uptime: string;
  firmware: string;
}

export interface Inventory {
  coffeeBeans: {
    amount: number;
    capacity: number;
    unit: string;
  };
  water: {
    volume: number;
    unit: string;
    isMainsConnected: boolean;
  };
  milk: {
    volume: number;
    unit: string;
    chamber: string;
  };
}

export interface Production {
  cupsToday: number;
  lifetimeCups: number;
}

export interface Thermodynamics {
  boiler1Temp: number;
  boiler2Temp: number;
  outputTemp: number;
  brewPressure: number;
  milkCh1Temp: number;
  milkCh2Temp: number;
}
