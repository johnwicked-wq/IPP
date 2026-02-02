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
  BarChart as BarChartIcon,
  Search,
  CheckCircle2,
  Timer,
  CloudRain,
  Snowflake,
  Flame,
  Bot
} from 'lucide-react';
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Bar, Line, ComposedChart, Area, AreaChart, ReferenceLine, BarChart, LabelList } from 'recharts';

// --- Culture Database ---
const CROP_DATABASE = [
    { cat: 'Céréales', name: 'Avoine', min: 1200, max: 1400, base: 0 },
    { cat: 'Céréales', name: 'Orge', min: 1200, max: 1400, base: 0 },
    { cat: 'Céréales', name: 'Blé tendre', min: 1400, max: 1600, base: 0 },
    { cat: 'Céréales', name: 'Maïs (grain)', min: 1000, max: 1400, base: 6 },
    { cat: 'Fruits', name: 'Raisins', min: 1600, max: 2000, base: 10 },
    { cat: 'Fruits', name: 'Pommes', min: 1500, max: 2000, base: 7 },
    { cat: 'Légumes', name: 'Tomates', min: 1200, max: 1500, base: 10 },
    { cat: 'Légumineuses', name: 'Pois chiches', min: 1200, max: 1500, base: 5 },
    { cat: 'PPAM', name: 'Lavande', min: 1000, max: 1200, base: 10 },
];

