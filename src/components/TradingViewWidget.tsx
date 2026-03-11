import React, { useEffect, useRef } from 'react';
import { Asset, Timeframe } from '../types';

interface TradingViewWidgetProps {
  symbol: Asset;
  interval: Timeframe;
  theme?: 'light' | 'dark';
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = ({ symbol, interval, theme = 'dark' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scriptId = 'tradingview-widget-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    const initWidget = () => {
      if (window.TradingView && containerRef.current) {
        containerRef.current.innerHTML = ''; // Clear previous widget
        new window.TradingView.widget({
          "width": "100%",
          "height": 700,
          "symbol": symbol === 'BTCUSD' ? 'BITSTAMP:BTCUSD' : 'FX:EURUSD',
          "interval": interval === '1m' ? '1' : interval === '5m' ? '5' : interval === '15m' ? '15' : interval === '30m' ? '30' : interval === '1h' ? '60' : '240',
          "timezone": "America/Sao_Paulo",
          "theme": theme,
          "style": "1",
          "locale": "br",
          "toolbar_bg": "#f1f3f6",
          "enable_publishing": false,
          "withdateranges": true,
          "hide_side_toolbar": false,
          "allow_symbol_change": true,
          "details": true,
          "hotlist": true,
          "calendar": true,
          "studies": [
            "ROC@tv-basicstudies",
            "StochasticRSI@tv-basicstudies"
          ],
          "show_popup_button": true,
          "popup_width": "1000",
          "popup_height": "650",
          "container_id": containerRef.current.id
        });
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = initWidget;
      document.head.appendChild(script);
    } else {
      if (window.TradingView) {
        initWidget();
      } else {
        script.onload = initWidget;
      }
    }

    return () => {
      // Cleanup if needed, though the widget usually handles itself
    };
  }, [symbol, interval, theme]);

  return (
    <div className="tradingview-widget-container" style={{ height: '700px', width: '100%' }}>
      <div id={`tradingview_${symbol}_${interval}`} ref={containerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};
