
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { getWeatherData } from './services/weatherService';
import { analyzeWeatherConditions } from './services/geminiService';
import { CurrentConditions, HistoryPoint, DailyHistoryPoint, Tab } from './types';
import { MainStats } from './components/MainStats';
import { WindCompass } from './components/WindCompass';
import { Charts } from './components/Charts';
import { 
  LayoutDashboard, 
  Activity, 
  RefreshCcw, 
  X,
  Sunrise,
  Sunset,
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Clock,
  AlertTriangle,
  Calendar,
  Thermometer,
  Sprout,
  Droplets,
  Zap,
  Info,
  HelpCircle,
  ChevronRight,
  List,
  TrendingUp,
  LineChart as LineChartIcon,
  Search,
  CheckCircle2,
  Timer,
  CloudRain
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, ComposedChart, Area, AreaChart, ReferenceLine, BarChart } from 'recharts';

// --- Culture Database from Image ---
const CROP_DATABASE = [
    { cat: 'Céréales', name: 'Avoine', min: 1200, max: 1400, base: 0 },
    { cat: 'Céréales', name: 'Orge', min: 1200, max: 1400, base: 0 },
    { cat: 'Céréales', name: 'Blé tendre', min: 1400, max: 1600, base: 0 },
    { cat: 'Céréales', name: 'Blé dur', min: 1600, max: 1800, base: 0 },
    { cat: 'Céréales', name: 'Riz', min: 1800, max: 2500, base: 10 },
    { cat: 'Céréales', name: 'Maïs (grain)', min: 1000, max: 1400, base: 6 },
    { cat: 'Fruits', name: 'Raisins', min: 1600, max: 2000, base: 10 },
    { cat: 'Fruits', name: 'Fraises', min: 800, max: 1200, base: 5 },
    { cat: 'Fruits', name: 'Cerises', min: 1200, max: 1500, base: 7 },
    { cat: 'Fruits', name: 'Poires', min: 1500, max: 2000, base: 7 },
    { cat: 'Fruits', name: 'Pommes', min: 1500, max: 2000, base: 7 },
    { cat: 'Fruits', name: 'Pêches', min: 2000, max: 2500, base: 7 },
    { cat: 'Légumes', name: 'Poivrons', min: 1100, max: 1300, base: 10 },
    { cat: 'Légumes', name: 'Tomates', min: 1200, max: 1500, base: 10 },
    { cat: 'Légumes', name: 'Courgettes', min: 900, max: 1100, base: 10 },
    { cat: 'Légumes', name: 'Concombres', min: 900, max: 1200, base: 10 },
    { cat: 'Légumes', name: 'Carottes', min: 1000, max: 1200, base: 4 },
    { cat: 'Légumes', name: 'Épinards', min: 500, max: 800, base: 4 },
    { cat: 'Légumes', name: 'Choux', min: 1000, max: 1200, base: 5 },
    { cat: 'Légumes', name: 'Laitues', min: 800, max: 1000, base: 5 },
    { cat: 'Légumes', name: 'Pommes de terre', min: 1200, max: 1500, base: 8 },
    { cat: 'Légumineuses', name: 'Haricots (verts)', min: 1000, max: 1200, base: 10 },
    { cat: 'Légumineuses', name: 'Pois chiches', min: 1200, max: 1500, base: 5 },
    { cat: 'Légumineuses', name: 'Lentilles', min: 800, max: 1200, base: 5 },
    { cat: 'Légumineuses', name: 'Pois', min: 900, max: 1100, base: 5 },
    { cat: 'PPAM', name: 'Lavande', min: 1000, max: 1200, base: 10 },
    { cat: 'PPAM', name: 'Basilic', min: 800, max: 1000, base: 10 },
    { cat: 'PPAM', name: 'Menthe', min: 500, max: 800, base: 5 },
    { cat: 'PPAM', name: 'Thym', min: 500, max: 800, base: 5 },
];

// --- Markdown Renderer ---
const ReactMarkdown = ({ children }: { children?: React.ReactNode }) => {
    const text = typeof children === 'string' ? children : String(children || '');
    const content = text
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-black text-sky-400 mt-6 mb-3 uppercase tracking-tighter">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mt-8 mb-4 border-b border-slate-800 pb-2 tracking-tighter">$1</h2>')
        .replace(/\*\*(.*)\*\*/gim, '<strong class="text-purple-400 font-black">$1</strong>')
        .replace(/\n/gim, '<br />');
    return <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
};

// --- Sun Logic (Plélauff) ---
const LAT = 48.2045;
const LON = -3.2104;

const toRadians = (deg: number) => deg * (Math.PI / 180);
const toDegrees = (rad: number) => rad * (180 / Math.PI);

const getSunTimes = (date: Date) => {
    const times = { dawn: 0, sunrise: 0, sunset: 0, dusk: 0 };
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const declination = 23.45 * Math.sin(toRadians(360/365 * (dayOfYear - 81)));
    const equationOfTime = 9.87 * Math.sin(toRadians(2 * (360/365 * (dayOfYear - 81))));
    const getHourAngle = (zenith: number) => {
        const cosH = (Math.cos(toRadians(zenith)) - (Math.sin(toRadians(LAT)) * Math.sin(toRadians(declination)))) / 
                     (Math.cos(toRadians(LAT)) * Math.cos(toRadians(declination)));
        if (cosH > 1 || cosH < -1) return null;
        return toDegrees(Math.acos(cosH));
    };
    const haSunrise = getHourAngle(90.833);
    const haDawn = getHourAngle(96);
    if (haSunrise !== null && haDawn !== null) {
         const utcNoon = 12 - (LON / 15) - (equationOfTime / 60);
         const timezoneOffset = -date.getTimezoneOffset() / 60; 
         const getLocal = (hoursFromNoon: number) => {
            const h = utcNoon + hoursFromNoon + timezoneOffset;
            const d = new Date(date);
            d.setHours(Math.floor(h)); d.setMinutes(Math.floor((h % 1) * 60)); d.setSeconds(0);
            return d;
         };
         times.sunrise = getLocal(-haSunrise / 15).getTime();
         times.sunset = getLocal(haSunrise / 15).getTime();
         times.dawn = getLocal(-haDawn / 15).getTime();
         times.dusk = getLocal(haDawn / 15).getTime();
    }
    return times;
};