// --- Simple Markdown Renderer ---
const ReactMarkdown = ({ children }: { children?: React.ReactNode }) => {
    const text = typeof children === 'string' ? children : String(children || '');
    const content = text
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-black text-indigo-300 mt-6 mb-3 uppercase tracking-tight">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-black text-white mt-8 mb-4 uppercase tracking-tighter">$1</h2>')
        .replace(/\*\*(.*)\*\*/gim, '<strong class="text-indigo-400 font-black">$1</strong>')
        .replace(/^\* (.*$)/gim, '<div class="flex gap-3 mb-2"><span class="text-indigo-500">•</span><span class="text-slate-300 text-sm">$1</span></div>')
        .replace(/\n/gim, '<br />');

    return <div className="leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} />;
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
            let runningPrecipAccum = 0;
            const filtered = data.dailyHistory.filter(d => d.epoch >= start).map(d => {
                runningPrecipAccum += (d.precipTotal || 0);
                return {
                    ...d, 
                    time: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    temp: d.tempAvg || 0, 
                    dewPoint: d.dewPointAvg || 0, 
                    humidity: d.humidityAvg || 0, 
                    pressure: d.pressureAvg || 0,
                    precip: d.precipTotal || 0, 
                    precipAccum: runningPrecipAccum,
                    wind: d.windSpeedMax || 0, 
                    gust: d.windGustMax || 0
                };
            });
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

                    <div className="flex items-center gap-10">
                        {type === 'precip' ? (
                            <div className="flex items-center gap-4">
                                <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em]">CUMUL</span>
                                <span className="text-5xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.total.toFixed(1)}{unit}</span>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-red-500 uppercase tracking-[0.3em]">MAX</span>
                                    <span className="text-5xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.max.toFixed(1)}{unit}</span>
                                </div>
                                <div className="h-12 w-px bg-slate-800"></div>
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-[0.3em]">MIN</span>
                                    <span className="text-5xl font-black text-white tabular-nums tracking-tighter leading-none">{stats.min.toFixed(1)}{unit}</span>
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
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} cursor={{stroke: '#334155', strokeWidth: 2}} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="temp" name="TEMPÉRATURE" stroke="#f97316" fill="url(#gTemp)" strokeWidth={6} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="dewPoint" name="POINT DE ROSÉE" stroke="#10b981" strokeDasharray="8 8" strokeWidth={4} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : type === 'precip' ? (
                                <ComposedChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}mm`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Bar dataKey="precip" name="PRÉCIPITATIONS (MM)" fill="#0ea5e9" radius={[15, 15, 0, 0]} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="precipAccum" name="CUMUL (MM)" stroke="#f43f5e" strokeWidth={6} dot={false} isAnimationActive={false} />
                                </ComposedChart>
                            ) : type === 'humidity' ? (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v=>`${v}%`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="humidity" name="HUMIDITÉ (%)" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={6} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : type === 'wind' ? (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={40}/>
                                    <Area type="monotone" dataKey="gust" name="RAFALES (KM/H)" stroke="#f97316" fill="#f97316" fillOpacity={0.15} strokeWidth={6} dot={false} isAnimationActive={false} />
                                    <Area type="monotone" dataKey="wind" name="VENT MOYEN" stroke="#38bdf8" fill="none" strokeWidth={5} dot={false} isAnimationActive={false} />
                                </AreaChart>
                            ) : (
                                <AreaChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="time" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={25} />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} domain={['auto', 'auto']} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
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

// --- IA Tab Content ---
const IATab: React.FC<{ current: CurrentConditions; history: HistoryPoint[] }> = ({ current, history }) => {
    const [aiAnalysis, setAiAnalysis] = useState<string>("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalysis = async () => {
        setIsAnalyzing(true);
        try {
            const analysis = await analyzeWeatherConditions(current, history);
            setAiAnalysis(analysis);
        } catch (err) {
            setAiAnalysis("Une erreur est survenue lors de l'analyse.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                    <Bot size={200} className="text-indigo-500" />
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12 relative z-10">
                    <div className="p-6 bg-indigo-600/20 rounded-[2.5rem] text-indigo-400 border border-indigo-500/20 shadow-inner">
                        <Bot size={48} />
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Assistant Météo IA</h2>
                        <p className="text-slate-400 font-bold mt-2 uppercase text-[10px] tracking-[0.3em]">Propulsé par Google Gemini Pro</p>
                    </div>
                    <button 
                        onClick={handleAnalysis} 
                        disabled={isAnalyzing} 
                        className="group relative px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-xs tracking-widest uppercase overflow-hidden transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_20px_40px_-15px_rgba(79,70,229,0.5)]"
                    >
                        <div className="flex items-center gap-3 relative z-10">
                            {isAnalyzing ? <RefreshCcw className="animate-spin" size={18} /> : <Sparkles size={18} />}
                            {isAnalyzing ? 'ANALYSE EN COURS...' : 'LANCER L\'ANALYSE'}
                        </div>
                    </button>
                </div>

                {!aiAnalysis && !isAnalyzing && (
                    <div className="bg-slate-900/40 border border-slate-800 p-12 rounded-[2.5rem] text-center">
                        <HelpCircle className="mx-auto text-slate-700 mb-6" size={48} />
                        <p className="text-slate-500 font-black uppercase tracking-widest text-sm max-w-sm mx-auto">
                            Cliquez sur le bouton ci-dessus pour générer un rapport météorologique intelligent basé sur les données actuelles et l'historique récent.
                        </p>
                    </div>
                )}

                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-20 gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="text-indigo-400 animate-pulse" size={24} />
                            </div>
                        </div>
                        <span className="text-indigo-400 font-black tracking-[0.5em] text-[10px] animate-pulse">TRAITEMENT DES DONNÉES...</span>
                    </div>
                )}

                {aiAnalysis && !isAnalyzing && (
                    <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-slate-800 shadow-inner animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="prose prose-invert max-w-none">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                        </div>
                        <div className="mt-10 pt-6 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Généré le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <button onClick={() => setAiAnalysis("")} className="text-[9px] font-black text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Effacer le rapport</button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-800">
                    <div className="p-3 bg-sky-600/10 text-sky-400 w-fit rounded-xl mb-4"><LineChartIcon size={20} /></div>
                    <h4 className="text-white font-black text-xs uppercase mb-2">Historique 24h</h4>
                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed">L'IA analyse les variations de pression et de température sur les dernières 24 heures pour identifier les fronts météorologiques.</p>
                </div>
                <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-800">
                    <div className="p-3 bg-emerald-600/10 text-emerald-400 w-fit rounded-xl mb-4"><Zap size={20} /></div>
                    <h4 className="text-white font-black text-xs uppercase mb-2">Temps Réel</h4>
                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed">Prise en compte instantanée des conditions actuelles : humidité, vent, et taux de précipitations.</p>
                </div>
                <div className="glass-panel p-8 rounded-[2.5rem] border border-slate-800">
                    <div className="p-3 bg-orange-600/10 text-orange-400 w-fit rounded-xl mb-4"><AlertTriangle size={20} /></div>
                    <h4 className="text-white font-black text-xs uppercase mb-2">Conseils Pratiques</h4>
                    <p className="text-slate-500 text-[10px] font-bold leading-relaxed">L'assistant vous suggère les meilleures fenêtres pour vos activités de jardinage ou de plein air.</p>
                </div>
            </div>
        </div>
    );
};

// --- Extreme Temperatures Tab ---
const ExtremeTemperaturesTab: React.FC<{ dailyHistory: DailyHistoryPoint[] }> = ({ dailyHistory }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [showFrostModal, setShowFrostModal] = useState(false);
    const [showHeatModal, setShowHeatModal] = useState(false);
    
    const availableYears = useMemo(() => {
        const detectedYears = dailyHistory.map(d => new Date(d.date).getFullYear());
        const yearSet = new Set([...detectedYears, 2025, 2026]);
        return Array.from(yearSet).filter(y => y >= 2025).sort((a, b) => b - a);
    }, [dailyHistory]);

    const stats = useMemo(() => {
        const yearData = dailyHistory.filter(d => new Date(d.date).getFullYear() === selectedYear);
        if (!yearData.length) return null;

        const maxRecord = [...yearData].sort((a, b) => b.tempHigh - a.tempHigh)[0];
        const minRecord = [...yearData].sort((a, b) => a.tempLow - b.tempLow)[0];
        const frostDaysList = yearData.filter(d => d.tempLow <= 0).sort((a, b) => a.epoch - b.epoch);
        const heatDaysList = yearData.filter(d => d.tempHigh >= 30).sort((a, b) => a.epoch - b.epoch);

        const chartData = yearData.map(d => ({
            ...d,
            range: [d.tempLow, d.tempHigh],
            time: new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
        }));

        return { maxRecord, minRecord, frostDaysList, heatDaysList, chartData };
    }, [dailyHistory, selectedYear]);

    if (!stats) return <div className="text-center p-20 text-slate-500 font-black">AUCUNE DONNÉE DISPONIBLE POUR CETTE ANNÉE</div>;

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                        <Thermometer className="text-orange-500" size={24} /> Records de Températures
                    </h2>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">EXTRÊMES ET ENVELOPPE THERMIQUE</span>
                </div>
                <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center">
                    {availableYears.map(year => (
                        <button key={year} onClick={() => setSelectedYear(year)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${selectedYear === year ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{year}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 rounded-[2rem] border border-orange-500/30 flex flex-col items-center text-center">
                    <Flame className="text-orange-500 mb-4" size={32} />
                    <span className="text-4xl font-black text-white tabular-nums leading-none">{stats.maxRecord.tempHigh.toFixed(1)}°</span>
                    <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-2">MAX ABSOLU</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{new Date(stats.maxRecord.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                </div>
                <div className="glass-panel p-6 rounded-[2rem] border border-sky-500/30 flex flex-col items-center text-center">
                    <Snowflake className="text-sky-400 mb-4" size={32} />
                    <span className="text-4xl font-black text-white tabular-nums leading-none">{stats.minRecord.tempLow.toFixed(1)}°</span>
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest mt-2">MIN ABSOLU</span>
                    <span className="text-[9px] font-bold text-slate-500 mt-1 uppercase">{new Date(stats.minRecord.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                </div>
                <button 
                    onClick={() => setShowFrostModal(true)}
                    className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex flex-col items-center text-center hover:bg-slate-800/40 transition-all group"
                >
                    <div className="bg-sky-500/10 p-3 rounded-full mb-3 text-sky-500 group-hover:scale-110 transition-transform"><Snowflake size={20} /></div>
                    <span className="text-3xl font-black text-white tabular-nums leading-none">{stats.frostDaysList.length}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">JOURS DE GEL (≤0°)</span>
                </button>
                <button 
                    onClick={() => setShowHeatModal(true)}
                    className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex flex-col items-center text-center hover:bg-slate-800/40 transition-all group"
                >
                    <div className="bg-orange-500/10 p-3 rounded-full mb-3 text-orange-500 group-hover:scale-110 transition-transform"><Flame size={20} /></div>
                    <span className="text-3xl font-black text-white tabular-nums leading-none">{stats.heatDaysList.length}</span>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2">FORTE CHALEUR (≥30°)</span>
                </button>
            </div>

            <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 h-[500px]">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-8 flex items-center gap-3">Enveloppe Thermique Quotidienne</h3>
                <ResponsiveContainer width="100%" height="85%">
                    <AreaChart data={stats.chartData}>
                        <defs>
                            <linearGradient id="colorTempRange" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} axisLine={false} tickLine={false} minTickGap={50} />
                        <YAxis stroke="#475569" fontSize={10} axisLine={false} tickLine={false} tickFormatter={v=>`${v}°`} />
                        <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                        <Area type="monotone" dataKey="tempHigh" name="MAXIMALE" stroke="#f97316" fill="url(#colorTempRange)" strokeWidth={3} isAnimationActive={false} />
                        <Area type="monotone" dataKey="tempLow" name="MINIMALE" stroke="#0ea5e9" fill="transparent" strokeWidth={3} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Frost Days Modal */}
            {showFrostModal && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setShowFrostModal(false)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] overflow-hidden max-h-[80vh] flex flex-col shadow-2xl ring-1 ring-white/10">
                        <div className="p-8 border-b border-slate-800 bg-sky-600/5 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white uppercase flex items-center gap-4">
                                <Snowflake className="text-sky-400" /> Jours de Gel : {selectedYear}
                            </h3>
                            <button onClick={() => setShowFrostModal(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {stats.frostDaysList.length === 0 ? (
                                <p className="text-center text-slate-500 py-10 font-bold italic">Aucun jour de gel enregistré pour cette année.</p>
                            ) : (
                                stats.frostDaysList.map((day, idx) => (
                                    <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-sky-500/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Température Mini</span>
                                        </div>
                                        <span className="text-xl font-black text-sky-400">{day.tempLow.toFixed(1)}°</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Heat Days Modal */}
            {showHeatModal && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setShowHeatModal(false)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] overflow-hidden max-h-[80vh] flex flex-col shadow-2xl ring-1 ring-white/10">
                        <div className="p-8 border-b border-slate-800 bg-orange-600/5 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white uppercase flex items-center gap-4">
                                <Flame className="text-orange-500" /> Forte Chaleur : {selectedYear}
                            </h3>
                            <button onClick={() => setShowHeatModal(false)} className="text-slate-500 hover:text-white transition-colors p-2"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {stats.heatDaysList.length === 0 ? (
                                <p className="text-center text-slate-500 py-10 font-bold italic">Aucun jour de forte chaleur enregistré pour cette année.</p>
                            ) : (
                                stats.heatDaysList.map((day, idx) => (
                                    <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center group hover:border-orange-500/30 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                            <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Température Maxi</span>
                                        </div>
                                        <span className="text-xl font-black text-orange-500">{day.tempHigh.toFixed(1)}°</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
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
            data[mIdx].total += (d.precipTotal || 0);
            if (d.precipTotal > 0.2) {
                data[mIdx].rainDays += 1;
            }
        });

        return data;
    }, [dailyHistory, selectedYear]);

    const stats = useMemo(() => {
        const total = monthlyData.reduce((acc, m) => acc + m.total, 0);
        const wettestMonth = [...monthlyData].sort((a, b) => b.total - a.total)[0] || { monthLabel: '-', total: 0 };
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
                            <BarChartIcon className="text-sky-500" size={24} /> Histogramme Mensuel
                        </h3>
                        <div className="flex-1 w-full bg-slate-950/40 rounded-[2.5rem] border border-slate-800/50 p-10 overflow-hidden">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="monthLabel" stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickMargin={20} className="font-black tracking-widest" />
                                    <YAxis stroke="#475569" fontSize={11} axisLine={false} tickLine={false} tickFormatter={v=>`${v}mm`} className="font-black" />
                                    <Tooltip content={<CustomModalTooltip isLongTerm={true} />} cursor={{fill: 'rgba(255,255,255,0.03)'}} />
                                    <Bar dataKey="total" name="PRÉCIPITATIONS (MM)" fill="#0ea5e9" radius={[10, 10, 0, 0]} isAnimationActive={false}>
                                        <LabelList 
                                            dataKey="total" 
                                            position="top" 
                                            offset={10} 
                                            fill="#ffffff" 
                                            fontSize={10} 
                                            formatter={(val: number) => val > 0 ? `${val.toFixed(1)}` : ''} 
                                            className="font-black"
                                        />
                                    </Bar>
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
        
        let maturityDate = "";
        if (selectedCrop) {
            const matPoint = djcData.find(d => d.cumulatedGain >= selectedCrop.min);
            if (matPoint) {
                maturityDate = new Date(matPoint.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
            }
        }

        return { total, avg: total / djcData.length, activeDays, maturityDate };
    }, [djcData, selectedCrop]);

    const explanation = useMemo(() => {
        switch(activeStatInfo) {
            case 'cumul': return {
                title: "Cumul DJC",
                desc: "Représente la somme totale des degrés-jours accumulés sur la période sélectionnée.",
                detail: "C'est l'indicateur principal du potentiel thermique disponible. Chaque espèce végétale nécessite un cumul spécifique pour atteindre ses stades clés.",
                icon: <TrendingUp size={48} className="text-emerald-400" />
            };
            case 'moyenne': return {
                title: "Gain Moyen / Jour",
                desc: "Intensité thermique moyenne enregistrée quotidiennement au-dessus du seuil biologique.",
                detail: "Mesure la 'poussée' thermique journalière moyenne.",
                icon: <Activity size={48} className="text-emerald-500" />
            };
            case 'jours': return {
                title: "Jours Actifs",
                desc: "Nombre total de jours durant lesquels la température moyenne a dépassé le seuil de base.",
                detail: "Permet de quantifier la régularité de la saison de croissance.",
                icon: <Calendar size={48} className="text-emerald-500" />
            };
            default: return null;
        }
    }, [activeStatInfo]);

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                            <Sprout className="text-emerald-500" size={24} /> DJC
                        </h2>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">SUIVI THERMIQUE DES CULTURES</span>
                    </div>
                    <button onClick={() => setShowInfoPopup(true)} className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl hover:bg-emerald-600/30 transition-all border border-emerald-500/20 flex items-center gap-2 group">
                        <HelpCircle size={18} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase tracking-widest hidden sm:inline">Plus d'infos</span>
                    </button>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="flex flex-col items-center gap-1.5 min-w-[200px]">
                        <div className="relative w-full">
                            <select value={selectedCropName} onChange={(e) => setSelectedCropName(e.target.value)} className="w-full bg-slate-950/80 p-2 text-[10px] font-black rounded-xl border border-slate-800 text-slate-300 appearance-none outline-none focus:border-emerald-500/50 transition-all cursor-pointer px-4 pr-10">
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
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600"><Search size={14} /></div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-1.5">
                        <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center shadow-inner">
                            {[0, 4, 5, 6, 7, 8, 10].map(val => (
                                <button key={val} onClick={() => {setBaseThreshold(val); setSelectedCropName("");}} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all tracking-widest ${baseThreshold === val ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{val}°</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-3">
                    <div className="flex flex-col gap-4 h-full">
                        {selectedCrop && (
                            <div className="glass-panel p-6 rounded-[2rem] border border-emerald-500/30 bg-emerald-600/5">
                                <span className="text-xs font-black text-white uppercase block mb-4">{selectedCrop.name}</span>
                                <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 mb-2">
                                    <div className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${Math.min(100, (stats.total / selectedCrop.min * 100))}%` }}></div>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400">{Math.min(100, (stats.total / selectedCrop.min * 100)).toFixed(0)}% de maturité</span>
                            </div>
                        )}
                        <button onClick={() => setActiveStatInfo('cumul')} className="glass-panel p-6 rounded-[2rem] border border-slate-800 flex-1 flex flex-col items-center justify-center text-center">
                            <span className="text-4xl font-black text-white leading-none mb-2">{stats.total.toFixed(0)}</span>
                            <span className="text-[9px] font-black text-slate-500 uppercase">CUMUL DJC</span>
                        </button>
                    </div>
                </div>
                <div className="lg:col-span-9">
                    <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 h-full">
                        <ResponsiveContainer width="100%" height={400}>
                            <ComposedChart data={djcData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                                <YAxis yAxisId="left" stroke="#475569" fontSize={11} />
                                <YAxis yAxisId="right" orientation="right" stroke="#475569" fontSize={11} />
                                <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                <Bar yAxisId="left" dataKey="dailyGain" fill="#10b981" fillOpacity={0.3} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                <Line yAxisId="right" type="monotone" dataKey="cumulatedGain" stroke="#34d399" strokeWidth={5} dot={false} isAnimationActive={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {activeStatInfo && explanation && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" onClick={() => setActiveStatInfo(null)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] p-10">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-3xl font-black text-white uppercase">{explanation.title}</h2>
                            <button onClick={() => setActiveStatInfo(null)} className="text-slate-500"><X size={24} /></button>
                        </div>
                        <p className="text-xl text-slate-300 mb-4">{explanation.desc}</p>
                        <p className="text-sm text-slate-500 italic">{explanation.detail}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Thermal Amplitude Analyzer Tab Content ---
const ThermalAmplitudeTab: React.FC<{ dailyHistory: DailyHistoryPoint[] }> = ({ dailyHistory }) => {
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
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

    const stats = useMemo(() => {
        const events = filteredData.map(d => ({ ...d, isCritical: d.amplitude > 15 }));
        const critical = events.filter(e => e.isCritical);
        return {
            totalCritical: critical.length,
            maxAmp: events.length ? Math.max(...events.map(e => e.amplitude)) : 0,
            criticalEvents: critical.reverse()
        };
    }, [filteredData]);

    return (
        <div className="max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 shadow-2xl">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Amplitude Thermique</h2>
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">ANALYSE DU STRESS AGRICOLE</span>
                </div>
                <div className="bg-slate-950/80 p-1 rounded-xl border border-slate-800 flex items-center">
                    {availableYears.map(year => (
                        <button key={year} onClick={() => setSelectedYear(year)} className={`px-4 py-1.5 text-[9px] font-black rounded-lg transition-all ${selectedYear === year ? 'bg-orange-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>{year}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-3 flex flex-col gap-4">
                    <button onClick={() => setShowCriticalModal(true)} className="glass-panel p-6 rounded-[2rem] border border-slate-800 text-center hover:bg-slate-800/50 transition-all">
                        <span className="text-4xl font-black text-white block mb-2">{stats.totalCritical}</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase">JOURS CRITIQUES (&gt;15°C)</span>
                    </button>
                    <div className="glass-panel p-6 rounded-[2rem] border border-slate-800 text-center">
                        <span className="text-4xl font-black text-white block mb-2">{stats.maxAmp.toFixed(1)}°</span>
                        <span className="text-[9px] font-black text-slate-500 uppercase">AMPLITUDE MAX</span>
                    </div>
                </div>
                <div className="lg:col-span-9">
                    <div className="glass-panel p-10 rounded-[3.5rem] border border-slate-800 h-full">
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart data={filteredData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="time" stroke="#475569" fontSize={11} />
                                <YAxis stroke="#475569" fontSize={11} />
                                <Tooltip content={<CustomModalTooltip isLongTerm={true} />} />
                                <Area type="monotone" dataKey="amplitude" stroke="#f97316" strokeWidth={6} fill="#f97316" fillOpacity={0.1} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey={() => 15} stroke="#ef4444" strokeDasharray="15 15" dot={false} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {showCriticalModal && (
                <div className="fixed inset-0 z-[210] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-3xl" onClick={() => setShowCriticalModal(false)}></div>
                    <div className="relative glass-panel w-full max-w-2xl rounded-[3rem] overflow-hidden max-h-[80vh] flex flex-col">
                        <div className="p-8 border-b border-slate-800 bg-orange-600/5 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-white uppercase">Stress Thermique : {selectedYear}</h3>
                            <button onClick={() => setShowCriticalModal(false)} className="text-slate-500"><X size={24} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {stats.criticalEvents.map((day, idx) => (
                                <div key={idx} className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                                    <span className="text-sm font-bold text-white">{new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                    <span className="text-xl font-black text-orange-500">+{day.amplitude.toFixed(1)}°</span>
                                </div>
                            ))}
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

  const NavButton = ({ tab, icon: Icon, label, activeColor }: { tab: Tab, icon: any, label: string, activeColor: string }) => (
    <button 
        onClick={() => setActiveTab(tab)} 
        className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl text-[10px] font-black transition-all tracking-widest shrink-0 uppercase border border-transparent whitespace-nowrap ${
            activeTab === tab 
            ? `${activeColor} text-white shadow-2xl border-white/10 ring-1 ring-inset ring-white/10` 
            : 'bg-slate-950/40 text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
        }`}
    >
        <Icon size={16} strokeWidth={3} className={activeTab === tab ? 'animate-pulse' : ''}/> 
        {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 font-sans overflow-x-hidden selection:bg-indigo-500/30">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-10 w-full flex justify-center">
            <div className="flex gap-2.5 bg-slate-900/40 p-2.5 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-x-auto no-scrollbar scroll-smooth">
                <NavButton tab={Tab.DASHBOARD} icon={LayoutDashboard} label="Dashboard" activeColor="bg-sky-600" />
                <NavButton tab={Tab.ANALYSIS} icon={Activity} label="Amplitude Thermique" activeColor="bg-orange-600" />
                <NavButton tab={Tab.EXTREMES} icon={Thermometer} label="Records" activeColor="bg-red-600" />
                <NavButton tab={Tab.DJC} icon={Sprout} label="DJC" activeColor="bg-emerald-600" />
                <NavButton tab={Tab.PRECIPITATION} icon={CloudRain} label="Précipitations" activeColor="bg-sky-500" />
                <NavButton tab={Tab.IA} icon={Bot} label="IA" activeColor="bg-indigo-600" />
            </div>
        </div>

        {activeTab === Tab.DASHBOARD && (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
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
             <div className="lg:col-span-9 flex flex-col gap-8">
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
                        <div className="text-center"><span className="text-[10px] font-black text-slate-500 uppercase block mb-2">1. AUBE</span><span className="text-base font-bold text-slate-300">{fmtTime(sunTimes.dawn)}</span></div>
                        <ArrowRight size={16} className="text-slate-700" />
                        <div className="text-center"><span className="text-[10px] font-black text-orange-400 uppercase block mb-2 flex items-center gap-2 justify-center"><Sunrise size={12}/> 2. LEVER</span><span className="text-2xl font-black text-white">{fmtTime(sunTimes.sunrise)}</span></div>
                        <div className="h-10 w-px bg-slate-800/80 mx-4"></div>
                        <div className="text-center"><span className="text-[10px] font-black text-orange-500 uppercase block mb-2 flex items-center gap-2 justify-center"><Sunset size={12}/> 1. COUCHER</span><span className="text-2xl font-black text-white">{fmtTime(sunTimes.sunset)}</span></div>
                        <ArrowRight size={16} className="text-slate-700" />
                        <div className="text-center"><span className="text-[10px] font-black text-slate-500 uppercase block mb-2">2. CRÉPUSCULE</span><span className="text-base font-bold text-slate-300">{fmtTime(sunTimes.dusk)}</span></div>
                    </div>
                </div>
                <Charts data={chartHistory} />
             </div>
           </div>
        )}

        {activeTab === Tab.ANALYSIS && ( <ThermalAmplitudeTab dailyHistory={data.dailyHistory} /> )}
        {activeTab === Tab.EXTREMES && ( <ExtremeTemperaturesTab dailyHistory={data.dailyHistory} /> )}
        {activeTab === Tab.DJC && ( <GrowthDegreeDaysTab dailyHistory={data.dailyHistory} /> )}
        {activeTab === Tab.PRECIPITATION && ( <PrecipitationHistoryTab dailyHistory={data.dailyHistory} /> )}
        {activeTab === Tab.IA && ( <IATab current={data.current} history={data.history} /> )}
      </main>

      {activeModal && (
        <WeatherModal type={activeModal} data={data} onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);