import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TradingViewWidget } from './components/TradingViewWidget';
import { TickerTape } from './components/TickerTape';
import { VolumeAnalysis } from './components/VolumeAnalysis';
import { identifyPattern } from './services/geminiService';
import { Candle, PatternSignal, Asset, Timeframe } from './types';
import { TrendingUp, TrendingDown, Bell, Info, X, ChevronRight, Activity, Clock, Search, Globe, Newspaper, BarChart3, PieChart, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const INITIAL_EURUSD = 1.1627;
const INITIAL_BTCUSD = 68637;

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '4h', value: '4h' },
];

export default function App() {
  const [asset, setAsset] = useState<Asset>('BTCUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<PatternSignal[]>([]);
  const [selectedSignal, setSelectedSignal] = useState<PatternSignal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activePatterns, setActivePatterns] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<{ message: string; type: 'bullish' | 'bearish' } | null>(null);
  const [signalFilter, setSignalFilter] = useState<{ asset: Asset | 'ALL'; timeframe: Timeframe | 'ALL' }>({ asset: 'ALL', timeframe: 'ALL' });
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sound effect for alerts
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    // Using a standard notification sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio play failed:', e));
  }, [soundEnabled]);

  // Generate initial data
  useEffect(() => {
    const initialData: Candle[] = [];
    let lastClose = asset === 'BTCUSD' ? INITIAL_BTCUSD : INITIAL_EURUSD;
    const now = Math.floor(Date.now() / 1000);
    
    // Adjust time step based on timeframe
    const timeStepMap: Record<Timeframe, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
    };
    const step = timeStepMap[timeframe];

    // Use a simple random walk with momentum for more realistic look
    let momentum = 0;
    for (let i = 200; i >= 0; i--) {
      const time = now - i * step;
      const volatility = asset === 'BTCUSD' ? 80 : 0.0008;
      
      // Momentum-based random walk
      momentum = momentum * 0.8 + (Math.random() - 0.5) * volatility;
      const change = momentum + (Math.random() - 0.5) * (volatility * 0.5);
      
      const open = lastClose;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.2);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.2);
      const volume = Math.random() * (asset === 'BTCUSD' ? 5000 : 1000000);
      
      initialData.push({ time, open, high, low, close, volume });
      lastClose = close;
    }
    setCandles(initialData);
  }, [asset, timeframe]);

  // Real-time update simulation
  const [momentum, setMomentum] = useState(0);

  useEffect(() => {
    const timeStepMap: Record<Timeframe, number> = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '30m': 1800,
      '1h': 3600,
      '4h': 14400,
    };
    const step = timeStepMap[timeframe];

    const interval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        
        const now = Math.floor(Date.now() / 1000);
        const lastCandle = prev[prev.length - 1];
        const volatility = asset === 'BTCUSD' ? 40 : 0.0004;
        
        // Update momentum
        const newMomentum = momentum * 0.7 + (Math.random() - 0.5) * volatility;
        setMomentum(newMomentum);
        
        const change = newMomentum + (Math.random() - 0.5) * (volatility * 0.3);
        const newPrice = lastCandle.close + change;
        const newVolume = Math.random() * (asset === 'BTCUSD' ? 5000 : 1000000);

        // Check if we need to start a new candle
        if (now >= lastCandle.time + step) {
          const newCandle: Candle = {
            time: lastCandle.time + step,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, newPrice),
            low: Math.min(lastCandle.close, newPrice),
            close: newPrice,
            volume: newVolume
          };
          return [...prev.slice(1), newCandle];
        } else {
          // Update current candle
          const updatedLast = {
            ...lastCandle,
            high: Math.max(lastCandle.high, newPrice),
            low: Math.min(lastCandle.low, newPrice),
            close: newPrice,
            volume: lastCandle.volume + (newVolume * 0.1)
          };
          return [...prev.slice(0, -1), updatedLast];
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [asset, timeframe, momentum]);

  // Pattern detection trigger
  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    const result = await identifyPattern(candles.slice(-50), asset, timeframe);
    
    if (result.patternFound && result.confidence > 0.6) {
      const newSignal: PatternSignal = {
        id: Date.now().toString(),
        name: result.patternName,
        type: result.type,
        timestamp: candles[candles.length - 1].time * 1000,
        description: result.description,
        prediction: result.prediction,
        imageUrl: result.isCandlestickPattern 
          ? `https://picsum.photos/seed/${result.patternName.replace(/\s+/g, '-')}/400/300`
          : 'https://picsum.photos/seed/chart/400/300',
        isCandlestickPattern: result.isCandlestickPattern,
        asset,
        timeframe
      };
      setSignals(prev => [newSignal, ...prev].slice(0, 20));

      // Trigger sound and highlight
      playAlertSound();
      
      const uiName = result.patternName;

      setActivePatterns(prev => ({
        ...prev,
        [uiName]: Date.now()
      }));

      // Show toast
      setToast({ 
        message: `Padrão ${uiName} identificado!`, 
        type: result.type 
      });
      setTimeout(() => setToast(null), 5000);

      // Clear highlight after 15 seconds
      setTimeout(() => {
        setActivePatterns(prev => {
          const newState = { ...prev };
          delete newState[uiName];
          return newState;
        });
      }, 15000);
    }
    
    setIsAnalyzing(false);
  }, [candles, isAnalyzing, playAlertSound]);

  // Run analysis every 30 seconds
  useEffect(() => {
    const interval = setInterval(runAnalysis, 30000);
    return () => clearInterval(interval);
  }, [runAnalysis]);

  // Initial mock signals for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      if (signals.length === 0) {
        const mockSignals: PatternSignal[] = [
          {
            id: 'mock-1',
            name: 'Martelo',
            type: 'bullish',
            timestamp: Date.now() - 1000 * 60 * 5,
            description: 'Identificado um padrão de Martelo (Hammer). Este padrão de vela única sugere uma forte rejeição de preços mais baixos e uma possível reversão para alta.',
            prediction: 'up',
            imageUrl: 'https://picsum.photos/seed/hammer-candle/400/300',
            isCandlestickPattern: true,
            asset: 'BTCUSD',
            timeframe: '1m'
          },
          {
            id: 'mock-2',
            name: 'Engolfo',
            type: 'bearish',
            timestamp: Date.now() - 1000 * 60 * 15,
            description: 'Identificado um padrão de Engolfo de Baixa. A vela atual engolfou completamente a anterior, indicando força vendedora.',
            prediction: 'down',
            imageUrl: 'https://picsum.photos/seed/engulfing-bear/400/300',
            isCandlestickPattern: true,
            asset: 'EURUSD',
            timeframe: '5m'
          },
          {
            id: 'mock-3',
            name: 'BOS',
            type: 'bullish',
            timestamp: Date.now() - 1000 * 60 * 30,
            description: 'Quebra de Estrutura (Break of Structure) identificada. O preço rompeu o topo anterior, confirmando a tendência de alta.',
            prediction: 'up',
            imageUrl: 'https://picsum.photos/seed/bos-chart/400/300',
            isCandlestickPattern: false,
            asset: 'BTCUSD',
            timeframe: '15m'
          },
          {
            id: 'mock-4',
            name: 'Triângulo',
            type: 'bullish',
            timestamp: Date.now() - 1000 * 60 * 60,
            description: 'Padrão de Triângulo Ascendente identificado. O preço está afunilando em direção à resistência, sugerindo um rompimento para cima.',
            prediction: 'up',
            imageUrl: 'https://picsum.photos/seed/triangle-chart/400/300',
            isCandlestickPattern: false,
            asset: 'EURUSD',
            timeframe: '1h'
          }
        ];
        setSignals(mockSignals);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Trigger analysis when asset or timeframe changes
  useEffect(() => {
    // Small delay to ensure candles are updated
    const timer = setTimeout(() => {
      runAnalysis();
    }, 1000);
    
    // Also update the signal filter to match the current view
    setSignalFilter({ asset, timeframe });
    
    return () => clearTimeout(timer);
  }, [asset, timeframe, runAnalysis]);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Activity className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Trading Pro Padrões</h1>
              <p className="text-[10px] text-emerald-500 uppercase tracking-widest font-semibold">Análise Técnica Real-Time</p>
            </div>
          </div>

          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Pesquisar ativos, padrões ou notícias..." 
                className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Timeframe Selector */}
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    timeframe === tf.value 
                      ? 'bg-white/10 text-white shadow-sm' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
              {(['BTCUSD', 'EURUSD'] as Asset[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAsset(a)}
                  className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                    asset === a 
                      ? 'bg-emerald-500 text-black shadow-lg' 
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Bell className="w-4 h-4 text-emerald-500" />
              )}
              Analisar Agora
            </button>
          </div>
        </div>
      </header>

      {/* Ticker Tape */}
      <TickerTape />

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Advanced Chart Section - Now Full Width */}
        <section id="advanced-chart" className="bg-[#0a0a0a] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/2">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white/90">{asset}</span>
                <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">{timeframe}</span>
              </div>
              <div className="h-4 w-px bg-white/10" />
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  Monitorando Ativo
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase tracking-wider">
              <Clock className="w-3 h-3" />
              <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-2" />
              Live Feed
            </div>
          </div>
          <TradingViewWidget symbol={asset} interval={timeframe} />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column (Main Content) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Symbol Info Section */}
            <section id="symbol-info" className="p-6 bg-white/2 border border-white/5 rounded-2xl shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                      <Globe className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{asset}</h2>
                    <span className="text-xs text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase font-bold tracking-wider">Crypto</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-mono font-bold">
                      {candles[candles.length-1]?.close.toLocaleString('en-US', { minimumFractionDigits: asset === 'BTCUSD' ? 2 : 4 })}
                    </span>
                    <div className={`flex items-center gap-1 text-sm font-bold ${candles[candles.length-1]?.close > candles[0]?.close ? 'text-emerald-500' : 'text-red-500'}`}>
                      {candles[candles.length-1]?.close > candles[0]?.close ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {((candles[candles.length-1]?.close - candles[0]?.close) / candles[0]?.close * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold mb-1">Volume 24h</p>
                  <p className="text-sm font-mono font-bold text-white/80">$42.5B</p>
                </div>
              </div>
            </section>

            {/* Patterns Info Section */}
            <section id="patterns-info" className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['HH/HL', 'BOS', 'CHoCH', 'EQH/EQL', 'Martelo', 'Engolfo', 'M Pattern', 'H&S', 'Triângulo', 'Cunha', 'Bandeira', 'Canal'].map((p) => {
                const isActive = !!activePatterns[p];
                return (
                  <div 
                    key={p} 
                    className={`p-4 bg-white/2 border rounded-xl transition-all duration-500 group relative overflow-hidden ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]' 
                        : 'border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${
                        isActive ? 'text-emerald-500' : 'text-white/40 group-hover:text-emerald-500'
                      }`}>
                        {p}
                      </h3>
                      {isActive && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-emerald-500"
                        />
                      )}
                    </div>
                    <p className={`text-[10px] transition-colors ${
                      isActive ? 'text-emerald-400 font-bold' : 'text-white/20'
                    }`}>
                      {isActive ? 'Detectado!' : 'Monitorando...'}
                    </p>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -right-1 -bottom-1 opacity-10"
                      >
                        <Activity className="w-12 h-12 text-emerald-500" />
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </section>

          {/* Company Profile & Fundamental Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section id="company-profile" className="p-6 bg-white/2 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Perfil do Ativo</h3>
              </div>
              <p className="text-xs text-white/40 leading-relaxed">
                {asset === 'BTCUSD' 
                  ? 'Bitcoin é uma criptomoeda descentralizada originalmente descrita em um whitepaper de 2008 por uma pessoa ou grupo de pessoas usando o pseudônimo Satoshi Nakamoto. Foi lançada logo depois, em janeiro de 2009.'
                  : 'O par EUR/USD representa a taxa de câmbio entre o Euro e o Dólar Americano. É o par de moedas mais negociado no mundo, representando a relação entre as duas maiores economias globais.'}
              </p>
              <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-white/20 uppercase font-bold">Setor</p>
                  <p className="text-xs font-medium text-white/60">{asset === 'BTCUSD' ? 'Tecnologia / Finanças' : 'Moedas / Forex'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/20 uppercase font-bold">Capitalização</p>
                  <p className="text-xs font-medium text-white/60">{asset === 'BTCUSD' ? '$1.2T' : 'N/A'}</p>
                </div>
              </div>
            </section>

            <section id="fundamental-data" className="p-6 bg-white/2 border border-white/5 rounded-2xl">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Dados Fundamentais</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Máxima 52s', value: asset === 'BTCUSD' ? '$73,777' : '1.1275' },
                  { label: 'Mínima 52s', value: asset === 'BTCUSD' ? '$24,900' : '1.0448' },
                  { label: 'RSI (14)', value: '54.2' },
                  { label: 'ATR', value: asset === 'BTCUSD' ? '2,450' : '0.0085' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-white/30">{item.label}</span>
                    <span className="font-mono font-bold text-white/80">{item.value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-8">
          
          {/* Technical Analysis Section */}
          <section id="technical-analysis" className="p-6 bg-white/2 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Análise Técnica</h3>
            </div>
            
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute inset-0 border-t-[8px] border-white/10 rounded-t-full" />
                <div className="absolute inset-0 border-t-[8px] border-emerald-500 rounded-t-full" style={{ clipPath: 'inset(0 0 0 50%)' }} />
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-12 bg-white origin-bottom rotate-[30deg]" />
              </div>
              <p className="mt-4 text-lg font-bold text-emerald-500">COMPRA FORTE</p>
              <div className="mt-6 w-full space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 uppercase font-bold">
                  <span>Osciladores</span>
                  <span className="text-emerald-500">Neutro</span>
                </div>
                <div className="flex justify-between text-[10px] text-white/40 uppercase font-bold">
                  <span>Médias Móveis</span>
                  <span className="text-emerald-500">Compra</span>
                </div>
              </div>
            </div>
          </section>

          {/* Volume Analysis Section */}
          <VolumeAnalysis candles={candles} />

          {/* Signals Section (Repurposed from previous version) */}
          <section id="signals" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    Sinais Recentes
                  </h2>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`p-1.5 rounded-lg border transition-all ${
                      soundEnabled 
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                        : 'bg-white/5 border-white/10 text-white/40'
                    }`}
                    title={soundEnabled ? 'Desativar som' : 'Ativar som'}
                  >
                    {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  {signals.filter(s => 
                    (signalFilter.asset === 'ALL' || s.asset === signalFilter.asset) &&
                    (signalFilter.timeframe === 'ALL' || s.timeframe === signalFilter.timeframe)
                  ).length} Sinais
                </span>
              </div>

              {/* Signal Filters */}
              <div className="flex flex-wrap gap-2">
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                  {['ALL', 'BTCUSD', 'EURUSD'].map((a) => (
                    <button
                      key={a}
                      onClick={() => setSignalFilter(prev => ({ ...prev, asset: a as any }))}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        signalFilter.asset === a 
                          ? 'bg-emerald-500 text-black' 
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                  {['ALL', '1m', '5m', '15m', '30m', '1h', '4h'].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSignalFilter(prev => ({ ...prev, timeframe: tf as any }))}
                      className={`px-2 py-1 rounded text-[9px] font-bold transition-all ${
                        signalFilter.timeframe === tf 
                          ? 'bg-emerald-500 text-black' 
                          : 'text-white/40 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {signals.filter(s => 
                  (signalFilter.asset === 'ALL' || s.asset === signalFilter.asset) &&
                  (signalFilter.timeframe === 'ALL' || s.timeframe === signalFilter.timeframe)
                ).length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 border border-dashed border-white/10 rounded-2xl text-center"
                  >
                    <Info className="w-8 h-8 text-white/10 mx-auto mb-3" />
                    <p className="text-xs text-white/40">Nenhum sinal encontrado para este filtro.</p>
                  </motion.div>
                ) : (
                  signals
                    .filter(s => 
                      (signalFilter.asset === 'ALL' || s.asset === signalFilter.asset) &&
                      (signalFilter.timeframe === 'ALL' || s.timeframe === signalFilter.timeframe)
                    )
                    .map((signal) => (
                      <motion.button
                        key={signal.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedSignal(signal)}
                      className="w-full p-4 bg-white/2 border border-white/5 rounded-xl hover:bg-white/5 hover:border-emerald-500/30 transition-all text-left group relative overflow-hidden"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-emerald-500">{signal.name}</span>
                          <span className="text-[8px] bg-white/5 text-white/40 px-1.5 py-0.5 rounded border border-white/10 uppercase font-bold tracking-wider">
                            {signal.asset} • {signal.timeframe}
                          </span>
                          {signal.isCandlestickPattern && (
                            <span className="text-[8px] bg-emerald-500/10 text-emerald-500 px-1 rounded border border-emerald-500/20 uppercase font-bold">Vela</span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/30">
                          {new Date(signal.timestamp).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {signal.type === 'bullish' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-[10px] text-white/60 uppercase tracking-wider font-medium">
                          Predição: {signal.prediction === 'up' ? 'Alta' : 'Baixa'}
                        </span>
                      </div>
                      <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-hover:text-emerald-500 transition-all" />
                    </motion.button>
                  ))
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Top Stories Section */}
          <section id="top-stories" className="p-6 bg-white/2 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-white/60">Principais Notícias</h3>
            </div>
            <div className="space-y-4">
              {[
                { title: 'Bancos centrais sinalizam manutenção de taxas', time: '2h atrás' },
                { title: 'Bitcoin atinge nova resistência em $68k', time: '4h atrás' },
                { title: 'Inflação na zona do euro cai mais que o esperado', time: '5h atrás' },
              ].map((story, i) => (
                <div key={i} className="group cursor-pointer">
                  <h4 className="text-xs font-medium text-white/80 group-hover:text-emerald-500 transition-colors line-clamp-2">{story.title}</h4>
                  <p className="text-[10px] text-white/20 mt-1">{story.time}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Powered by TradingView Section */}
          <section id="powered-by-tv" className="p-6 bg-white/2 border border-white/5 rounded-2xl">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-white/80">TradingView</span>
            </div>
            <p className="text-[10px] text-white/40 leading-relaxed">
              Gráficos e informações financeiras fornecidos pela TradingView, uma plataforma popular de gráficos e negociação.
            </p>
            <a href="https://www.tradingview.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-3 text-[10px] text-emerald-500 hover:underline font-bold uppercase tracking-widest">
              Ver mais recursos
            </a>
          </section>
        </div>
      </div>
    </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-white/5 text-center space-y-4">
        <p className="text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
          Trading Pro Padrões &copy; 2026
        </p>
        <p className="text-[10px] text-white/10 max-w-2xl mx-auto leading-relaxed">
          Este aplicativo é uma ferramenta de análise técnica automatizada. O trading de ativos financeiros envolve riscos significativos. Sempre realize sua própria pesquisa antes de tomar decisões de investimento.
        </p>
      </footer>

      {/* Signal Modal */}
      <AnimatePresence>
        {selectedSignal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSignal(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-emerald-500">{selectedSignal.name}</h2>
                    {selectedSignal.isCandlestickPattern && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-bold">Padrão de Vela</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-1">Identificado em {asset} ({timeframe})</p>
                </div>
                <button 
                  onClick={() => setSelectedSignal(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="aspect-video bg-black rounded-2xl border border-white/5 overflow-hidden flex items-center justify-center relative">
                  <img 
                    src={selectedSignal.imageUrl} 
                    alt={selectedSignal.name}
                    className="w-full h-full object-cover opacity-50"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      selectedSignal.type === 'bullish' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {selectedSignal.type === 'bullish' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                    </div>
                    <p className="text-sm font-medium text-white/80">
                      Este padrão indica uma possível movimentação de <span className={selectedSignal.type === 'bullish' ? 'text-emerald-500' : 'text-red-500'}>
                        {selectedSignal.prediction === 'up' ? 'ALTA' : 'BAIXA'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/2 rounded-2xl border border-white/5">
                    <h4 className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-2">Análise do Especialista</h4>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {selectedSignal.description}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
                      <p className="text-[10px] text-emerald-500/60 uppercase font-bold">Confiança</p>
                      <p className="text-lg font-bold text-emerald-500">88%</p>
                    </div>
                    <div className="flex-1 p-3 bg-white/2 border border-white/5 rounded-xl text-center">
                      <p className="text-[10px] text-white/30 uppercase font-bold">Timeframe</p>
                      <p className="text-lg font-bold text-white/80">{timeframe}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/2 flex gap-3">
                <button 
                  onClick={() => setSelectedSignal(null)}
                  className="flex-1 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] px-6 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 min-w-[300px]"
            style={{ 
              backgroundColor: toast.type === 'bullish' ? 'rgba(6, 78, 59, 0.9)' : 'rgba(127, 29, 29, 0.9)',
              borderColor: toast.type === 'bullish' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              toast.type === 'bullish' ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              <Bell className={`w-5 h-5 ${
                toast.type === 'bullish' ? 'text-emerald-500' : 'text-red-500'
              }`} />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Novo Padrão!</p>
              <p className="text-sm text-white/80">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(null)}
              className="ml-auto text-white/40 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