const CustomModalTooltip = ({ active, payload, isLongTerm }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateObj = new Date(data.epoch ? data.epoch * 1000 : Date.now());
    const dateStr = data.monthLabel ? data.monthLabel : dateObj.toLocaleString('fr-FR', {
        weekday: 'short', day: '2-digit', month: 'long',
        ...(isLongTerm ? { year: 'numeric' } : { hour: '2-digit', minute: '2-digit' })
    });
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl text-xs backdrop-blur-xl ring-1 ring-white/10">
        <p className="font-black mb-3 text-sky-400 border-b border-slate-800 pb-2 uppercase tracking-tighter">{dateStr}</p>
        <div className="space-y-2">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-10 items-center">
              <span className="flex items-center gap-2 font-bold uppercase text-[10px]" style={{ color: p.color || p.stroke }}>
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color || p.stroke }}></span>{p.name}
              </span>
              <span className="font-mono font-black text-white text-sm">{(p.value || 0).toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex justify-center gap-12 text-[9px] font-black uppercase tracking-[0.4em] mt-8">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-3" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

type ModalType = 'temp' | 'precip' | 'humidity' | 'pressure' | 'wind';
type ExtendedPeriod = 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'rolling24h' | 'rolling7d' | 'rolling30d' | 'rolling365d';

interface WeatherModalProps {
    type: ModalType;
    data: { current: CurrentConditions; history: HistoryPoint[]; dailyHistory: DailyHistoryPoint[]; };
    onClose: () => void;
}

const WeatherModal: React.FC<WeatherModalProps> = ({ type, data, onClose }) => {
    const [period, setPeriod] = useState<ExtendedPeriod>('rolling24h');

    const { chartData, isDaily } = useMemo(() => {
        const now = new Date();
        const nowEpoch = Math.floor(now.getTime() / 1000);
        let start = nowEpoch - 86400;
        switch(period) {
            case 'today': start = Math.floor(new Date().setHours(0,0,0,0) / 1000); break;
            case 'thisWeek': { const sw = new Date(); sw.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1)); sw.setHours(0,0,0,0); start = Math.floor(sw.getTime() / 1000); break; }
            case 'thisMonth': start = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0).getTime() / 1000); break;
            case 'thisYear': start = Math.floor(new Date(now.getFullYear(), 0, 1, 0,0,0,0).getTime() / 1000); break;
            case 'rolling24h': start = nowEpoch - 86400; break;
            case 'rolling7d': start = nowEpoch - (7 * 86400); break;
            case 'rolling30d': start = nowEpoch - (30 * 86400); break;
            case 'rolling365d': start = nowEpoch - (365 * 86400); break;
        }
        const dailyMode = (nowEpoch - start) > 2.5 * 86400;

        if (dailyMode) {
            const filtered = data.dailyHistory.filter(d => d.epoch >= start).map(d => ({
                ...d, 
                time: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                temp: d.tempAvg, 
                dewPoint: d.dewPointAvg, humidity: d.humidityAvg, pressure: d.pressureAvg,
                precip: d.precipTotal, wind: d.windSpeedMax, gust: d.windGustMax
            }));
            return { chartData: filtered, isDaily: true };
        }
        const filtered = data.history.filter(h => h.epoch >= start).map(h => ({
            ...h, 
            temp: h.temp,
            dewPoint: h.dewPoint, humidity: h.humidity, pressure: h.pressure,
            precip: h.precipRate, precipAccum: h.precipAccum, wind: h.windSpeed, gust: h.windGust
        }));
        return { chartData: filtered, isDaily: false };
    }, [data, period]);

    const stats = useMemo(() => {
        if (!chartData.length) return { max: 0, min: 0, total: 0 };
        
        if (type === 'precip') {
            const values = chartData.map(d => (d as any).precip || 0);
            return { 
                max: Math.max(...values), 
                min: 0, 
                total: values.reduce((a, b) => a + b, 0) 
            };
        }

        const maxProp = type === 'temp' ? 'tempHigh' : 
                        type === 'humidity' ? 'humidityHigh' : 
                        type === 'pressure' ? 'pressureMax' : 
                        type === 'wind' ? 'windGustMax' : type;

        const minProp = type === 'temp' ? 'tempLow' : 
                        type === 'humidity' ? 'humidityLow' : 
                        type === 'pressure' ? 'pressureMin' : 
                        type === 'wind' ? 'windSpeedMax' : type;

        const maxValues = chartData.map(d => (d as any)[maxProp] ?? (d as any)[type] ?? 0).filter(v => typeof v === 'number' && !isNaN(v));
        const minValues = chartData.map(d => (d as any)[minProp] ?? (d as any)[type] ?? 0).filter(v => typeof v === 'number' && !isNaN(v));
        
        return { 
            max: maxValues.length ? Math.max(...maxValues) : 0, 
            min: minValues.length ? Math.min(...minValues) : 0, 
            total: 0 
        };
    }, [chartData, type]);

    const unit = type === 'precip' ? 'mm' : type === 'humidity' ? '%' : type === 'pressure' ? 'hPa' : type === 'wind' ? 'km/h' : '°';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/98 backdrop-blur-3xl" onClick={onClose}></div>
            <div className="relative glass-panel w-full max-w-[95vw] rounded-[3rem] border border-slate-700/40 flex flex-col h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.6)] overflow-hidden animate-in zoom-in duration-300">
                
                <div className="h-40 px-12 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-8">
                    
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-inner">
                          {[{id:'today',l:'JOUR'},{id:'thisWeek',l:'SEM.'},{id:'thisMonth',l:'MOIS'},{id:'thisYear',l:'ANNÉE'}].map(p=>(
                              <button key={p.id} onClick={()=>setPeriod(p.id as ExtendedPeriod)} className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all tracking-widest ${period===p.id?'bg-slate-800 text-white shadow-lg ring-1 ring-white/10':'text-slate-500 hover:text-slate-300'}`}>{p.l}</button>
                          ))}
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] leading-none">CALENDRIER</span>
                    </div>

                    <div className="flex items-center gap-16">
                        {type === 'precip' ? (
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em]">CUMUL</span>
                                <span className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.total.toFixed(1)}{unit}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em]">MAX</span>
                                    <span className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.max.toFixed(1)}{unit}</span>
                                </div>
                                <div className="h-12 w-px bg-slate-800"></div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em]">MIN</span>
                                    <span className="text-7xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.min.toFixed(1)}{unit}</span>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-8">
                        <div className="flex flex-col items-center gap-3">
                            <div className="bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 flex items-center shadow-inner">
                                {[{id:'rolling24h',l:'24H'},{id:'rolling7d',l:'7J'},{id:'rolling30d',l:'30J'},{id:'rolling365d',l:'365J'}].map(p=>(
                                    <button key={p.id} onClick={()=>setPeriod(p.id as ExtendedPeriod)} className={`px-5 py-2.5 text-[10px] font-black rounded-xl transition-all tracking-widest relative ${period===p.id?'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]':'text-slate-500 hover:text-slate-300'}`}>{p.l}</button>
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] leading-none">GLISSANT</span>
                        </div>
                        <button onClick={onClose} className="p-3 hover:bg-slate-800 rounded-2xl text-slate-500 transition-all hover:text-white"><X size={32} strokeWidth={3} /></button>
                    </div>
                </div>

                <div className="flex-1 p-12 bg-slate-950/20 overflow-hidden flex flex-col">
                    <div className="flex-1 w-full bg-slate-950/60 rounded-[3.5rem] p-12 border border-slate-800/50 shadow-inner relative overflow-hidden">
                        <ResponsiveContainer width="100%" height="100%">
                            {type === 'temp' ? (
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="gTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/></linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} minTickGap={60} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}°`} domain={['auto', 'auto']} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={isDaily} />} cursor={{stroke: '#334155', strokeWidth: 2}} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="temp" name="TEMPÉRATURE" stroke="#f97316" fill="url(#gTemp)" strokeWidth={6} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="dewPoint" name="POINT DE ROSÉE" stroke="#10b981" strokeDasharray="8 8" strokeWidth={4} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : type === 'precip' ? (
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}mm`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={isDaily} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Bar dataKey="precip" name="TAUX (MM/H)" fill="#0ea5e9" radius={[15, 15, 0, 0]} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="precipAccum" name="CUMUL (MM)" stroke="#f43f5e" strokeWidth={6} dot={false} isAnimationActive={false} />
                                </ComposedChart>
                            ) : type === 'humidity' ? (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={[50, 100]} tickFormatter={v=>`${v}%`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={isDaily} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="humidity" name="HUMIDITÉ (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={6} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : type === 'wind' ? (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={isDaily} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="gust" name="RAFALES (KM/H)" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={6} dot={false} isAnimationActive={false} />
                                    <Area type="monotone" dataKey="wind" name="VENT MOYEN" stroke="#38bdf8" fill="none" strokeWidth={5} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={['auto', 'auto']} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={isDaily} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="pressure" name="PRESSION (HPA)" stroke="#c084fc" fill="#c084fc" fillOpacity={0.15} strokeWidth={6} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Monthly Precipitation Tab Content ---
const PrecipitationHistoryTab: React.FC<{ dailyHistory: DailyHistoryPoint[] }> = ({ dailyHistory }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    const availableYears = useMemo(() => {
        const detectedYears = dailyHistory.map(d => new Date(d.date).getFullYear());
        const yearSet = new Set([...detectedYears, 2025, 2026]);
        return Array.from(yearSet).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [dailyHistory]);

    const monthlyData = useMemo(() => {
        const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
        const data = monthNames.map((name, idx) => ({
            month: idx,
            monthLabel: name,
            total: 0,
            rainDays: 0
        }));

        dailyHistory.filter(d => new Date(d.date).getFullYear() === selectedYear).forEach(d => {
            const date = new Date(d.date);
            const mIdx = date.getMonth();
            data[mIdx].total += d.precipTotal;
            if (d.precipTotal > 0.2) {
                data[mIdx].rainDays += 1;
            }
        });

        return data;
    }, [dailyHistory, selectedYear]);

    const stats = useMemo(() => {
        const total = monthlyData.reduce((acc, m) => acc + m.total, 0);
        const wettestMonth = [...monthlyData].sort((a, b) => b.total - a.total)[0];
        const totalRainDays = monthlyData.reduce((acc, m) => acc + m.rainDays, 0);

        return {
            total,
            wettestMonth,
            totalRainDays
        };
    }, [monthlyData]);

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <CloudRain className="text-sky-500" size={24} /> Précipitations Mensuelles
                    </h2>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">CUMULS PAR MOIS</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
                        {availableYears.map(year => (
                            <button 
                                key={year} 
                                onClick={() => setSelectedYear(year)} 
                                className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all tracking-widest ${selectedYear === year ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">ANNÉE</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="bg-sky-500/20 p-4 rounded-2xl mb-4 text-sky-400"><CloudRain size={24} /></div>
                        <span className="text-5xl font-black text-white leading-none mb-2 tabular-nums">{stats.total.toFixed(1)}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">CUMUL ANNUEL (MM)</span>
                    </div>

                    <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="bg-emerald-500/10 p-4 rounded-2xl mb-4 text-emerald-500"><Droplets size={24} /></div>
                        <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{stats.totalRainDays}</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">JOURS DE PLUIE</span>
                    </div>

                    <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center">
                        <div className="bg-indigo-500/10 p-4 rounded-2xl mb-4 text-indigo-500"><TrendingUp size={24} /></div>
                        <span className="text-2xl font-black text-white leading-none mb-2 uppercase">{stats.wettestMonth.monthLabel}</span>
                        <span className="text-lg font-bold text-indigo-400 mb-1">{stats.wettestMonth.total.toFixed(1)} mm</span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">MOIS RECORD</span>
                    </div>
                </div>

                <div className="lg:col-span-9">
                    <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 h-full flex flex-col">
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">
                            <BarChart className="text-sky-500" size={24} /> Histogramme Mensuel
                        </h3>
                        <div className="flex-1 w-full bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 p-10 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="monthLabel" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={20} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}mm`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                                    <Bar dataKey="total" name="PRÉCIPITATIONS (MM)" fill="#0ea5e9" radius={[10, 10, 0, 0]} isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Growth Degree Days (DJC) Tab Content ---
const GrowthDegreeDaysTab: React.FC<{ dailyHistory: DailyHistoryPoint[] }> = ({ dailyHistory }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [baseThreshold, setBaseThreshold] = useState<number>(0);
    const [showInfoPopup, setShowInfoPopup] = useState(false);
    const [activeStatInfo, setActiveStatInfo] = useState<'cumul' | 'moyenne' | 'jours' | null>(null);
    const [selectedCropName, setSelectedCropName] = useState<string>("");

    const availableYears = useMemo(() => {
        const detectedYears = dailyHistory.map(d => new Date(d.date).getFullYear());
        const yearSet = new Set([...detectedYears, 2025, 2026]);
        return Array.from(yearSet).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [dailyHistory]);

    const selectedCrop = useMemo(() => 
        CROP_DATABASE.find(c => c.name === selectedCropName) || null
    , [selectedCropName]);

    // Update threshold when crop changes
    useEffect(() => {
        if (selectedCrop) {
            setBaseThreshold(selectedCrop.base);
        }
    }, [selectedCrop]);

    const djcData = useMemo(() => {
        let cumulative = 0;
        return dailyHistory
            .filter(d => new Date(d.date).getFullYear() === selectedYear)
            .map(d => {
                const gain = Math.max(0, d.tempAvg - baseThreshold);
                cumulative += gain;
                return {
                    ...d,
                    dailyGain: gain,
                    cumulatedGain: cumulative,
                    time: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
                };
            });
    }, [dailyHistory, selectedYear, baseThreshold]);

    const stats = useMemo(() => {
        if (!djcData.length) return { total: 0, avg: 0, activeDays: 0 };
        const total = djcData[djcData.length - 1].cumulatedGain;
        const activeDays = djcData.filter(d => d.dailyGain > 0).length;
        
        // Find maturity date if crop is selected
        let maturityDate = "";
        if (selectedCrop) {
            const matPoint = djcData.find(d => d.cumulatedGain >= selectedCrop.min);
            if (matPoint) {
                maturityDate = new Date(matPoint.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
            }
        }

        return {
            total,
            avg: total / djcData.length,
            activeDays,
            maturityDate
        };
    }, [djcData, selectedCrop]);

    const getStatExplanation = () => {
        switch(activeStatInfo) {
            case 'cumul': return {
                title: "Cumul DJC",
                desc: "Représente la somme totale des degrés-jours accumulés sur la période sélectionnée.",
                detail: "C'est l'indicateur principal du potentiel thermique disponible. Chaque espèce végétale nécessite un cumul spécifique pour atteindre ses stades clés (levée, floraison, maturité). Plus ce chiffre est élevé, plus le cycle de la plante progresse rapidement.",
                icon: <TrendingUp size={48} className="text-emerald-400" />
            };
            case 'moyenne': return {
                title: "Gain Moyen / Jour",
                desc: "Intensité thermique moyenne enregistrée quotidiennement au-dessus du seuil biologique.",
                detail: "Cet indicateur mesure la 'poussée' thermique journalière. Une moyenne élevée indique des conditions optimales pour un développement vigoureux, tandis qu'une valeur proche de zéro signale une croissance ralentie par des températures trop fraîches par rapport au seuil de base choisi.",
                icon: <Activity size={48} className="text-emerald-500" />
            };
            case 'jours': return {
                title: "Jours Actifs",
                desc: "Nombre total de jours durant lesquels la température moyenne a dépassé le seuil de base.",
                detail: "Il permet de quantifier la régularité de la saison de croissance. Un nombre de jours actifs élevé, même avec un cumul modéré, est souvent préférable à quelques pics de chaleur extrêmes, car il garantit un développement physiologique plus stable et harmonieux de la plante.",
                icon: <Calendar size={48} className="text-emerald-500" />
            };
            default: return null;
        }
    };

    const explanation = getStatExplanation();

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header / Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <Sprout className="text-emerald-500" size={24} /> DJC
                        </h2>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">SUIVI THERMIQUE DES CULTURES</span>
                    </div>
                    <button 
                        onClick={() => setShowInfoPopup(true)} 
                        className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl hover:bg-emerald-600/30 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/10 flex items-center gap-2 group"
                    >
                        <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Plus d'infos</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* CROP SELECTOR */}
                    <div className="flex flex-col items-center gap-1.5 min-w-[200px]">
                        <div className="relative w-full">
                            <select 
                                value={selectedCropName}
                                onChange={(e) => setSelectedCropName(e.target.value)}
                                className="w-full bg-slate-950/80 p-2 text-[10px] font-black rounded-xl border border-slate-800 text-slate-300 appearance-none outline-none focus:border-emerald-500/50 transition-all cursor-pointer px-4 pr-10"
                            >
                                <option value="">SÉLECTIONNER UNE CULTURE</option>
                                {CROP_DATABASE.reduce((acc: any[], crop) => {
                                    if (!acc.find(a => a.cat === crop.cat)) {
                                        acc.push({ cat: crop.cat, items: CROP_DATABASE.filter(c => c.cat === crop.cat) });
                                    }
                                    return acc;
                                }, []).map(group => (
                                    <optgroup key={group.cat} label={group.cat.toUpperCase()} className="bg-slate-900 text-emerald-400 text-[10px] font-black">
                                        {group.items.map((item: any) => (
                                            <option key={item.name} value={item.name} className="text-white bg-slate-900 font-bold">{item.name}</option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                <Search size={14} />
                            </div>
                        </div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">CHOIX DU VÉGÉTAL</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner overflow-x-auto no-scrollbar">
                            {[0, 4, 5, 6, 7, 8, 10].map(val => (
                                <button 
                                    key={val} 
                                    onClick={() => {
                                        setBaseThreshold(val);
                                        setSelectedCropName(""); // Reset crop if manual threshold is chosen
                                    }} 
                                    className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all tracking-widest ${baseThreshold === val ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {val}°
                                </button>
                            ))}
                        </div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">SEUIL DE BASE</span>
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                        <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
                            {availableYears.map(year => (
                                <button 
                                    key={year} 
                                    onClick={() => setSelectedYear(year)} 
                                    className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all tracking-widest ${selectedYear === year ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {year}
                                </button>
                            ))}
                        </div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">ANNÉE</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                {/* Stats */}
                <div className="lg:col-span-3">
                    <div className="flex flex-col gap-4 h-full">
                        {selectedCrop && (
                            <div className="glass-panel p-6 rounded-[2rem] border border-emerald-500/30 bg-emerald-600/5 animate-in slide-in-from-left duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400"><Sprout size={18} /></div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest">{selectedCrop.name}</h4>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase">Progrès Maturité</span>
                                        <span className="text-xs font-black text-emerald-400">{Math.min(100, (stats.total / selectedCrop.min * 100)).toFixed(0)}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                                        <div 
                                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" 
                                            style={{ width: `${Math.min(100, (stats.total / selectedCrop.min * 100))}%` }}
                                        ></div>
                                    </div>
                                    {stats.maturityDate ? (
                                        <div className="bg-emerald-500/20 p-3 rounded-xl border border-emerald-500/20 flex items-center gap-3">
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-emerald-400 uppercase">Maturité Atteinte</span>
                                                <span className="text-[10px] font-black text-white">{stats.maturityDate}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                                            <Timer size={16} className="text-slate-500" />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-500 uppercase">Besoin restant</span>
                                                <span className="text-[10px] font-black text-white">{(selectedCrop.min - stats.total).toFixed(0)} DJC</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={() => setActiveStatInfo('cumul')}
                            className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center group transition-all hover:bg-slate-900/60 active:scale-95 cursor-help"
                        >
                            <div className="bg-emerald-500/20 p-3.5 rounded-2xl mb-3 text-emerald-400 group-hover:scale-110 transition-transform"><TrendingUp size={20} /></div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{stats.total.toFixed(0)}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">CUMUL DJC</span>
                        </button>

                        <button 
                            onClick={() => setActiveStatInfo('moyenne')}
                            className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center group hover:bg-slate-900/60 transition-all active:scale-95 cursor-help"
                        >
                            <div className="bg-emerald-500/10 p-3.5 rounded-2xl mb-3 text-emerald-500 group-hover:scale-110 transition-transform"><Activity size={20} /></div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{stats.avg.toFixed(1)}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">GAIN MOYEN / JOUR</span>
                        </button>
                        
                        <button 
                            onClick={() => setActiveStatInfo('jours')}
                            className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center group hover:bg-slate-900/60 transition-all active:scale-95 cursor-help"
                        >
                            <div className="bg-emerald-500/10 p-3.5 rounded-2xl mb-3 text-emerald-500 group-hover:scale-110 transition-transform"><Calendar size={20} /></div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{stats.activeDays}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">JOURS ACTIFS</span>
                        </button>
                    </div>
                </div>

                {/* Main Chart */}
                <div className="lg:col-span-9 flex flex-col h-full">
                    <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 flex-grow flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                    <LineChartIcon className="text-emerald-500" size={24} /> Évolution & Cumul DJC
                                </h3>
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">FORMULE : MAX(0, TEMP. MOYENNE - {baseThreshold}°C)</span>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                                    <div className="w-3 h-3 bg-emerald-500/30 rounded-sm"></div> Gain Quotidien
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                    <div className="w-8 h-px bg-emerald-400 border-t-2"></div> Cumul Annuel
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 p-10 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={djcData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={20} className="font-black tracking-widest" />
                                    <YAxis yAxisId="left" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}`} domain={[0, 'auto']} className="font-black" />
                                    <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}`} domain={[0, 'auto']} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                    
                                    {selectedCrop && (
                                        <>
                                            <ReferenceLine 
                                                yAxisId="right" 
                                                y={selectedCrop.min} 
                                                stroke="#10b981" 
                                                strokeDasharray="10 5" 
                                                strokeWidth={2}
                                                label={{ position: 'right', value: `MIN: ${selectedCrop.min}`, fill: '#10b981', fontSize: 10, fontWeight: 'black' }} 
                                            />
                                            <ReferenceLine 
                                                yAxisId="right" 
                                                y={selectedCrop.max} 
                                                stroke="#ef4444" 
                                                strokeDasharray="10 5" 
                                                strokeWidth={2}
                                                label={{ position: 'right', value: `MAX: ${selectedCrop.max}`, fill: '#ef4444', fontSize: 10, fontWeight: 'black' }} 
                                            />
                                        </>
                                    )}

                                    <Bar yAxisId="left" dataKey="dailyGain" name="GAIN DU JOUR" fill="#10b981" fillOpacity={0.3} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Line yAxisId="right" type="monotone" dataKey="cumulatedGain" name="CUMUL (DJC)" stroke="#34d399" strokeWidth={5} dot={false} isAnimationActive={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL EXPLICATION STATISTIQUE */}
            {activeStatInfo && explanation && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" onClick={() => setActiveStatInfo(null)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] border border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.2)] overflow-hidden flex flex-col animate-in zoom-in duration-300">
                        <div className="p-10 border-b border-slate-800 bg-emerald-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-emerald-600/20 rounded-2xl text-emerald-400 border border-emerald-500/20">
                                    {explanation.icon}
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{explanation.title}</h2>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mt-2 italic">DÉFINITION AGRONOMIQUE</span>
                                </div>
                            </div>
                            <button onClick={() => setActiveStatInfo(null)} className="p-3 bg-slate-900 hover:bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all border border-slate-800">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="p-12 space-y-8">
                            <p className="text-xl text-white font-bold leading-relaxed">{explanation.desc}</p>
                            <div className="bg-slate-950/40 p-8 rounded-2xl border border-slate-800/50">
                                <p className="text-slate-300 leading-relaxed italic">{explanation.detail}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-900/40 text-center border-t border-slate-800">
                             <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Cliquez n'importe où pour fermer</span>
                        </div>
                    </div>
                </div>
            )}

            {/* INFO POPUP DJC */}
            {showInfoPopup && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl" onClick={() => setShowInfoPopup(false)}></div>
                    <div className="relative glass-panel w-full max-w-6xl rounded-[4rem] border border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col h-[85vh] animate-in zoom-in duration-300">
                        <div className="h-40 px-16 border-b border-slate-800/50 bg-emerald-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className="p-6 bg-emerald-600/20 rounded-[2rem] text-emerald-400 border border-emerald-500/30">
                                    <Sprout size={48} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Degré-Jours (DJC)</h2>
                                    <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.5em] mt-3">PHYSIOLOGIE VÉGÉTALE & THERMIE</span>
                                </div>
                            </div>
                            <button onClick={() => setShowInfoPopup(false)} className="p-4 bg-slate-900/80 hover:bg-slate-800 text-slate-500 hover:text-white rounded-[1.5rem] transition-all border border-slate-800">
                                <X size={32} strokeWidth={3} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-16 space-y-16">
                            <section>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8 border-b border-slate-800 pb-4">QU'EST-CE QU'UN DJC ?</h3>
                                <p className="text-2xl text-slate-300 leading-relaxed font-bold">
                                    Les Degré-Jours de Croissance mesurent l’accumulation de chaleur nécessaire au développement des plantes. Ils permettent de prévoir les périodes de croissance active et d’estimer la date de maturité des cultures.
                                </p>
                                <div className="mt-10 bg-slate-900/60 p-10 rounded-[2.5rem] border border-slate-800 font-mono text-center">
                                    <span className="text-emerald-400 text-2xl font-black">DJC = Température Moyenne − Seuil de Base</span>
                                    <p className="text-slate-500 text-xs mt-4 uppercase tracking-widest">(Si la température est sous le seuil, le DJC est de 0)</p>
                                </div>
                            </section>

                            <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-6">POURQUOI LES UTILISER ?</h3>
                                    <ul className="space-y-6">
                                        <li className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                            <p className="text-sm text-slate-300 font-bold"><span className="text-emerald-400 uppercase">Planification :</span> Savoir exactement quand semer et récolter.</p>
                                        </li>
                                        <li className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                            <p className="text-sm text-slate-300 font-bold"><span className="text-emerald-400 uppercase">Précision :</span> Adapter les interventions selon les besoins thermiques réels.</p>
                                        </li>
                                        <li className="flex gap-4 items-start">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                            <p className="text-sm text-slate-300 font-bold"><span className="text-emerald-400 uppercase">Maturité :</span> Anticiper la récolte pour maximiser les rendements.</p>
                                        </li>
                                    </ul>
                                </div>
                                <div className="bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10">
                                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.5em] mb-4">EXEMPLE DE SEUILS</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between border-b border-emerald-500/10 pb-2"><span className="text-xs font-bold text-slate-300">Blé</span><span className="text-xs font-black text-emerald-400">0°C</span></div>
                                        <div className="flex justify-between border-b border-emerald-500/10 pb-2"><span className="text-xs font-bold text-slate-300">Betterave</span><span className="text-xs font-black text-emerald-400">5°C</span></div>
                                        <div className="flex justify-between border-b border-emerald-500/10 pb-2"><span className="text-xs font-bold text-slate-300">Maïs</span><span className="text-xs font-black text-emerald-400">6°C</span></div>
                                        <div className="flex justify-between border-b border-emerald-500/10 pb-2"><span className="text-xs font-bold text-slate-300">Vigne</span><span className="text-xs font-black text-emerald-400">10°C</span></div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="h-24 bg-slate-900/60 border-t border-slate-800 px-16 flex items-center justify-center">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Thermie Végétale • Accumulation • Précision Agricole</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Thermal Amplitude Analyzer Tab Content ---
const ThermalAmplitudeTab: React.FC<{ dailyHistory: DailyHistoryPoint[] }> = ({ dailyHistory }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showInfoPopup, setShowInfoPopup] = useState(false);
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [showCriticalModal, setShowCriticalModal] = useState(false);

    const availableYears = useMemo(() => {
        const detectedYears = dailyHistory.map(d => new Date(d.date).getFullYear());
        const yearSet = new Set([...detectedYears, 2025, 2026]);
        return Array.from(yearSet).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [dailyHistory]);

    const filteredData = useMemo(() => {
        return dailyHistory
            .filter(d => new Date(d.date).getFullYear() === selectedYear)
            .map(d => ({
                ...d,
                amplitude: d.tempHigh - d.tempLow,
                time: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
            }));
    }, [dailyHistory, selectedYear]);

    const analysis = useMemo(() => {
        const events = filteredData.map(d => ({
            date: d.date,
            amp: d.amplitude,
            high: d.tempHigh,
            low: d.tempLow,
            isCritical: d.amplitude > 15
        }));

        const criticalEvents = events.filter(e => e.isCritical);
        
        let currentStreak: any[] = [];
        let maxStreakDates: any[] = [];
        
        events.forEach(e => {
            if (e.isCritical) {
                currentStreak.push(e);
                if (currentStreak.length >= maxStreakDates.length) {
                    maxStreakDates = [...currentStreak];
                }
            } else {
                currentStreak = [];
            }
        });

        return {
            events: criticalEvents.reverse(), // Du plus récent au plus ancien
            maxAmp: events.length ? Math.max(...events.map(e => e.amp)) : 0,
            totalCritical: criticalEvents.length,
            maxStreak: maxStreakDates.length,
            streakDates: maxStreakDates
        };
    }, [filteredData]);

    const handleOpenStreak = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (analysis.maxStreak > 0) {
            setShowStreakModal(true);
        }
    };

    const handleOpenCritical = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (analysis.totalCritical > 0) {
            setShowCriticalModal(true);
        }
    };

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header / Filter Bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <Thermometer className="text-orange-500" size={24} /> Amplitude Thermique
                        </h2>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">ANALYSE DU STRESS AGRICOLE</span>
                    </div>
                    <button 
                        onClick={() => setShowInfoPopup(true)} 
                        className="p-3 bg-orange-600/20 text-orange-400 rounded-xl hover:bg-orange-600/30 transition-all border border-orange-500/20 shadow-lg shadow-orange-500/10 flex items-center gap-2 group"
                    >
                        <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Plus d'infos</span>
                    </button>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                    <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner overflow-x-auto max-w-[300px] md:max-w-none no-scrollbar">
                        {availableYears.map(year => (
                            <button 
                                key={year} 
                                onClick={() => setSelectedYear(year)} 
                                className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all tracking-widest ${selectedYear === year ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">CHOIX DE L'ANNÉE</span>
                </div>
            </div>

            {/* Dashboard Layout - High Level Structure to fix alignment */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                
                {/* LEFT SIDEBAR (3 cols): Stats Only */}
                <div className="lg:col-span-3">
                    <div className="flex flex-col gap-4 h-full">
                        {/* BRIQUE JOURS CRITIQUES */}
                        <button 
                            type="button"
                            onClick={handleOpenCritical}
                            className={`glass-panel p-6 rounded-[2rem] border flex-1 flex flex-col items-center justify-center text-center group transition-all relative overflow-hidden active:scale-95 ${analysis.totalCritical > 0 ? 'cursor-pointer hover:bg-slate-900/60 hover:border-orange-500/50 border-slate-800' : 'cursor-default border-slate-800/50 opacity-60'}`}
                        >
                            <div className="bg-orange-500/20 p-3.5 rounded-2xl mb-3 text-orange-400 group-hover:scale-110 transition-transform"><Calendar size={20} /></div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{analysis.totalCritical}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">JOURS CRITIQUES (>15°C)</span>
                            {analysis.totalCritical > 0 && (
                                <div className="mt-4 flex items-center gap-2 text-[7px] font-black text-orange-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                                    Voir la liste <ChevronRight size={8} />
                                </div>
                            )}
                        </button>

                        {/* BRIQUE AMPLITUDE MAX */}
                        <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center group hover:bg-slate-900/60 transition-all">
                            <div className="bg-red-500/20 p-3.5 rounded-2xl mb-3 text-red-400 group-hover:scale-110 transition-transform"><Thermometer size={20} /></div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{analysis.maxAmp.toFixed(1)}°</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">AMPLITUDE MAX</span>
                        </div>
                        
                        {/* BRIQUE SÉRIE MAX */}
                        <button 
                            type="button"
                            onClick={handleOpenStreak}
                            className={`glass-panel p-6 rounded-[2rem] border flex-1 flex flex-col items-center justify-center text-center group transition-all relative overflow-hidden active:scale-95 ${analysis.maxStreak > 0 ? 'cursor-pointer hover:bg-slate-900/60 hover:border-sky-500/50 border-slate-800' : 'cursor-default border-slate-800/50 opacity-60'}`}
                        >
                            <div className="bg-sky-500/20 p-3.5 rounded-2xl mb-3 text-sky-400 group-hover:scale-110 transition-transform flex items-center justify-center relative">
                                <Activity size={20} />
                                {analysis.maxStreak > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-sky-500 rounded-full animate-ping"></span>}
                            </div>
                            <span className="text-4xl font-black text-white leading-none mb-2 tabular-nums">{analysis.maxStreak}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">SÉRIE MAX (JOURS)</span>
                            
                            {analysis.maxStreak > 0 && (
                                <div className="mt-4 flex items-center gap-2 text-[7px] font-black text-sky-500 uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-opacity bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                                    Voir les dates <ChevronRight size={8} />
                                </div>
                            )}
                        </button>
                    </div>
                </div>

                {/* RIGHT CONTENT (9 cols): Main Chart */}
                <div className="lg:col-span-9 flex flex-col gap-8 h-full">
                    <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 flex-grow flex flex-col">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                <Activity className="text-orange-500" size={24} /> Évolution de l'Amplitude Thermique
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-xl border border-red-500/20">
                                <div className="w-8 h-px bg-red-500 border-t border-dashed border-red-500"></div> Seuil 15°C
                            </div>
                        </div>
                        <div className="flex-1 w-full bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 p-10 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={filteredData}>
                                    <defs>
                                        <linearGradient id="gAmp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.4}/><stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={20} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}°`} domain={[0, 'auto']} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                    <Area type="monotone" dataKey="amplitude" name="AMPLITUDE (°C)" stroke="#f97316" strokeWidth={6} fill="url(#gAmp)" isAnimationActive={false} dot={false} />
                                    <Line type="monotone" dataKey={() => 15} stroke="#ef4444" strokeDasharray="15 15" strokeWidth={3} dot={false} name="SEUIL" isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* CRITICAL DAYS FULL LIST MODAL */}
            {showCriticalModal && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setShowCriticalModal(false)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] border border-orange-500/30 shadow-[0_0_100px_rgba(234,88,12,0.2)] overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-8 border-b border-slate-800 bg-orange-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-orange-600/20 rounded-2xl text-orange-400 border border-orange-500/20">
                                    <List size={24} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Stress Thermique : {selectedYear}</h3>
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{analysis.totalCritical} jours identifiés (>15°C d'écart)</p>
                                </div>
                            </div>
                            <button onClick={() => setShowCriticalModal(false)} className="p-3 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all border border-slate-700">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-custom bg-slate-950/20">
                            {analysis.events.map((day, idx) => (
                                <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-orange-500/40 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest group-hover:text-orange-400">
                                            {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl font-black text-white tabular-nums">{day.low.toFixed(1)}°</span>
                                            <ArrowRight size={16} className="text-slate-700" />
                                            <span className="text-xl font-black text-white tabular-nums">{day.high.toFixed(1)}°</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-1">STRESS</span>
                                        <span className="text-3xl font-black text-white tabular-nums tracking-tighter">+{day.amp.toFixed(1)}°</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-950/60 text-center border-t border-slate-800 flex items-center justify-center gap-8">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Total Jours</span>
                                <span className="text-lg font-black text-white uppercase">{analysis.totalCritical}</span>
                            </div>
                            <div className="w-px h-8 bg-slate-800"></div>
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Amplitude Max</span>
                                <span className="text-lg font-black text-orange-500 uppercase">+{analysis.maxAmp.toFixed(1)}°</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STREAK DETAILS MODAL */}
            {showStreakModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setShowStreakModal(false)}></div>
                    <div className="relative glass-panel w-full max-w-lg rounded-[3rem] border border-sky-500/30 shadow-[0_0_100px_rgba(14,165,233,0.2)] overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-slate-800 bg-sky-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Activity className="text-sky-400" size={24} />
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">Série Record</h3>
                                    <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest">{analysis.maxStreak} jours consécutifs de stress</p>
                                </div>
                            </div>
                            <button onClick={() => setShowStreakModal(false)} className="p-2 bg-slate-800/50 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-all border border-slate-700">
                                <X size={24} strokeWidth={3} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 scrollbar-custom">
                            {analysis.streakDates.map((day, idx) => (
                                <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex items-center justify-between group">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-500 uppercase mb-1 tracking-widest group-hover:text-sky-400">
                                            {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-black text-white tabular-nums">{day.low.toFixed(1)}°</span>
                                            <ArrowRight size={14} className="text-slate-700" />
                                            <span className="text-lg font-black text-white tabular-nums">{day.high.toFixed(1)}°</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-black text-sky-500 uppercase tracking-widest mb-1">AMPLITUDE</span>
                                        <span className="text-2xl font-black text-white tabular-nums tracking-tighter">+{day.amp.toFixed(1)}°</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-950/60 text-center border-t border-slate-800">
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Période la plus intense détectée en {selectedYear}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* INFO POPUP MODAL */}
            {showInfoPopup && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-3xl" onClick={() => setShowInfoPopup(false)}></div>
                    <div className="relative glass-panel w-full max-w-6xl rounded-[4rem] border border-orange-500/20 shadow-[0_0_100px_rgba(234,88,12,0.15)] overflow-hidden flex flex-col h-[85vh] animate-in zoom-in duration-300">
                        {/* Modal Header */}
                        <div className="h-40 px-16 border-b border-slate-800/50 bg-orange-600/5 flex items-center justify-between">
                            <div className="flex items-center gap-8">
                                <div className="p-6 bg-orange-600/20 rounded-[2rem] text-orange-400 border border-orange-500/30">
                                    <Sprout size={48} strokeWidth={2.5} />
                                </div>
                                <div className="flex flex-col">
                                    <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Stress de Culture</h2>
                                    <span className="text-[11px] font-black text-orange-400 uppercase tracking-[0.5em] mt-3">GUIDE & PRATIQUES AGRICOLES</span>
                                </div>
                            </div>
                            <button onClick={() => setShowInfoPopup(false)} className="p-4 bg-slate-900/80 hover:bg-slate-800 text-slate-500 hover:text-white rounded-[1.5rem] transition-all border border-slate-800">
                                <X size={32} strokeWidth={3} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-16 space-y-16">
                            <section>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-8 border-b border-slate-800 pb-4">COMPRENDRE L'ENJEU</h3>
                                <p className="text-2xl text-slate-300 leading-relaxed font-bold">
                                    Identifier et anticiper les périodes d'amplitudes thermiques élevées. Lorsque la différence entre la température maximale et minimale dépasse <span className="text-orange-400 underline decoration-4 underline-offset-8">15°C</span> sur une journée, les cultures peuvent subir un <span className="text-orange-400 font-black">stress thermique significatif</span>.
                                </p>
                                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
                                        <div className="text-sky-400 mb-4"><Activity size={24} /></div>
                                        <p className="text-sm font-bold text-slate-400 leading-relaxed">Impact direct sur la croissance et le métabolisme des plantes.</p>
                                    </div>
                                    <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
                                        <div className="text-sky-400 mb-4"><Droplets size={24} /></div>
                                        <p className="text-sm font-bold text-slate-400 leading-relaxed">Accélération de la déshydratation des tissus végétaux.</p>
                                    </div>
                                    <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-slate-800">
                                        <div className="text-sky-400 mb-4"><AlertTriangle size={24} /></div>
                                        <p className="text-sm font-bold text-slate-400 leading-relaxed">Augmentation de la vulnérabilité aux maladies cryptogamiques.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-10 border-b border-slate-800 pb-4 flex items-center gap-4">
                                    <Zap className="text-yellow-400" size={20} /> ACTIONS PRÉCONISÉES
                                </h3>
                                <div className="space-y-10">
                                    <div className="flex gap-10 group">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 font-black text-2xl">1</div>
                                        <p className="text-xl text-slate-300 leading-relaxed font-bold pt-2">
                                            Identifiez les jours avec une <span className="text-orange-400">amplitude thermique > 15°C</span> pour évaluer les périodes critiques de stress thermique.
                                        </p>
                                    </div>
                                    <div className="flex gap-10 group">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 font-black text-2xl">2</div>
                                        <p className="text-xl text-slate-300 leading-relaxed font-bold pt-2">
                                            Analysez les mois où ces amplitudes sont les plus fréquentes pour adapter vos pratiques agricoles (<span className="text-sky-400 underline decoration-2 underline-offset-4">paillage, irrigation, ombrage</span>).
                                        </p>
                                    </div>
                                    <div className="flex gap-10 group">
                                        <div className="w-16 h-16 rounded-[1.5rem] bg-orange-600/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/20 font-black text-2xl">3</div>
                                        <p className="text-xl text-slate-300 leading-relaxed font-bold pt-2">
                                            Notez les séries de jours consécutifs avec des amplitudes > 15°C pour planifier des <span className="text-purple-400 font-black">interventions ciblées</span> sur les parcelles sensibles.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="h-24 bg-slate-900/60 border-t border-slate-800 px-16 flex items-center justify-center">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Microclimat • Stabilisation • Vigilance Agronomique</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main App Component ---
const App: React.FC = () => {
  const [data, setData] = useState<{ current: CurrentConditions; history: HistoryPoint[]; dailyHistory: DailyHistoryPoint[]; } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isLoading, setIsLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType | null>(null);
  const [now, setNow] = useState(new Date());

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const weatherData = await getWeatherData();
      setData(weatherData);
    } catch (err: any) { console.error(err); } finally { setIsLoading(false); }
  };

  useEffect(() => { 
    refreshData();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sunTimes = useMemo(() => getSunTimes(now), [now]);
  const isNight = now.getTime() > sunTimes.dusk || now.getTime() < sunTimes.dawn;
  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const chartHistory = useMemo(() => {
    if (!data?.history) return [];
    const yesterday = Math.floor(Date.now() / 1000) - 86400;
    return data.history.filter(h => h.epoch > yesterday);
  }, [data]);

  if (isLoading && !data) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><RefreshCcw className="animate-spin text-sky-500" size={48} /></div>;
  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 font-sans overflow-x-hidden">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Navigation - Homogeneous form */}
        <div className="flex gap-4 mb-10 bg-slate-900/50 p-2 rounded-2xl w-fit border border-slate-800 shadow-xl mx-auto md:mx-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab(Tab.DASHBOARD)} className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black transition-all tracking-widest shrink-0 ${activeTab === Tab.DASHBOARD ? 'bg-sky-600 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <LayoutDashboard size={18}/> DASHBOARD
            </button>
            <button onClick={() => setActiveTab(Tab.ANALYSIS)} className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black transition-all tracking-widest shrink-0 ${activeTab === Tab.ANALYSIS ? 'bg-orange-600 text-white shadow-[0_0_20px_rgba(234,88,12,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <Activity size={18}/> AMPLITUDE THERMIQUE
            </button>
            <button onClick={() => setActiveTab(Tab.DJC)} className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black transition-all tracking-widest shrink-0 ${activeTab === Tab.DJC ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <Sprout size={18}/> DJC
            </button>
            <button onClick={() => setActiveTab(Tab.PRECIPITATION)} className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black transition-all tracking-widest shrink-0 ${activeTab === Tab.PRECIPITATION ? 'bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.3)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <CloudRain size={18}/> PRÉCIPITATIONS
            </button>
        </div>

        {activeTab === Tab.DASHBOARD && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
             {/* Sidebar gauche */}
             <div className="lg:col-span-3 flex flex-col gap-6">
                <MainStats current={data.current} 
                    onTempClick={() => setActiveModal('temp')} 
                    onPrecipClick={() => setActiveModal('precip')} 
                    onHumidityClick={() => setActiveModal('humidity')} 
                    onPressureClick={() => setActiveModal('pressure')} 
                    className="flex flex-col gap-6"
                />
                <WindCompass direction={data.current.windDir} speed={data.current.windSpeed} gust={data.current.windGust} onClick={() => setActiveModal('wind')} />
             </div>

             {/* Main content droite */}
             <div className="lg:col-span-9 flex flex-col gap-8">
                {/* Sun Timeline */}
                <div className="flex flex-wrap items-center gap-8 bg-slate-900/50 p-6 rounded-[2.5rem] border border-slate-800 relative overflow-hidden shadow-2xl">
                    <div className="flex items-center gap-6 border-r border-slate-700/50 pr-10">
                        <div className={`p-5 rounded-3xl ${isNight ? 'bg-indigo-500/20 text-indigo-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            {isNight ? <Moon size={32} /> : <Sun size={32} />}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-4xl font-black text-white tabular-nums tracking-tighter leading-none">{now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</span>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-3 flex items-center gap-2"><Clock size={12}/> {isNight ? 'Phase Nocturne' : 'Phase Diurne'}</span>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-around items-center px-4">
                        <div className="text-center group"><span className="text-[10px] font-black text-slate-500 uppercase block mb-2 opacity-50 group-hover:opacity-100 transition-opacity">1. AUBE</span><span className="text-base font-bold text-slate-300">{fmtTime(sunTimes.dawn)}</span></div>
                        <ArrowRight size={16} className="text-slate-700" />
                        <div className="text-center"><span className="text-[10px] font-black text-orange-400 uppercase block mb-2 tracking-widest flex items-center gap-2 justify-center"><Sunrise size={12}/> 2. LEVER</span><span className="text-2xl font-black text-white">{fmtTime(sunTimes.sunrise)}</span></div>
                        <div className="h-10 w-px bg-slate-800/80 mx-4"></div>
                        <div className="text-center"><span className="text-[10px] font-black text-orange-500 uppercase block mb-2 tracking-widest flex items-center gap-2 justify-center"><Sunset size={12}/> 1. COUCHER</span><span className="text-2xl font-black text-white">{fmtTime(sunTimes.sunset)}</span></div>
                        <ArrowRight size={16} className="text-slate-700" />
                        <div className="text-center group"><span className="text-[10px] font-black text-slate-500 uppercase block mb-2 opacity-50 group-hover:opacity-100 transition-opacity">2. CRÉPUSCULE</span><span className="text-base font-bold text-slate-300">{fmtTime(sunTimes.dusk)}</span></div>
                    </div>
                </div>

                {/* Dashboard Charts (24h) */}
                <Charts data={chartHistory} />
             </div>
           </div>
        )}

        {activeTab === Tab.ANALYSIS && (
            <ThermalAmplitudeTab dailyHistory={data.dailyHistory} />
        )}

        {activeTab === Tab.DJC && (
            <GrowthDegreeDaysTab dailyHistory={data.dailyHistory} />
        )}

        {activeTab === Tab.PRECIPITATION && (
            <PrecipitationHistoryTab dailyHistory={data.dailyHistory} />
        )}
      </main>

      {/* --- Weather Modal --- */}
      {activeModal && (
        <WeatherModal 
            type={activeModal} 
            data={data} 
            onClose={() => setActiveModal(null)} 
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
