
export interface CurrentConditions {
  temp: number; // Celsius
  feelsLike: number;
  dewPoint: number;
  humidity: number; // %
  pressure: number; // hPa
  pressureTrend: 'rising' | 'steady' | 'falling';
  windSpeed: number; // km/h
  windGust: number; // km/h
  windDir: number; // degrees
  precipRate: number; // mm/hr
  precipTotal: number; // mm
  solarRadiation: number; // W/m^2
  uvIndex: number;
  timestamp: string;
}

export interface HistoryPoint {
  time: string;
  temp: number;
  dewPoint: number;
  pressure: number;
  windSpeed: number;
  windGust: number;
  windDir: number;
  humidity: number;
  precipRate: number;
  precipAccum: number; 
  epoch: number;
}

export interface DailyHistoryPoint {
    date: string;
    precipTotal: number;
    tempHigh: number;
    tempLow: number;
    tempAvg: number;
    dewPointAvg: number;
    humidityHigh: number;
    humidityLow: number;
    humidityAvg: number;
    pressureMax: number;
    pressureMin: number;
    pressureAvg: number;
    windSpeedMax: number;
    windGustMax: number;
    epoch: number;
}

export type HistoryPeriod = '6h' | '24h' | '48h' | '7j' | '31j' | 'Custom';

export enum Tab {
  DASHBOARD = 'dashboard',
  CHARTS = 'charts',
  ANALYSIS = 'analysis',
  DJC = 'djc',
  PRECIPITATION = 'precipitation',
  EXTREMES = 'extremes',
  IA = 'ia'
}
