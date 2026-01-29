
import React from 'react';
import { Wind, Maximize2, Info, Compass } from 'lucide-react';

interface WindCompassProps {
  direction: number; 
  speed: number;
  gust: number;
  maxDaySpeed?: number;
  maxDayGust?: number;
  onClick?: () => void;
}

const getWindDirStr = (deg: number) => {
    const val = Math.floor((deg / 22.5) + 0.5);
    const arr = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"];
    return arr[val % 16];
};

export const WindCompass: React.FC<WindCompassProps> = ({ 
  direction,
  speed,
  gust,
  onClick 
}) => {
  // Thème bleu ciel cohérent avec l'élément "Air"
  const theme = {
      border: 'hover:border-sky-500/40',
      icon: 'text-sky-500',
      accent: 'text-sky-400'
  };

  return (
    <div 
      onClick={onClick}
      className={`glass-panel p-6 rounded-xl relative overflow-hidden group cursor-pointer hover:bg-slate-800/80 transition-all border border-transparent ${theme.border}`}
    >
      {/* Icône de fond */}
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity ${theme.icon}`}>
          <Wind size={64} />
      </div>
      
      {/* Icône d'agrandissement */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} className={theme.icon} />
      </div>

      {/* Titre */}
      <div className="text-slate-400 text-sm font-medium uppercase mb-1">Vent</div>

      {/* Valeur Principale (Vitesse) */}
      <div className="flex items-center gap-4">
          <div className="flex items-end gap-1">
              <span className="text-5xl font-bold text-white tracking-tighter">{speed.toFixed(0)}</span>
              <span className="text-slate-400 mb-2 font-medium">km/h</span>
          </div>
          {/* Info Secondaire (Direction) */}
          <div className="flex flex-col text-[10px] leading-tight text-slate-400 font-medium border-l border-slate-700 pl-3 py-1">
              <div className="whitespace-nowrap flex items-center gap-1">
                  <Compass size={10} />
                  <strong className="text-slate-200">{getWindDirStr(direction)}</strong>
              </div>
              <div className="whitespace-nowrap">{direction}°</div>
          </div>
      </div>

      {/* Footer (Rafales) */}
      <div className={`mt-3 text-sm font-bold flex items-center gap-1.5 ${theme.accent}`}>
           <Info size={14} />
           Rafales {gust.toFixed(0)} km/h
      </div>
    </div>
  );
};
