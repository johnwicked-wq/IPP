
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { HistoryPoint } from '../types';

interface ChartsProps {
  data: HistoryPoint[];
}

const formatFullDate = (epoch: number) => {
  return new Date(epoch * 1000).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs backdrop-blur-md">
        <p className="font-bold mb-2 text-sky-400 border-b border-slate-700/50 pb-1.5">
          {formatFullDate(data.epoch)}
        </p>
        <div className="space-y-1.5">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="flex justify-between gap-6">
              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                {p.name}
              </span>
              <span className="font-mono font-bold text-white">{p.value}</span>
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
    <ul className="flex justify-center gap-6 text-[10px] font-bold uppercase tracking-widest mt-2">
      {payload.map((entry: any, index: number) => (
        <li key={`item-${index}`} className="flex items-center gap-2" style={{ color: entry.color }}>
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></span>
          <span>{entry.value}</span>
        </li>
      ))}
    </ul>
  );
};

export const Charts: React.FC<ChartsProps> = ({ data }) => {
  return (
    <div className="flex flex-col gap-6">
      
      {/* Temperature Chart */}
      <div className="glass-panel p-5 rounded-2xl h-[280px] border border-slate-800">
        <h3 className="text-slate-300 font-bold mb-4 text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></span> Température & Rosée
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data} margin={{ bottom: 10 }}>
            <defs>
              <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#fb923c" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={12} minTickGap={60} axisLine={false} tickLine={false} />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
            <Area type="monotone" dataKey="temp" name="Température" stroke="#fb923c" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={3} isAnimationActive={false} connectNulls />
            <Area type="monotone" dataKey="dewPoint" name="Point de Rosée" stroke="#10b981" fill="none" strokeWidth={2} strokeDasharray="4 4" isAnimationActive={false} connectNulls />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Pressure Chart */}
      <div className="glass-panel p-5 rounded-2xl h-[280px] border border-slate-800">
        <h3 className="text-slate-300 font-bold mb-4 text-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></span> Pression Atmosphérique
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={data} margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickMargin={12} minTickGap={60} />
            <YAxis stroke="#64748b" fontSize={10} domain={['auto', 'auto']} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend content={renderCustomLegend} verticalAlign="bottom" height={36}/>
            <Line type="monotone" dataKey="pressure" name="Pression (hPa)" stroke="#c084fc" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
