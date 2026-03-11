import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const MOCK_TICKER = [
  { symbol: 'BTC/USD', price: '65,432.10', change: '+2.4%', up: true },
  { symbol: 'ETH/USD', price: '3,456.78', change: '-1.2%', up: false },
  { symbol: 'EUR/USD', price: '1.0854', change: '+0.05%', up: true },
  { symbol: 'GBP/USD', price: '1.2678', change: '+0.12%', up: true },
  { symbol: 'AAPL', price: '178.45', change: '-0.8%', up: false },
  { symbol: 'TSLA', price: '165.20', change: '+1.5%', up: true },
  { symbol: 'NVDA', price: '875.30', change: '+3.2%', up: true },
  { symbol: 'GOLD', price: '2,156.40', change: '+0.4%', up: true },
];

export const TickerTape: React.FC = () => {
  return (
    <div className="w-full h-12 bg-black/40 border-b border-white/5 overflow-hidden flex items-center">
      <motion.div 
        className="flex whitespace-nowrap gap-8 px-4"
        animate={{ x: [0, -1000] }}
        transition={{ 
          duration: 30, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      >
        {[...MOCK_TICKER, ...MOCK_TICKER].map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/40">{item.symbol}</span>
            <span className="text-xs font-mono font-medium">{item.price}</span>
            <div className={`flex items-center gap-0.5 text-[10px] font-bold ${item.up ? 'text-emerald-500' : 'text-red-500'}`}>
              {item.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {item.change}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
};
