import React from 'react';

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  label: string;
  unit: string;
  color?: string;
}

export const Gauge: React.FC<GaugeProps> = ({ value, min, max, label, unit, color = "#38bdf8" }) => {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1);
  const angle = percentage * 180;
  
  return (
    <div className="flex flex-col items-center justify-center p-4 glass-panel rounded-xl">
      <span className="text-slate-400 text-sm font-medium uppercase tracking-wider mb-2">{label}</span>
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background Arc */}
        <div className="absolute top-0 left-0 w-32 h-32 rounded-full border-[8px] border-slate-700 box-border"></div>
        {/* Fill Arc (Masked logic simplified for CSS) */}
        <svg viewBox="0 0 100 50" className="w-full h-full absolute top-0 left-0">
           <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#334155" strokeWidth="10" />
           <path 
            d="M 10 50 A 40 40 0 0 1 90 50" 
            fill="none" 
            stroke={color} 
            strokeWidth="10" 
            strokeDasharray="126"
            strokeDashoffset={126 - (126 * percentage)}
            strokeLinecap="round"
           />
        </svg>
      </div>
      <div className="mt-[-10px] flex flex-col items-center">
         <span className="text-2xl font-bold text-white">{value}</span>
         <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
};