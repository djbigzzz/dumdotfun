import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";
import { usePrivacy } from "@/lib/privacy-context";

interface OHLCData {
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  devTrades: { time: number; type: string; solAmount: number; price: number }[];
  creatorAddress?: string;
}

interface TradingChartProps {
  mint: string;
  solPrice: number | null;
}

const INTERVALS = ["1m", "5m", "15m", "1h", "4h", "1D"] as const;

function formatSmallPrice(price: number): string {
  if (price === 0) return "0";
  if (price < 0.0000001) {
    const str = price.toFixed(12);
    const match = str.match(/^0\.(0+)(\d{1,4})/);
    if (match) {
      const zeros = match[1].length;
      const digits = match[2];
      return `0.0{${zeros}}${digits}`;
    }
    return price.toExponential(2);
  }
  if (price < 0.001) return price.toFixed(10);
  if (price < 1) return price.toFixed(6);
  if (price < 1000) return price.toFixed(4);
  return price.toFixed(2);
}

export function TradingChart({ mint, solPrice }: TradingChartProps) {
  const { privateMode } = usePrivacy();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [interval, setInterval] = useState<string>("5m");
  const [crosshairData, setCrosshairData] = useState<{
    open: number; high: number; low: number; close: number; volume: number;
  } | null>(null);

  const { data: ohlcData } = useQuery<OHLCData>({
    queryKey: ["ohlc", mint, interval],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/ohlc?interval=${interval}`);
      if (!res.ok) return { candles: [], devTrades: [] };
      return res.json();
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#787b86",
        fontSize: 11,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.6)" },
        horzLines: { color: "rgba(42, 46, 57, 0.6)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(120, 123, 134, 0.4)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#363a45",
        },
        horzLine: {
          color: "rgba(120, 123, 134, 0.4)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#363a45",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(42, 46, 57, 0.6)",
        scaleMargins: { top: 0.1, bottom: 0.2 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "rgba(42, 46, 57, 0.6)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 6,
        minBarSpacing: 2,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: true,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => {
          if (price < 0.0000001) return price.toExponential(2);
          if (price < 0.001) return price.toFixed(10);
          if (price < 1) return price.toFixed(6);
          return price.toFixed(2);
        },
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });

    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }
      const candleValue = param.seriesData.get(candleSeries) as any;
      const volumeValue = param.seriesData.get(volumeSeries) as any;
      if (candleValue && candleValue.open !== undefined) {
        setCrosshairData({
          open: candleValue.open,
          high: candleValue.high,
          low: candleValue.low,
          close: candleValue.close,
          volume: volumeValue?.value || 0,
        });
      }
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [privateMode]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  useEffect(() => {
    if (!ohlcData || !candleSeriesRef.current || !volumeSeriesRef.current) return;

    const candleData = ohlcData.candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = ohlcData.candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open
        ? "rgba(38, 166, 154, 0.3)"
        : "rgba(239, 83, 80, 0.3)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);
    candleSeriesRef.current.setMarkers([]);

    if (candleData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [ohlcData]);

  const hasCandles = ohlcData && ohlcData.candles.length > 0;
  const lastCandle = hasCandles ? ohlcData.candles[ohlcData.candles.length - 1] : null;
  const displayCandle = crosshairData || (lastCandle ? {
    open: lastCandle.open,
    high: lastCandle.high,
    low: lastCandle.low,
    close: lastCandle.close,
    volume: lastCandle.volume,
  } : null);

  return (
    <div className="bg-[#131722] rounded-lg overflow-hidden" data-testid="trading-chart">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-0.5">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={`px-2 py-1 text-[11px] font-medium rounded-sm transition-colors ${
                interval === i
                  ? "bg-[#2962ff] text-white"
                  : "text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39]"
              }`}
              data-testid={`button-interval-${i}`}
            >
              {i}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-[#787b86] font-medium">SOL</span>
      </div>

      {displayCandle && (
        <div className="flex items-center gap-2 px-3 pb-1 text-[10px]" style={{ fontFamily: "monospace" }}>
          <span className="text-[#787b86]">O</span>
          <span className="text-[#d1d4dc]">{formatSmallPrice(displayCandle.open)}</span>
          <span className="text-[#787b86]">H</span>
          <span className="text-[#d1d4dc]">{formatSmallPrice(displayCandle.high)}</span>
          <span className="text-[#787b86]">L</span>
          <span className="text-[#d1d4dc]">{formatSmallPrice(displayCandle.low)}</span>
          <span className="text-[#787b86]">C</span>
          <span className={displayCandle.close >= displayCandle.open ? "text-[#26a69a]" : "text-[#ef5350]"}>
            {formatSmallPrice(displayCandle.close)}
          </span>
          {displayCandle.volume > 0 && (
            <>
              <span className="text-[#787b86]">V</span>
              <span className="text-[#d1d4dc]">{displayCandle.volume.toFixed(2)}</span>
            </>
          )}
        </div>
      )}

      <div ref={chartContainerRef} className="w-full" style={{ minHeight: 320 }}>
        {!hasCandles && (
          <div className="h-[320px] flex items-center justify-center text-sm text-[#787b86]">
            No trade data yet
          </div>
        )}
      </div>
    </div>
  );
}
