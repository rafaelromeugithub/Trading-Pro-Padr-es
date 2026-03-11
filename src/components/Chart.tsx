import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, CandlestickSeries, SeriesMarker } from 'lightweight-charts';
import { Candle } from '../types';

interface ChartProps {
  data: Candle[];
  markers?: SeriesMarker<number>[];
  onCrosshairMove?: (price: number | null) => void;
}

export const Chart: React.FC<ChartProps> = ({ data, markers = [], onCrosshairMove }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#1f1f1f' },
        horzLines: { color: '#1f1f1f' },
      },
      localization: {
        locale: 'pt-BR',
        dateFormat: 'dd/MM/yyyy',
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#333',
      },
      rightPriceScale: {
        borderColor: '#333',
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const offset = new Date().getTimezoneOffset() * 60;
    const shiftedData = data.map(d => ({
      ...d,
      time: (d.time as number) - offset
    }));
    const shiftedMarkers = markers.map(m => ({
      ...m,
      time: (m.time as number) - offset
    }));

    series.setData(shiftedData);
    if (shiftedMarkers.length > 0 && typeof (series as any).setMarkers === 'function') {
      (series as any).setMarkers(shiftedMarkers);
    }
    
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) {
      const offset = new Date().getTimezoneOffset() * 60;
      const shiftedData = data.map(d => ({
        ...d,
        time: (d.time as number) - offset
      }));
      seriesRef.current.setData(shiftedData);
    }
  }, [data]);

  useEffect(() => {
    if (seriesRef.current && typeof (seriesRef.current as any).setMarkers === 'function') {
      const offset = new Date().getTimezoneOffset() * 60;
      const shiftedMarkers = markers.map(m => ({
        ...m,
        time: (m.time as number) - offset
      }));
      (seriesRef.current as any).setMarkers(shiftedMarkers);
    }
  }, [markers]);

  return <div ref={chartContainerRef} className="w-full h-[500px]" />;
};
