
import React, { useMemo, useState, useEffect } from 'react';
import { Sunrise, Sunset, Sun, Moon, Sparkles } from 'lucide-react';

const LAT = 48.7120;
const LON = 2.2446;

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
            d.setHours(Math.floor(h));
            d.setMinutes(Math.floor((h % 1) * 60));
            d.setSeconds(0);
            return d;
         };

         times.sunrise = getLocal(-haSunrise / 15).getTime();
         times.sunset = getLocal(haSunrise / 15).getTime();
         times.dawn = getLocal(-haDawn / 15).getTime();
         times.dusk = getLocal(haDawn / 15).getTime();
    }
    return times;
};

const getMoonData = (date: Date) => {
    const lp = 2551443; 
    const now = date.getTime();
    const newMoonRef = new Date(2024, 0, 11, 11, 57).getTime();
    const phase = ((now - newMoonRef) / 1000) % lp;
    const age = phase / (24 * 3600);
    const percent = phase / lp;

    let name = "";
    if (percent < 0.03) name = "Nouvelle Lune";
    else if (percent < 0.22) name = "Premier Croissant";
    else if (percent < 0.28) name = "Premier Quartier";
    else if (percent < 0.47) name = "Gibbeuse Croissante";
    else if (percent < 0.53) name = "Pleine Lune";
    else if (percent < 0.72) name = "Gibbeuse Décroissante";
    else if (percent < 0.78) name = "Dernier Quartier";
    else if (percent < 0.97) name = "Dernier Croissant";
    else name = "Nouvelle Lune";

    return { percent, name, age };
};

const getBezierPoint = (t: number, isTop: boolean) => {
    const x = (1-t)*(1-t)*0 + 2*(1-t)*t*50 + t*t*100;
    const y = isTop 
        ? (1-t)*(1-t)*50 + 2*(1-t)*t*(-25) + t*t*50 
        : (1-t)*(1-t)*50 + 2*(1-t)*t*(125) + t*t*50;
    return { x, y };
};

export const SunCycle: React.FC = () => {
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const times = useMemo(() => getSunTimes(now), [now]);
    const moon = useMemo(() => getMoonData(now), [now]);
    const isNight = now.getTime() > times.dusk || now.getTime() < times.dawn;

    let currentT = 0;
    let isSunOnTop = true;

    if (now.getTime() >= times.dawn && now.getTime() <= times.dusk) {
        currentT = (now.getTime() - times.dawn) / (times.dusk - times.dawn);
        isSunOnTop = true;
    } else {
        isSunOnTop = false;
        const duskTime = times.dusk;
        const dawnTimeNext = times.dawn + (24 * 3600000);
        const currentTimeAdjusted = now.getTime() < times.dawn ? now.getTime() + (24 * 3600000) : now.getTime();
        currentT = (currentTimeAdjusted - duskTime) / (dawnTimeNext - duskTime);
    }

    const celPos = getBezierPoint(Math.max(0, Math.min(1, currentT)), isSunOnTop);
    const fmt = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="glass-panel p-6 rounded-3xl h-full flex flex-col justify-between relative overflow-hidden bg-slate-900/40">
            <div className="flex justify-between items-start z-20 mb-2">
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl border transition-all duration-1000 ${isNight ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
                        {isNight ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-orange-400 animate-pulse" />}
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm uppercase">Cycle Céleste</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${isNight ? 'bg-indigo-500 animate-pulse' : 'bg-orange-500'}`}></span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{isNight ? 'Phase Nocturne' : 'Phase Diurne'}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-3xl font-black text-white tracking-tighter tabular-nums leading-none">{now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'})}</div>
                    <div className={`mt-2 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isNight ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30' : 'bg-orange-600/20 text-orange-300 border border-orange-500/30'}`}>
                        {isNight ? 'Nuit' : 'Jour'}
                    </div>
                </div>
            </div>

            <div className="flex-1 relative w-full flex items-center justify-center">
                <div className="w-full h-full relative">
                    <svg viewBox="0 -30 100 160" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fb923c" stopOpacity="0.15" /><stop offset="100%" stopColor="#fb923c" stopOpacity="0" /></linearGradient>
                            <linearGradient id="skyNight" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" /><stop offset="100%" stopColor="#6366f1" stopOpacity="0" /></linearGradient>
                            <filter id="glowAstre"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        </defs>
                        <line x1="-10" y1="50" x2="110" y2="50" stroke="#1e293b" strokeWidth="2" />
                        <line x1="-10" y1="50" x2="110" y2="50" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
                        <path d="M 0,50 Q 50,-25 100,50" fill="url(#skyDay)" opacity={isSunOnTop ? 1 : 0.3} />
                        <path d="M 0,50 Q 50,125 100,50" fill="url(#skyNight)" opacity={!isSunOnTop ? 1 : 0.3} />
                        <g filter="url(#glowAstre)" style={{ transition: 'all 0.5s ease-out' }}>
                            <circle cx={celPos.x} cy={celPos.y} r="8" fill={isSunOnTop ? "#fb923c" : "#818cf8"} fillOpacity="0.2" />
                            <circle cx={celPos.x} cy={celPos.y} r="3" fill="white" />
                        </g>
                    </svg>
                    <div className="absolute top-[40%] left-0 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl flex flex-col items-center gap-1">
                            <Sunrise size={16} className="text-orange-400" />
                            <span className="text-[10px] font-black text-white">{fmt(times.sunrise)}</span>
                        </div>
                    </div>
                    <div className="absolute top-[40%] right-0 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-slate-900/90 border border-slate-700 p-2 rounded-xl flex flex-col items-center gap-1">
                            <Sunset size={16} className="text-orange-500" />
                            <span className="text-[10px] font-black text-white">{fmt(times.sunset)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 z-20 mt-2">
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50 flex flex-col justify-between h-16">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aube / Crépuscule</span>
                    <div className="text-base font-black text-white">{fmt(times.dawn)} | {fmt(times.dusk)}</div>
                </div>
                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800/50 flex flex-col justify-between h-16">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Lune: {moon.name}</span>
                    <div className="flex items-baseline gap-2"><span className="text-base font-black text-white">{moon.age.toFixed(1)}</span><span className="text-[10px] font-bold text-slate-500 uppercase">Jours</span></div>
                </div>
            </div>
        </div>
    );
};
