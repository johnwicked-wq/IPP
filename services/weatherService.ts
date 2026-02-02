
import { CurrentConditions, HistoryPoint, DailyHistoryPoint } from '../types';

const API_KEY = 'VITE_GEMINI_API_KEY';
const STATION_ID = 'IPLLAU91';
const BASE_URL = 'https://api.weather.com/v2/pws/observations';
const HISTORY_HOURLY_URL = 'https://api.weather.com/v2/pws/history/hourly';
const HISTORY_DAILY_URL = 'https://api.weather.com/v2/pws/history/daily';

const formatDateToYYYYMMDD = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
};

export const getWeatherData = async (): Promise<{ 
    current: CurrentConditions; 
    history: HistoryPoint[];
    dailyHistory: DailyHistoryPoint[];
}> => {
  try {
    const now = new Date();
    
    // 1. Current Conditions
    const currentRes = await fetch(`${BASE_URL}/current?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&apiKey=${API_KEY}`);
    const currentData = await currentRes.json();
    if (!currentData.observations) throw new Error("Station hors ligne");
    const obs = currentData.observations[0];

    // 2. Recent Hourly History
    const yesterday = new Date(now.getTime() - 86400000);
    const hourlyRes = await fetch(`${HISTORY_HOURLY_URL}?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&startDate=${formatDateToYYYYMMDD(yesterday)}&endDate=${formatDateToYYYYMMDD(now)}&apiKey=${API_KEY}`);
    const hourlyData = await hourlyRes.json();
    const hourlyPoints: HistoryPoint[] = (hourlyData.observations || []).map((h: any) => ({
        time: new Date(h.obsTimeLocal).toLocaleString('fr-FR', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }),
        temp: h.metric.tempAvg ?? h.metric.temp ?? NaN,
        dewPoint: h.metric.dewptAvg ?? h.metric.dewpt ?? NaN,
        pressure: h.metric.pressureMax ?? h.metric.pressure ?? NaN,
        windSpeed: h.metric.windspeedHigh ?? h.metric.windspeedAvg ?? h.metric.windSpeed ?? 0,
        windGust: h.metric.windgustHigh ?? h.metric.windGust ?? 0,
        windDir: h.winddirAvg ?? h.winddir ?? 0,
        humidity: h.humidityAvg ?? h.humidity ?? 0,
        precipRate: h.metric.precipRate ?? 0,
        precipAccum: h.metric.precipTotal ?? 0,
        epoch: h.epoch
    })).filter((p: any) => !isNaN(p.temp)).sort((a: any, b: any) => a.epoch - b.epoch);

    // 3. Long Term Daily History
    const dailySegments: Promise<any>[] = [];
    const startYear = 2025;
    const endYear = now.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
        const limitMonth = (year === endYear) ? now.getMonth() : 11;
        for (let month = 0; month <= limitMonth; month++) {
            const startOfMonth = new Date(year, month, 1);
            const endOfMonth = new Date(year, month + 1, 0);
            const finalEnd = (endOfMonth > now) ? now : endOfMonth;

            const url = `${HISTORY_DAILY_URL}?stationId=${STATION_ID}&format=json&units=m&numericPrecision=decimal&startDate=${formatDateToYYYYMMDD(startOfMonth)}&endDate=${formatDateToYYYYMMDD(finalEnd)}&apiKey=${API_KEY}`;
            
            dailySegments.push(
                fetch(url)
                    .then(res => res.ok ? res.json() : { observations: [] })
                    .catch(() => ({ observations: [] }))
            );
        }
    }

    const dailyResults = await Promise.all(dailySegments);
    const rawDailyObs = dailyResults.flatMap(r => r.observations || []);

    const dailyMap = new Map<string, any>();
    rawDailyObs.forEach(obs => {
        const dateKey = obs.obsTimeLocal.split(' ')[0];
        dailyMap.set(dateKey, obs);
    });

    const dailyHistory: DailyHistoryPoint[] = Array.from(dailyMap.values()).map((d: any) => ({
        date: d.obsTimeLocal,
        precipTotal: d.metric.precipTotal || 0,
        tempHigh: d.metric.tempHigh,
        tempLow: d.metric.tempLow,
        tempAvg: d.metric.tempAvg,
        dewPointAvg: d.metric.dewptAvg || 0,
        // L'humidité dans l'historique quotidien est à la racine, pas dans 'metric'
        humidityHigh: d.humidityHigh ?? d.metric.humidityHigh ?? 0,
        humidityLow: d.humidityLow ?? d.metric.humidityLow ?? 0,
        humidityAvg: d.humidityAvg ?? d.metric.humidityAvg ?? 0,
        pressureMax: d.metric.pressureMax || 0,
        pressureMin: d.metric.pressureMin || 0,
        pressureAvg: d.metric.pressureMax || 0,
        windSpeedMax: d.metric.windspeedHigh || 0,
        windGustMax: d.metric.windgustHigh || 0,
        epoch: d.epoch
    })).sort((a, b) => a.epoch - b.epoch);

    // Pressure Trend
    let trend: 'rising' | 'steady' | 'falling' = 'steady';
    const lastPoints = hourlyPoints.slice(-10);
    if (lastPoints.length >= 2) {
        const diff = lastPoints[lastPoints.length-1].pressure - lastPoints[0].pressure;
        if (diff > 0.5) trend = 'rising';
        else if (diff < -0.5) trend = 'falling';
    }

    const current: CurrentConditions = {
      temp: obs.metric.temp ?? 0,
      feelsLike: obs.metric.windChill ?? obs.metric.temp ?? 0,
      dewPoint: obs.metric.dewpt ?? 0,
      humidity: obs.humidity ?? 0,
      pressure: obs.metric.pressure ?? 1013,
      pressureTrend: trend,
      windSpeed: obs.metric.windSpeed ?? 0,
      windGust: obs.metric.windGust ?? 0,
      windDir: obs.winddir ?? 0,
      precipRate: obs.metric.precipRate ?? 0,
      precipTotal: obs.metric.precipTotal ?? 0,
      solarRadiation: obs.solarRadiation ?? 0,
      uvIndex: obs.uv ?? 0,
      timestamp: new Date(obs.obsTimeLocal).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    };

    return { current, history: hourlyPoints, dailyHistory };
    
  } catch (error) {
    console.error("Weather Service Error:", error);
    throw error;
  }
};
