
import React from 'react';
import { Droplets, CloudRain, Thermometer, Maximize2, Gauge, Info } from 'lucide-react';
import { CurrentConditions } from '../types';

interface MainStatsProps {
  current: CurrentConditions;
  onTempClick: () => void;
  onPrecipClick: () => void;
  onHumidityClick: () => void;
  onPressureClick: () => void;
  className?: string;
}

export const MainStats: React.FC<MainStatsProps> = ({ 
  current, 
  onTempClick, 
  onPrecipClick, 
  onHumidityClick, 
  onPressureClick,
  className
}) => {
  
  // Helpers for Themes (Borders and Accents only)
  const getTempTheme = (temp: number) => {
    if (temp < 0) return { border: 'hover:border-blue-500/40', accent: 'text-blue-400', icon: 'text-blue-500' };
    if (temp < 15) return { border: 'hover:border-sky-400/40', accent: 'text-sky-300', icon: 'text-sky-400' };
    if (temp < 25) return { border: 'hover:border-emerald-400/40', accent: 'text-emerald-300', icon: 'text-emerald-400' };
    if (temp < 35) return { border: 'hover:border-orange-500/40', accent: 'text-orange-400', icon: 'text-orange-500' };
    return { border: 'hover:border-red-500/40', accent: 'text-red-400', icon: 'text-red-500' };
  };

  const getHumidityTheme = (humidity: number) => {
    if (humidity < 35) return { accent: 'text-orange-400', border: 'hover:border-orange-400/40', icon: 'text-orange-400' };
    if (humidity <= 60) return { accent: 'text-emerald-400', border: 'hover:border-emerald-400/40', icon: 'text-emerald-400' };
    if (humidity <= 80) return { accent: 'text-sky-400', border: 'hover:border-sky-400/40', icon: 'text-sky-400' };
    return { accent: 'text-blue-500', border: 'hover:border-blue-500/40', icon: 'text-blue-500' };
  };

  const getPrecipTheme = (current: CurrentConditions) => {
    if (current.precipRate > 0) return { accent: 'text-sky-400', icon: 'text-sky-500', border: 'hover:border-sky-500/40' };
    if (current.precipTotal > 0) return { accent: 'text-sky-300/80', icon: 'text-sky-400', border: 'hover:border-sky-400/40' };
    return { accent: 'text-slate-400', icon: 'text-slate-500', border: 'hover:border-slate-500/30' };
  };

  const getTempInfo = (current: CurrentConditions) => {
    const { temp, feelsLike, dewPoint } = current;
    const spread = temp - dewPoint;
    if (spread <= 2) return temp < 2 ? "Risque de givre / Verglas" : "Air saturé (Risque de brouillard)";
    if (feelsLike < temp - 2) return "Refroidissement éolien sensible";
    if (feelsLike > temp + 2) return "Chaleur lourde (Humidex)";
    if (spread > 15) return "Air très sec / Excellente visibilité";
    return "Conditions stables";
  };

  const getHumidityInfo = (humidity: number) => {
    if (humidity < 30) return "Air sec (Confort faible)";
    if (humidity <= 60) return "Confort optimal (Idéal)";
    if (humidity <= 85) return "Air humide";
    return "Très humide (Condensation)";
  };

  const getPrecipInfo = (current: CurrentConditions) => {
    if (current.precipRate > 0) return `Pluie en cours (${current.precipRate.toFixed(2)} mm/h)`;
    if (current.precipTotal > 0) return "Actuellement sec";
    return "Temps sec";
  };

  const getPressureInfo = (current: CurrentConditions) => {
    const { pressure, pressureTrend } = current;
    
    if (pressureTrend === 'falling') {
      if (pressure < 1005) return "Dépression : pluie et vent probable";
      return "Baisse : dégradation attendue";
    }
    
    if (pressureTrend === 'rising') {
      if (pressure > 1020) return "Anticyclone : amélioration durable";
      return "Hausse : éclaircies en approche";
    }
    
    // Steady
    if (pressure > 1022) return "Beau temps fixe et sec";
    if (pressure < 1000) return "Temps perturbé persistant";
    if (pressure < 1010) return "Ciel variable, risque d'instabilité";
    return "Conditions barométriques stables";
  };

  const tempTheme = getTempTheme(current.temp);
  const humTheme = getHumidityTheme(current.humidity);
  const precTheme = getPrecipTheme(current);

  return (
    <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"}>
      
      {/* Temperature Card */}
      <div 
        onClick={onTempClick}
        className={`glass-panel p-6 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 transition-all border border-transparent ${tempTheme.border}`}
      >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity ${tempTheme.icon}`}>
            <Thermometer size={64} />
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} className={tempTheme.icon} />
        </div>
        <div className="text-slate-400 text-sm font-medium uppercase mb-1">Température</div>
        
        <div className="flex items-center gap-4">
            <div className="flex items-end gap-1">
                <span className="text-5xl font-bold text-white tracking-tighter">{current.temp.toFixed(1)}°</span>
                <span className="text-slate-400 mb-2 font-medium">C</span>
            </div>
            <div className="flex flex-col text-[10px] leading-tight text-slate-400 font-medium border-l border-slate-700 pl-3 py-1">
                <div className="whitespace-nowrap">Ressenti <strong className="text-slate-200">{current.feelsLike.toFixed(1)}°</strong></div>
                <div className="whitespace-nowrap">Rosée <strong className="text-slate-200">{current.dewPoint.toFixed(1)}°</strong></div>
            </div>
        </div>

        <div className={`mt-3 text-sm font-bold flex items-center gap-1.5 ${tempTheme.accent}`}>
             <Info size={14} />
             {getTempInfo(current)}
        </div>
      </div>

      {/* Precipitation Card */}
      <div 
        onClick={onPrecipClick}
        className={`glass-panel p-6 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 transition-all border border-transparent ${precTheme.border}`}
      >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity ${precTheme.icon}`}>
            <CloudRain size={64} />
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} className={precTheme.icon} />
        </div>
        <div className="text-slate-400 text-sm font-medium uppercase mb-1">Précipitations</div>
        <div className="flex items-end gap-2">
             <span className="text-5xl font-bold text-white tracking-tighter">{current.precipTotal.toFixed(2)}</span>
             <div className="flex flex-col justify-end mb-2">
                <span className="text-slate-400 font-medium leading-none">mm</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-1">Cumul Journée</span>
             </div>
        </div>
        <div className={`mt-3 text-sm font-bold flex items-center gap-1.5 ${precTheme.accent}`}>
             <Info size={14} />
             {getPrecipInfo(current)}
        </div>
      </div>

       {/* Humidity Card */}
       <div 
        onClick={onHumidityClick}
        className={`glass-panel p-6 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 transition-all border border-transparent ${humTheme.border}`}
      >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity ${humTheme.icon}`}>
            <Droplets size={64} />
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} className={humTheme.icon} />
        </div>
        <div className="text-slate-400 text-sm font-medium uppercase mb-1">Humidité</div>
        <div className="flex items-end gap-2">
             <span className="text-5xl font-bold text-white tracking-tighter">{current.humidity}</span>
             <span className="text-slate-400 mb-2 font-medium">%</span>
        </div>
        <div className={`mt-3 text-sm font-bold flex items-center gap-1.5 ${humTheme.accent}`}>
             <Info size={14} />
             {getHumidityInfo(current.humidity)}
        </div>
      </div>

      {/* Pressure Card */}
      <div 
        onClick={onPressureClick}
        className="glass-panel p-6 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 transition-all border border-transparent hover:border-purple-500/30"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity text-purple-400">
            <Gauge size={64} />
        </div>
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Maximize2 size={16} className="text-purple-400" />
        </div>
        <div className="text-slate-400 text-sm font-medium uppercase mb-1">Pression</div>
        <div className="flex items-end gap-2">
             <span className="text-5xl font-bold text-white tracking-tighter">{current.pressure.toFixed(1)}</span>
             <span className="text-slate-400 mb-2 font-medium">hPa</span>
        </div>
        <div className="mt-3 text-sm font-bold flex items-center gap-1.5 text-purple-400">
             <Info size={14} />
             {getPressureInfo(current)}
        </div>
      </div>

    </div>
  );
};
