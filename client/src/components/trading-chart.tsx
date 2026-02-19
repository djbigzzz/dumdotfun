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
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [interval, setInterval] = useState<string>("5m");
  const [priceMode, setPriceMode] = useState<"sol">("sol");
  const [crosshairData, setCrosshairData] = useState<{
    open: number; high: number; low: number; close: number; volume: number; time: number;
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

  const multiplier = 1;

  const formatPrice = (price: number): string => {
    if (price === 0) return "0";
    if (price < 0.000001) {
      const exp = price.toExponential(4);
      return exp;
    }
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(6);
    return price.toFixed(4);
  };

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0e0e10" },
        textColor: "#787b86",
        fontSize: 11,
        fontFamily: "'SF Mono', 'Fira Code', 'Roboto Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(42, 46, 57, 0.5)" },
        horzLines: { color: "rgba(42, 46, 57, 0.5)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.2)",
          width: 1,
          style: 3,
          labelBackgroundColor: "#2a2e39",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(42, 46, 57, 0.5)",
        scaleMargins: { top: 0.05, bottom: 0.2 },
        entireTextOnly: true,
      },
      timeScale: {
        borderColor: "rgba(42, 46, 57, 0.5)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 3,
        barSpacing: 8,
        minBarSpacing: 4,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      handleScale: { axisPressedMouseMove: true },
      handleScroll: { vertTouchDrag: false },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      priceFormat: {
        type: "custom",
        formatter: formatPrice,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setCrosshairData(null);
        return;
      }
      const candleValue = param.seriesData.get(candleSeries) as any;
      const volumeValue = param.seriesData.get(volumeSeries) as any;
      if (candleValue) {
        setCrosshairData({
          open: candleValue.open,
          high: candleValue.high,
          low: candleValue.low,
          close: candleValue.close,
          volume: volumeValue?.value || 0,
          time: param.time as number,
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
      open: c.open * multiplier,
      high: c.high * multiplier,
      low: c.low * multiplier,
      close: c.close * multiplier,
    }));

    const volumeData = ohlcData.candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open
        ? "rgba(38, 166, 154, 0.25)"
        : "rgba(239, 83, 80, 0.25)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    if (ohlcData.devTrades.length > 0) {
      const markers = ohlcData.devTrades.map(t => ({
        time: t.time as any,
        position: t.type === "buy" ? "belowBar" as const : "aboveBar" as const,
        color: t.type === "buy" ? "#26a69a" : "#ef5350",
        shape: "circle" as const,
        size: Math.min(2, Math.max(1, t.solAmount / 0.5)),
        text: `${t.solAmount.toFixed(2)} SOL`,
      }));
      candleSeriesRef.current.setMarkers(markers);
    } else {
      candleSeriesRef.current.setMarkers([]);
    }

    if (candleData.length > 0) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [ohlcData, multiplier, privateMode]);

  const hasCandles = ohlcData && ohlcData.candles.length > 0;
  const lastCandle = hasCandles ? ohlcData.candles[ohlcData.candles.length - 1] : null;
  const displayData = crosshairData || (lastCandle ? {
    open: lastCandle.open * multiplier,
    high: lastCandle.high * multiplier,
    low: lastCandle.low * multiplier,
    close: lastCandle.close * multiplier,
    volume: lastCandle.volume,
    time: lastCandle.time,
  } : null);

  const priceChange = displayData ? ((displayData.close - displayData.open) / displayData.open) * 100 : 0;
  const isUp = priceChange >= 0;

  return (
    <div className="bg-[#0e0e10] rounded-lg overflow-hidden" data-testid="trading-chart">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <div className="flex items-center gap-0.5">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => setInterval(i)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded transition-all ${
                interval === i
                  ? "bg-[#2a2e39] text-white"
                  : "text-[#787b86] hover:text-[#d1d4dc]"
              }`}
              data-testid={`button-interval-${i}`}
            >
              {i}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <span className="text-[#787b86]">SOL</span>
        </div>
      </div>

      {displayData && (
        <div className="flex items-center gap-3 px-3 pb-1 text-[11px] font-mono">
          <span className="text-[#787b86]">O <span className="text-[#d1d4dc]">{formatPrice(displayData.open)}</span></span>
          <span className="text-[#787b86]">H <span className="text-[#d1d4dc]">{formatPrice(displayData.high)}</span></span>
          <span className="text-[#787b86]">L <span className="text-[#d1d4dc]">{formatPrice(displayData.low)}</span></span>
          <span className="text-[#787b86]">C <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{formatPrice(displayData.close)}</span></span>
          <span className={`${isUp ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
            {isUp ? "+" : ""}{priceChange.toFixed(2)}%
          </span>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full relative" style={{ minHeight: 400 }}>
        {!hasCandles && (
          <div className="h-[400px] flex items-center justify-center text-sm text-[#787b86]">
            No trade data yet
          </div>
        )}
        <div ref={tooltipRef} />
      </div>
    </div>
  );
}
