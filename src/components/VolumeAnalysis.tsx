import React, { useMemo } from 'react';
import { Candle } from '../types';
import { motion } from 'motion/react';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface VolumeAnalysisProps {
  candles: Candle[];
}

export const VolumeAnalysis: React.FC<VolumeAnalysisProps> = ({ candles }) => {
  const analysis = useMemo(() => {
    if (candles.length < 20) return null;

    const length = 20;
    const recentCandles = candles.slice(-length);
    const currentVolume = candles[candles.length - 1].volume;
    
    // Calculate Volume MA
    const volumeMA = candles.slice(-length).reduce((acc, c) => acc + c.volume, 0) / length;

    // Ratios from Pine Script
    const ratios = {
      ultra: 2.2,
      veryHigh: 1.8,
      high: 1.2,
      normal: 0.8,
      low: 0.4
    };

    const thresholds = {
      ultra: volumeMA * ratios.ultra,
      veryHigh: volumeMA * ratios.veryHigh,
      high: volumeMA * ratios.high,
      normal: volumeMA * ratios.normal,
      low: volumeMA * ratios.low
    };

    let level: 'Ultra' | 'Muito Alto' | 'Alto' | 'Normal' | 'Baixo' | 'Muito Baixo' = 'Muito Baixo';
    let color = 'text-slate-400';
    let bgColor = 'bg-slate-400/10';
    let barColor = 'bg-slate-400';

    if (currentVolume >= thresholds.ultra) {
      level = 'Ultra';
      color = 'text-purple-500';
      bgColor = 'bg-purple-500/10';
      barColor = 'bg-purple-500';
    } else if (currentVolume >= thresholds.veryHigh) {
      level = 'Muito Alto';
      color = 'text-red-500';
      bgColor = 'bg-red-500/10';
      barColor = 'bg-red-500';
    } else if (currentVolume >= thresholds.high) {
      level = 'Alto';
      color = 'text-orange-500';
      bgColor = 'bg-orange-500/10';
      barColor = 'bg-orange-500';
    } else if (currentVolume >= thresholds.normal) {
      level = 'Normal';
      color = 'text-emerald-500';
      bgColor = 'bg-emerald-500/10';
      barColor = 'bg-emerald-500';
    } else if (currentVolume >= thresholds.low) {
      level = 'Baixo';
      color = 'text-blue-500';
      bgColor = 'bg-blue-500/10';
      barColor = 'bg-blue-500';
    }

    // VSA Interpretation
    const lastCandle = candles[candles.length - 1];
    const isBullish = lastCandle.close > lastCandle.open;
    const spread = Math.abs(lastCandle.close - lastCandle.open);
    
    let signal: 'Continuidade' | 'Reversão' | 'Neutro' = 'Neutro';
    let signalDesc = 'Volume normal, aguardando confirmação.';
    let signalIcon = <Minus className="w-4 h-4" />;

    if (level === 'Ultra' || level === 'Muito Alto') {
      if (spread < (lastCandle.high - lastCandle.low) * 0.3) {
        signal = 'Reversão';
        signalDesc = 'Volume ultra alto com pouco deslocamento: possível absorção/reversão.';
        signalIcon = isBullish ? <TrendingDown className="w-4 h-4 text-red-500" /> : <TrendingUp className="w-4 h-4 text-emerald-500" />;
      } else {
        signal = 'Continuidade';
        signalDesc = 'Volume forte confirmando o movimento atual.';
        signalIcon = isBullish ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : <TrendingDown className="w-4 h-4 text-red-500" />;
      }
    } else if (level === 'Baixo' || level === 'Muito Baixo') {
      signal = 'Neutro';
      signalDesc = 'Falta de interesse institucional no momento.';
    }

    return {
      currentVolume,
      volumeMA,
      level,
      color,
      bgColor,
      barColor,
      signal,
      signalDesc,
      signalIcon,
      recentVolumes: recentCandles.map(c => ({
        v: c.volume,
        h: (c.volume / (volumeMA * 3)) * 100, // Normalized height
        isUp: c.close > c.open
      }))
    };
  }, [candles]);

  if (!analysis) return null;

  return (
    <section className="p-6 bg-white/2 border border-white/5 rounded-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${analysis.barColor} animate-pulse`} />
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Análise de Volume VSA</h3>
        </div>
        <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${analysis.bgColor} ${analysis.color} border border-current/20`}>
          Volume {analysis.level}
        </div>
      </div>

      {/* Volume Bars Visualization */}
      <div className="h-24 flex items-end gap-1 px-2 border-b border-white/5 pb-2">
        {candles.slice(-30).map((c, i) => {
          const vMA = analysis.volumeMA;
          let bColor = 'bg-slate-500/30';
          if (c.volume >= vMA * 2.2) bColor = 'bg-purple-500';
          else if (c.volume >= vMA * 1.8) bColor = 'bg-red-500';
          else if (c.volume >= vMA * 1.2) bColor = 'bg-orange-500';
          else if (c.volume >= vMA * 0.8) bColor = 'bg-emerald-500';
          else if (c.volume >= vMA * 0.4) bColor = 'bg-blue-500';

          const height = Math.min(100, (c.volume / (vMA * 2.5)) * 100);

          return (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              className={`flex-1 ${bColor} rounded-t-sm opacity-80 hover:opacity-100 transition-opacity cursor-help`}
              title={`Vol: ${c.volume.toFixed(0)}`}
            />
          );
        })}
      </div>

      {/* Signal Card */}
      <div className={`p-4 rounded-xl border ${analysis.signal === 'Reversão' ? 'border-red-500/20 bg-red-500/5' : analysis.signal === 'Continuidade' ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-white/2'}`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${analysis.signal === 'Reversão' ? 'bg-red-500/20' : analysis.signal === 'Continuidade' ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
            {analysis.signalIcon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Sinal de Volume</span>
              <span className={`text-[10px] font-bold uppercase ${analysis.signal === 'Reversão' ? 'text-red-500' : analysis.signal === 'Continuidade' ? 'text-emerald-500' : 'text-white/60'}`}>
                {analysis.signal}
              </span>
            </div>
            <p className="text-xs text-white/70 leading-relaxed">
              {analysis.signalDesc}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-white/2 rounded-xl border border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Volume Atual</p>
          <p className="text-sm font-mono font-bold text-white/90">{analysis.currentVolume.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
        <div className="p-3 bg-white/2 rounded-xl border border-white/5">
          <p className="text-[10px] text-white/30 uppercase font-bold mb-1">Média (20)</p>
          <p className="text-sm font-mono font-bold text-white/90">{analysis.volumeMA.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[9px] text-white/20 italic">
        <Info className="w-3 h-3" />
        <span>Baseado em VSA (Volume Spread Analysis) & Wyckoff Methodology</span>
      </div>
    </section>
  );
};
