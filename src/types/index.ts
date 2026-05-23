export interface SystemStatus {
  id: string;
  name: string;
  status: "Online" | "Offline" | "Maintenance";
  state: "Brewing" | "Ready" | "Heating" | "Cooling" | "Maintenance";
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
  boiler1Target: number;
  boiler2Temp: number;
  boiler2Target: number;
  outputTemp: number;
  outputTarget: number;
  brewPressure: number;
  brewPressureTarget: number;
  milkCh1Temp: number;
  milkCh1Target: number;
  milkCh2Temp: number;
  milkCh2Target: number;
}

export interface AnalyticsDataPoint {
  label: string;
  cups: number;
}

export interface Analytics {
  day: AnalyticsDataPoint[];
  week: AnalyticsDataPoint[];
  month: AnalyticsDataPoint[];
  year: AnalyticsDataPoint[];
}
