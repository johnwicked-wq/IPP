
import React, { useState, useEffect, useMemo } from 'react';
import { getWeatherData } from './services/weatherService';
import { analyzeWeatherConditions } from './services/geminiService';
import { CurrentConditions, HistoryPoint, Tab, HistoryPeriod } from './types';
import { MainStats } from './components/MainStats';
import { WindCompass } from './components/WindCompass';
import { Gauge } from './components/Gauge';
import { Charts } from './components/Charts';
import { 
  LayoutDashboard, 
  LineChart, 
  Bot, 
  RefreshCcw, 
  MapPin, 
  Wifi, 
  Battery,
  WifiOff,
  X,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  CloudRain,
  Droplets,
  Gauge as GaugeIcon
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, Line, ComposedChart } from 'recharts';

const ReactMarkdown = ({ children }: { children?: React.ReactNode }) => {
    const text = typeof children === 'string' ? children : String(children || '');
    const content = text
        .replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-purple-300 mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-6 mb-3">$1</h2>')
        .replace(/\*\*(.*)\*\*/gim, '<strong class="text-sky-300">$1</strong>')
        .replace(/\n/gim, '<br />');

    return <div dangerouslySetInnerHTML={{ __html: content }} />;
};

const renderCustomLegend = (props: any) => {
  const { payload } = props;
  return (
    <ul className="flex justify-center gap-6 text-[11px] font-bold uppercase tracking-widest mt-4">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

const PeriodSelector: React.FC<{ 
    selected: HistoryPeriod; 
    onChange: (p: HistoryPeriod) => void 
}> = ({ selected, onChange }) => {
    const periods: HistoryPeriod[] = ['6h', '24h', '48h', '7j'];
    return (
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 w-fit">
            {periods.map(p => (
                <button
                    key={p}
                    onClick={() => onChange(p)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selected === p 
                        ? 'bg-sky-600 text-white shadow-lg' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                >
                    {p.toUpperCase()}
                </button>
            ))}
        </div>
    );
};

type ModalType = 'temp' | 'precip' | 'humidity' | 'pressure' | null;

const App: React.FC = () => {
  const [data, setData] = useState<{ current: CurrentConditions; history: HistoryPoint[] } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<HistoryPeriod>('24h');

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const weatherData = await getWeatherData();
      setData(weatherData);
    } catch (err: any) {
      console.error(err);
      setError("Erreur de récupération des données.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (!data) return;
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeWeatherConditions(data.current, data.history);
      setAiAnalysis(analysis);
    } catch (err) {
      console.error("Analysis Error:", err);
      setAiAnalysis("Une erreur est survenue lors de l'analyse des données.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 300000);
    return () => clearInterval(interval);
  }, []);

  const filteredHistory = useMemo(() => {
    if (!data?.history) return [];
    const now = Math.floor(Date.now() / 1000);
    let seconds = 24 * 3600;
    
    if (selectedPeriod === '6h') seconds = 6 * 3600;
    else if (selectedPeriod === '48h') seconds = 48 * 3600;
    else if (selectedPeriod === '7j') seconds = 7 * 24 * 3600;

    return data.history.filter(h => h.epoch > (now - seconds));
  }, [data?.history, selectedPeriod]);

  // Calculate generic stats for any key
  const getStatsFor = (key: keyof HistoryPoint) => {
    const values = filteredHistory
      .map(h => h[key] as number)
      .filter(t => typeof t === 'number' && !isNaN(t));
      
    if (values.length === 0) return { min: "--", max: "--", avg: "--", total: "--" };
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = (sum / values.length).toFixed(1);
    
    return { min, max, avg, total: sum.toFixed(1) };
  };

  if (isLoading && !data && !error) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4">
            <RefreshCcw className="animate-spin text-sky-500" size={48} />
            <p className="text-slate-400">Connexion à la station IPLLAU91...</p>
        </div>
    );
  }

  if (error && !data) {
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white gap-4 p-4 text-center">
            <WifiOff className="text-red-500" size={64} />
            <h1 className="text-2xl font-bold">Erreur de Connexion</h1>
            <p className="text-slate-400">{error}</p>
            <button onClick={refreshData} className="mt-4 px-6 py-2 bg-sky-600 rounded-full">Réessayer</button>
        </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12 font-sans selection:bg-sky-500/30">
      
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="bg-sky-600 p-2 rounded-lg"><Wifi className="text-white w-6 h-6" /></div>
             <div>
                <h1 className="text-xl font-bold text-white">Station IPLLAU91</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <MapPin size={12} /><span>Palaiseau, France</span>
                    <span className="text-green-400 font-mono underline decoration-dotted">LIVE</span>
                </div>
             </div>
          </div>
          <button onClick={refreshData} disabled={isLoading} className={`p-2 hover:bg-slate-800 rounded-full ${isLoading ? 'animate-spin' : ''}`}>
             <RefreshCcw size={20} className="text-slate-400" />
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
           <button onClick={() => setActiveTab(Tab.DASHBOARD)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === Tab.DASHBOARD ? 'bg-sky-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
              <LayoutDashboard size={18} /> Dashboard
           </button>
           <button onClick={() => setActiveTab(Tab.CHARTS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === Tab.CHARTS ? 'bg-sky-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
              <LineChart size={18} /> Graphiques
           </button>
           <button onClick={() => setActiveTab(Tab.ANALYSIS)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === Tab.ANALYSIS ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}>
              <Bot size={18} /> IA Analyse
           </button>
        </div>

        {activeTab === Tab.DASHBOARD && (
           <>
             <MainStats 
                current={data.current} 
                onTempClick={() => setActiveModal('temp')} 
                onPrecipClick={() => setActiveModal('precip')}
                onHumidityClick={() => setActiveModal('humidity')}
                onPressureClick={() => setActiveModal('pressure')}
             />
             
             <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-4 lg:col-span-3 h-80">
                    <WindCompass direction={data.current.windDir} speed={data.current.windSpeed} gust={data.current.windGust} />
                </div>
                <div className="md:col-span-8 lg:col-span-9 grid grid-cols-2 md:grid-cols-4 gap-4">
                     <Gauge value={data.current.humidity} min={0} max={100} label="Humidité" unit="%" color="#10b981" />
                     <Gauge value={data.current.dewPoint} min={-10} max={40} label="Pt Rosée" unit="°C" color="#38bdf8" />
                     <Gauge value={data.current.uvIndex} min={0} max={12} label="UV Index" unit="" color="#facc15" />
                     <Gauge value={Number(data.current.pressure.toFixed(0))} min={960} max={1060} label="Pression" unit="hPa" color="#c084fc" />
                </div>
             </div>
           </>
        )}

        {activeTab === Tab.CHARTS && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-sky-500" /> Analyses Historiques</h2>
                    <PeriodSelector selected={selectedPeriod} onChange={setSelectedPeriod} />
                </div>
                <Charts data={filteredHistory} />
            </div>
        )}

        {activeTab === Tab.ANALYSIS && (
            <div className="max-w-3xl mx-auto">
                <div className="glass-panel p-8 rounded-2xl border-t-4 border-purple-500">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-purple-500/20 rounded-full"><Bot className="w-8 h-8 text-purple-400" /></div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">Analyse IA Gemini</h2>
                            <p className="text-slate-400">Rapport météorologique intelligent</p>
                        </div>
                    </div>
                    {!aiAnalysis ? (
                        <div className="text-center py-12">
                            <button onClick={handleAnalysis} disabled={isAnalyzing} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-8 rounded-full transition-all flex items-center gap-2 mx-auto disabled:opacity-50">
                                {isAnalyzing ? <><RefreshCcw className="animate-spin" size={20} /> Analyse...</> : "Lancer l'analyse"}
                            </button>
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700">
                            <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                            <button onClick={() => setAiAnalysis("")} className="mt-4 text-sm text-slate-500 hover:text-purple-400">Nouvelle analyse</button>
                        </div>
                    )}
                </div>
            </div>
        )}
      </main>

      {/* Dynamic Detail Modal */}
      {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setActiveModal(null)}></div>
              <div className="relative glass-panel w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                      <div>
                          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                             {activeModal === 'temp' && <><TrendingUp className="text-orange-400" /> Historique Température</>}
                             {activeModal === 'precip' && <><CloudRain className="text-sky-400" /> Historique Précipitations</>}
                             {activeModal === 'humidity' && <><Droplets className="text-emerald-400" /> Historique Humidité</>}
                             {activeModal === 'pressure' && <><GaugeIcon className="text-purple-400" /> Historique Pression</>}
                          </h2>
                          <div className="flex items-center gap-4 mt-2">
                             <PeriodSelector selected={selectedPeriod} onChange={setSelectedPeriod} />
                          </div>
                      </div>
                      <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-white"><X size={24} /></button>
                  </div>

                  <div className="p-6 overflow-y-auto flex-1">
                      {/* Stats Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          {activeModal === 'temp' && (
                            <>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingUp className="text-red-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Max</div><div className="text-2xl font-bold text-white">{getStatsFor('temp').max}°C</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingDown className="text-blue-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Min</div><div className="text-2xl font-bold text-white">{getStatsFor('temp').min}°C</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <Activity className="text-sky-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Moyenne</div><div className="text-2xl font-bold text-white">{getStatsFor('temp').avg}°C</div></div>
                                </div>
                            </>
                          )}
                          {activeModal === 'precip' && (
                            <>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <CloudRain className="text-sky-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Cumul Période</div><div className="text-2xl font-bold text-white">{getStatsFor('precipRate').total} mm</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingUp className="text-sky-300" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Taux Max</div><div className="text-2xl font-bold text-white">{getStatsFor('precipRate').max} mm/h</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <Activity className="text-slate-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Moyenne</div><div className="text-2xl font-bold text-white">{getStatsFor('precipRate').avg} mm/h</div></div>
                                </div>
                            </>
                          )}
                          {activeModal === 'humidity' && (
                            <>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingUp className="text-emerald-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Max</div><div className="text-2xl font-bold text-white">{getStatsFor('humidity').max}%</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingDown className="text-emerald-600" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Min</div><div className="text-2xl font-bold text-white">{getStatsFor('humidity').min}%</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <Activity className="text-sky-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Moyenne</div><div className="text-2xl font-bold text-white">{getStatsFor('humidity').avg}%</div></div>
                                </div>
                            </>
                          )}
                          {activeModal === 'pressure' && (
                            <>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingUp className="text-purple-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Max</div><div className="text-2xl font-bold text-white">{getStatsFor('pressure').max}</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <TrendingDown className="text-purple-600" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Min</div><div className="text-2xl font-bold text-white">{getStatsFor('pressure').min}</div></div>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 flex items-center gap-4">
                                    <Activity className="text-sky-400" />
                                    <div><div className="text-xs text-slate-500 uppercase font-bold">Moyenne</div><div className="text-2xl font-bold text-white">{getStatsFor('pressure').avg}</div></div>
                                </div>
                            </>
                          )}
                      </div>

                      {/* Detail Chart */}
                      <div className="h-[400px] w-full bg-slate-900/30 rounded-2xl p-4 border border-slate-800">
                          <ResponsiveContainer width="100%" height="100%">
                              {activeModal === 'temp' && (
                                <AreaChart data={filteredHistory} margin={{ bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="modalTemp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#fb923c" stopOpacity={0.4}/><stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={10} minTickGap={50} />
                                    <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
                                    <Area type="monotone" dataKey="temp" name="Température (°C)" stroke="#fb923c" fill="url(#modalTemp)" strokeWidth={3} isAnimationActive={false} connectNulls={true} />
                                    <Area type="monotone" dataKey="dewPoint" name="Pt Rosée (°C)" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="5 5" isAnimationActive={false} connectNulls={true} />
                                </AreaChart>
                              )}
                              {activeModal === 'precip' && (
                                <ComposedChart data={filteredHistory} margin={{ bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={10} minTickGap={50} />
                                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
                                    <Bar dataKey="precipRate" name="Taux (mm/h)" fill="#0ea5e9" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="precipAccum" name="Cumul Journalier (mm)" stroke="#f43f5e" strokeWidth={3} dot={false} isAnimationActive={false} />
                                </ComposedChart>
                              )}
                              {activeModal === 'humidity' && (
                                <AreaChart data={filteredHistory} margin={{ bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="modalHumidity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={10} minTickGap={50} />
                                    <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
                                    <Area type="monotone" dataKey="humidity" name="Humidité (%)" stroke="#10b981" fill="url(#modalHumidity)" strokeWidth={3} isAnimationActive={false} connectNulls={true} />
                                </AreaChart>
                              )}
                              {activeModal === 'pressure' && (
                                <AreaChart data={filteredHistory} margin={{ bottom: 20 }}>
                                    <defs>
                                        <linearGradient id="modalPressure" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4}/><stop offset="95%" stopColor="#c084fc" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickMargin={10} minTickGap={50} />
                                    <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                                    <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
                                    <Area type="monotone" dataKey="pressure" name="Pression (hPa)" stroke="#c084fc" fill="url(#modalPressure)" strokeWidth={3} isAnimationActive={false} connectNulls={true} />
                                </AreaChart>
                              )}
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
