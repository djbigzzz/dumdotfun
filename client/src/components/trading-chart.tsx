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

export function TradingChart({ mint, solPrice }: TradingChartProps) {
  const { privateMode } = usePrivacy();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const [interval, setInterval] = useState<string>("5m");
  const [showBubbles, setShowBubbles] = useState(true);
  const [priceMode, setPriceMode] = useState<"usd" | "sol">("usd");
  const markersRef = useRef<any[]>([]);

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

  const multiplier = priceMode === "usd" && solPrice ? solPrice : 1;

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const bg = privateMode ? "#0a0a0a" : "#111111";
    const textColor = privateMode ? "#4ADE80" : "#d1d5db";
    const gridColor = privateMode ? "rgba(74, 222, 128, 0.06)" : "rgba(255,255,255,0.04)";
    const upColor = privateMode ? "#4ADE80" : "#22c55e";
    const downColor = "#ef4444";

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: bg },
        textColor,
        fontSize: 11,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 340,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
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

    const upColor = privateMode ? "#4ADE80" : "#22c55e";
    const downColor = "#ef4444";

    const candleData = ohlcData.candles.map(c => ({
      time: c.time as any,
      open: c.open * multiplier,
      high: c.high * multiplier,
      low: c.low * multiplier,
      close: c.close * multiplier,
    }));

    const volumeData = ohlcData.candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open
        ? (privateMode ? "rgba(74,222,128,0.3)" : "rgba(34,197,94,0.3)")
        : "rgba(239,68,68,0.3)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (showBubbles && ohlcData.devTrades.length > 0) {
      const markers = ohlcData.devTrades.map(t => ({
        time: t.time as any,
        position: t.type === "buy" ? "belowBar" as const : "aboveBar" as const,
        color: t.type === "buy" ? upColor : downColor,
        shape: "circle" as const,
        size: Math.min(3, Math.max(1, t.solAmount / 0.5)),
        text: `DEV ${t.type.toUpperCase()} ${t.solAmount.toFixed(2)} SOL`,
      }));
      markersRef.current = markers;
      candleSeriesRef.current.setMarkers(markers);
    } else {
      markersRef.current = [];
      candleSeriesRef.current.setMarkers([]);
    }

    if (candleData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [ohlcData, showBubbles, multiplier, privateMode]);

  const hasCandles = ohlcData && ohlcData.candles.length > 0;
  const hasDevTrades = ohlcData && ohlcData.devTrades.length > 0;
  const lastCandle = hasCandles ? ohlcData.candles[ohlcData.candles.length - 1] : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-1">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={`px-2 py-0.5 text-xs font-bold transition-all ${
                interval === i
                  ? privateMode ? "bg-[#4ADE80] text-black" : "bg-white text-black"
                  : privateMode ? "text-[#4ADE80]/60 hover:text-[#4ADE80]" : "text-gray-500 hover:text-white"
              }`}
              data-testid={`button-interval-${i}`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {hasDevTrades && (
            <button
              onClick={() => setShowBubbles(!showBubbles)}
              className={`px-2 py-0.5 text-xs font-bold transition-all ${
                showBubbles
                  ? privateMode ? "text-[#4ADE80]" : "text-white"
                  : privateMode ? "text-[#4ADE80]/40" : "text-gray-600"
              }`}
              data-testid="button-toggle-bubbles"
            >
              {showBubbles ? "Hide Bubbles" : "Show Bubbles"}
            </button>
          )}
          <div className="flex text-xs font-bold">
            <button
              onClick={() => setPriceMode("usd")}
              className={`px-2 py-0.5 ${priceMode === "usd" ? (privateMode ? "text-[#4ADE80]" : "text-white") : (privateMode ? "text-[#4ADE80]/40" : "text-gray-600")}`}
              data-testid="button-price-usd"
            >
              USD
            </button>
            <button
              onClick={() => setPriceMode("sol")}
              className={`px-2 py-0.5 ${priceMode === "sol" ? (privateMode ? "text-[#4ADE80]" : "text-white") : (privateMode ? "text-[#4ADE80]/40" : "text-gray-600")}`}
              data-testid="button-price-sol"
            >
              SOL
            </button>
          </div>
        </div>
      </div>

      {lastCandle && (
        <div className={`flex items-center gap-3 text-xs mb-1 font-mono ${privateMode ? "text-[#4ADE80]/70" : "text-gray-400"}`}>
          <span>O <span className="text-white">{(lastCandle.open * multiplier).toFixed(8)}</span></span>
          <span>H <span className="text-white">{(lastCandle.high * multiplier).toFixed(8)}</span></span>
          <span>L <span className="text-white">{(lastCandle.low * multiplier).toFixed(8)}</span></span>
          <span>C <span className={lastCandle.close >= lastCandle.open ? "text-green-400" : "text-red-400"}>{(lastCandle.close * multiplier).toFixed(8)}</span></span>
          <span>Vol <span className="text-white">{lastCandle.volume.toFixed(2)}</span></span>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full" style={{ minHeight: 340 }}>
        {!hasCandles && (
          <div className={`h-[340px] flex items-center justify-center text-sm ${privateMode ? "text-[#4ADE80]/50" : "text-gray-500"}`}>
            No trade data yet — chart will appear after first trade
          </div>
        )}
      </div>

      {hasDevTrades && showBubbles && (
        <div className={`flex items-center gap-3 mt-2 text-xs ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Dev Buy
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span> Dev Sell
          </span>
          <span className="ml-auto">Creator: {ohlcData?.creatorAddress?.slice(0, 6)}...</span>
        </div>
      )}
    </div>
  );
}
