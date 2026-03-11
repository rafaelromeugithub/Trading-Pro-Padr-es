export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h';

export interface PatternSignal {
  id: string;
  name: string;
  type: 'bullish' | 'bearish';
  timestamp: number;
  description: string;
  prediction: string;
  imageUrl: string;
  isCandlestickPattern?: boolean;
  asset: string;
  timeframe: string;
}

export type Asset = 'EURUSD' | 'BTCUSD';
