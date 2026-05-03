import { useEffect, useRef, useState, useCallback } from "react";
import { createChart, ColorType, CrosshairMode, type IChartApi, type ISeriesApi } from "lightweight-charts";
import { useQuery } from "@tanstack/react-query";


interface OHLCData {
  candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[];
  devTrades: { time: number; type: string; solAmount: number; price: number }[];
  allTrades?: { time: number; type: string; solAmount: number; price: number; isDev: boolean }[];
  creatorAddress?: string;
  tooManyCandles?: boolean;
}

interface TradingChartProps {
  mint: string;
  solPrice: number | null;
  tokenSymbol?: string;
  totalSupply?: number;
}

const INTERVALS = ["1s", "15s", "30s", "1m", "5m", "15m", "30m", "1h", "4h", "1D"] as const;

type BadgeKind = "C" | "DB" | "DS" | "B" | "S";
type Badge = { id: string; time: number; price: number; kind: BadgeKind; side: "buy" | "sell"; label: string; size: number };

function formatMcap(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(2)}K`;
  if (val >= 1) return `$${val.toFixed(2)}`;
  if (val >= 0.01) return `$${val.toFixed(4)}`;
  return `$${val.toFixed(6)}`;
}

function formatSolMcap(val: number): string {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M SOL`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K SOL`;
  if (val >= 1) return `${val.toFixed(2)} SOL`;
  return `${val.toFixed(4)} SOL`;
}

function formatUsdPrice(val: number): string {
  if (val >= 1) return `$${val.toFixed(2)}`;
  if (val >= 0.01) return `$${val.toFixed(4)}`;
  if (val >= 0.0001) return `$${val.toFixed(6)}`;
  return `$${val.toExponential(2)}`;
}

function formatSolPrice(val: number): string {
  if (val >= 1) return `${val.toFixed(4)} SOL`;
  if (val >= 0.0001) return `${val.toFixed(8)} SOL`;
  return `${val.toExponential(2)} SOL`;
}

export function TradingChart({ mint, solPrice, tokenSymbol = "TOKEN", totalSupply = 1_000_000_000 }: TradingChartProps) {
  const privateMode = false;
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  // Default to 1-second candles (pump.fun's default) so a brand-new
  // token shows ~60 candles after 1 minute instead of one fat 5m candle.
  // Auto-upgrades via the tooManyCandles handler if the bucket count
  // would exceed the server cap on older tokens.
  const [interval, setInterval] = useState<string>("1s");
  const [viewMode, setViewMode] = useState<"mcap" | "price">("mcap");
  const [currency, setCurrency] = useState<"usd" | "sol">("usd");
  const [showBubbles, setShowBubbles] = useState(true);
  const [logScale, setLogScale] = useState<boolean>(false);
  const priceLineRef = useRef<any>(null);
  const athLineRef = useRef<any>(null);

  // Badges rendered as HTML overlay so we can show pump.fun-style coin
  // pills with the letter (DB / C / B / S) inside the circle. The native
  // lightweight-charts markers can only render text below the candle.
  const [badges, setBadges] = useState<Badge[]>([]);
  const [badgePositions, setBadgePositions] = useState<Record<string, { x: number; y: number }>>({});
  // Tracks whether we've already applied the initial pump.fun-style
  // anchor for the current interval. Resets when interval changes so
  // periodic 10s data refreshes don't snap users back if they've panned.
  const didAnchorRef = useRef<string | null>(null);
  const [crosshairData, setCrosshairData] = useState<{
    open: number; high: number; low: number; close: number; volume: number;
  } | null>(null);

  // Tracks whether the user has manually chosen an interval. Once they
  // do, we stop auto-upgrading for density (only the server-side
  // tooManyCandles cap will still bump them). Reset when mint changes
  // so navigating to a new token gets fresh density auto-upgrade.
  const userPickedIntervalRef = useRef(false);
  useEffect(() => {
    userPickedIntervalRef.current = false;
  }, [mint]);

  const { data: ohlcData } = useQuery<OHLCData>({
    queryKey: ["ohlc", mint, interval],
    queryFn: async () => {
      const res = await fetch(`/api/tokens/${mint}/ohlc?interval=${interval}`);
      if (!res.ok) return { candles: [], devTrades: [] };
      const data = await res.json();
      if (data.tooManyCandles) {
        const idx = INTERVALS.indexOf(interval as any);
        if (idx < INTERVALS.length - 1) {
          setInterval(INTERVALS[idx + 1]);
        }
        return { candles: [], devTrades: [] };
      }
      // Density-based auto-upgrade: if we got more than 150 candles and
      // the user hasn't manually picked an interval, bump up so candles
      // render distinct (pump.fun's default density). Without this, an
      // old token at 1s gives thousands of sub-pixel bars.
      if (
        !userPickedIntervalRef.current &&
        Array.isArray(data?.candles) &&
        data.candles.length > 150
      ) {
        const idx = INTERVALS.indexOf(interval as any);
        if (idx < INTERVALS.length - 1) {
          setInterval(INTERVALS[idx + 1]);
        }
      }
      return data;
    },
    enabled: !!mint,
    refetchInterval: 10000,
  });

  const getMultiplier = useCallback(() => {
    const usdRate = solPrice || 0;
    if (viewMode === "mcap") {
      return currency === "usd"
        ? totalSupply * (usdRate || 1)
        : totalSupply;
    }
    return currency === "usd" ? (usdRate || 1) : 1;
  }, [viewMode, currency, solPrice, totalSupply]);

  const getFormatter = useCallback(() => {
    if (viewMode === "mcap") {
      return currency === "usd" ? formatMcap : formatSolMcap;
    }
    return currency === "usd" ? formatUsdPrice : formatSolPrice;
  }, [viewMode, currency]);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const formatter = getFormatter();

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
        // Leave 24% at the bottom for the volume histogram pane.
        scaleMargins: { top: 0.05, bottom: 0.24 },
        entireTextOnly: true,
        autoScale: true,
        mode: logScale ? 1 : 0, // 0 = Normal, 1 = Logarithmic
      },
      timeScale: {
        borderColor: "rgba(42, 46, 57, 0.6)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 6,
        minBarSpacing: 0.5,
        // Allow scrolling/zooming past the data edges so we can have
        // the pump.fun-style empty canvas to the left of the first bar.
        fixLeftEdge: false,
        fixRightEdge: false,
      },
      width: chartContainerRef.current.clientWidth,
      height: 460,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
      borderVisible: false,
      priceFormat: {
        type: "custom",
        formatter: (price: number) => formatter(price),
        minMove: 0.0000000001,
      },
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });

    // Volume pane at the bottom - now visible with a thin scale, like pump.fun's
    // clearly-readable histogram at the bottom of the chart.
    chart.priceScale("vol").applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
      visible: true,
      borderColor: "rgba(42, 46, 57, 0.6)",
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
  }, [privateMode, getFormatter, logScale]);

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

    const mult = getMultiplier();

    const candleData = ohlcData.candles.map(c => ({
      time: c.time as any,
      open: c.open * mult,
      high: c.high * mult,
      low: c.low * mult,
      close: c.close * mult,
    }));

    const volumeData = ohlcData.candles.map(c => ({
      time: c.time as any,
      value: c.volume,
      color: c.close >= c.open
        ? "rgba(38, 166, 154, 0.65)"
        : "rgba(239, 83, 80, 0.65)",
    }));

    candleSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volumeData);

    // Trade markers: pump.fun-style. To avoid overlap clutter we group
    // markers per-bucket - one marker per (bucket, side) summarising the
    // total SOL traded in that bucket. Dev trades always get a gold "C".
    if (showBubbles && ohlcData.allTrades && ohlcData.allTrades.length > 0) {
      // Bucket trades by candle time + side so multiple trades in one
      // bucket collapse into a single marker (matches pump.fun's "DB" /
      // "C" badges - one per bucket, not one per fill).
      const intervalSecMap: Record<string, number> = {
        "1s": 1, "15s": 15, "30s": 30,
        "1m": 60, "5m": 300, "15m": 900, "30m": 1800,
        "1h": 3600, "4h": 14400, "1D": 86400,
      };
      const bucketSec = intervalSecMap[interval] || 300;
      type Bucket = { time: number; type: string; sumSol: number; lastPrice: number; hasDev: boolean };
      const grouped = new Map<string, Bucket>();
      for (const t of ohlcData.allTrades) {
        const bucketTime = Math.floor(t.time / bucketSec) * bucketSec;
        // Group by bucket + side only - one marker per (bucket, side).
        // If any trade in the group is from the creator the whole bucket
        // gets the gold "C" treatment.
        const key = `${bucketTime}-${t.type}`;
        const ex = grouped.get(key);
        if (ex) {
          ex.sumSol += t.solAmount;
          ex.lastPrice = t.price;
          if (t.isDev) ex.hasDev = true;
        } else {
          grouped.set(key, { time: bucketTime, type: t.type, sumSol: t.solAmount, lastPrice: t.price, hasDev: t.isDev });
        }
      }
      // Clear native markers - we render our own coin-pill badges as
      // an HTML overlay on top of the chart.
      candleSeriesRef.current.setMarkers([]);
      const newBadges: Badge[] = Array.from(grouped.values()).map((b, idx): Badge => {
        const solStr = b.sumSol >= 1_000_000
          ? `${(b.sumSol / 1_000_000).toFixed(1)}M`
          : b.sumSol >= 1000
          ? `${(b.sumSol / 1000).toFixed(1)}K`
          : b.sumSol >= 10 ? b.sumSol.toFixed(0)
          : b.sumSol.toFixed(2);
        const kind: Badge["kind"] = b.hasDev
          ? (b.type === "buy" ? "DB" : "DS")
          : (b.type === "buy" ? "B" : "S");
        return {
          id: `b-${b.time}-${b.type}-${idx}`,
          time: b.time,
          price: b.lastPrice * getMultiplier(),
          kind,
          side: (b.type === "buy" ? "buy" : "sell"),
          label: solStr,
          size: b.hasDev ? 24 : 18,
        };
      }).sort((a, b) => a.time - b.time);
      setBadges(newBadges);
    } else if (showBubbles && ohlcData.devTrades.length > 0) {
      candleSeriesRef.current.setMarkers([]);
      const newBadges: Badge[] = ohlcData.devTrades.map((t, idx): Badge => ({
        id: `dev-${t.time}-${t.type}-${idx}`,
        time: t.time,
        price: t.price * getMultiplier(),
        kind: "C" as const,
        side: (t.type === "buy" ? "buy" : "sell"),
        label: t.solAmount.toFixed(2),
        size: 24,
      })).sort((a, b) => a.time - b.time);
      setBadges(newBadges);
    } else {
      candleSeriesRef.current.setMarkers([]);
      setBadges([]);
    }

    // Current price horizontal line + ATH line - the dotted reference
    // lines pump.fun shows. Replaced on each data update.
    if (priceLineRef.current) {
      candleSeriesRef.current.removePriceLine(priceLineRef.current);
      priceLineRef.current = null;
    }
    if (athLineRef.current) {
      candleSeriesRef.current.removePriceLine(athLineRef.current);
      athLineRef.current = null;
    }
    if (candleData.length > 0) {
      const last = candleData[candleData.length - 1];
      const ath = candleData.reduce((m, c) => Math.max(m, c.high), 0);
      priceLineRef.current = candleSeriesRef.current.createPriceLine({
        price: last.close,
        color: last.close >= last.open ? "#26a69a" : "#ef5350",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
      if (ath > last.close * 1.01) {
        athLineRef.current = candleSeriesRef.current.createPriceLine({
          price: ath,
          color: "rgba(245, 158, 11, 0.7)",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: "ATH",
        });
      }
    }

    if (candleData.length > 0 && didAnchorRef.current !== interval) {
      // pump.fun-style anchor: ALL candles visible AND squeezed into the
      // right ~60% of the chart, leaving ~40% empty pre-history canvas
      // on the left. Now that fixLeftEdge/fixRightEdge are off, the
      // chart actually respects setVisibleLogicalRange.
      // Only fires once per (interval, token) change so 10s data refreshes
      // don't snap users back when they've panned to inspect a region.
      const dataLen = candleData.length;
      // Empty left space = ~67% of dataLen, so data ends up filling the
      // right 60% (dataLen / (dataLen + 0.67*dataLen) = 60%).
      const emptyLeft = Math.max(Math.round(dataLen * 0.67), 5);
      chartRef.current?.timeScale().setVisibleLogicalRange({
        from: -emptyLeft,
        to: dataLen - 1 + 3,
      });
      didAnchorRef.current = interval;
    }
  }, [ohlcData, getMultiplier, showBubbles, getFormatter, interval]);

  // Reset the anchor flag when interval changes so the new interval gets
  // its initial anchor applied on next data load.
  useEffect(() => {
    didAnchorRef.current = null;
  }, [interval, mint]);

  // Recompute badge pixel positions whenever badges change, the visible
  // range scrolls/zooms, or the chart resizes. Uses lightweight-charts'
  // coordinate APIs to translate (time, price) -> (x, y) inside the
  // chart canvas, so our HTML overlay stays glued to the candles.
  // Throttled with requestAnimationFrame and shallow-equality guarded
  // so rapid pan/zoom callbacks don't thrash React.
  useEffect(() => {
    const chart = chartRef.current;
    const series = candleSeriesRef.current;
    if (!chart || !series) return;

    let rafId: number | null = null;
    const computeNow = () => {
      rafId = null;
      const next: Record<string, { x: number; y: number }> = {};
      const ts = chart.timeScale();
      for (const b of badges) {
        const x = ts.timeToCoordinate(b.time as any);
        const y = series.priceToCoordinate(b.price);
        if (x != null && y != null) {
          next[b.id] = { x, y };
        }
      }
      setBadgePositions(prev => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length === nextKeys.length) {
          let same = true;
          for (const k of nextKeys) {
            const p = prev[k];
            const n = next[k];
            if (!p || p.x !== n.x || p.y !== n.y) { same = false; break; }
          }
          if (same) return prev;
        }
        return next;
      });
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(computeNow);
    };

    schedule();
    const ts = chart.timeScale();
    ts.subscribeVisibleLogicalRangeChange(schedule);
    const ro = new ResizeObserver(schedule);
    if (chartContainerRef.current) ro.observe(chartContainerRef.current);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      ts.unsubscribeVisibleLogicalRangeChange(schedule);
      ro.disconnect();
    };
  }, [badges, logScale]);

  const hasCandles = ohlcData && ohlcData.candles.length > 0;
  const lastCandle = hasCandles ? ohlcData.candles[ohlcData.candles.length - 1] : null;
  const mult = getMultiplier();
  const fmt = getFormatter();

  const displayCandle = crosshairData || (lastCandle ? {
    open: lastCandle.open * mult,
    high: lastCandle.high * mult,
    low: lastCandle.low * mult,
    close: lastCandle.close * mult,
    volume: lastCandle.volume,
  } : null);

  const pctChange = displayCandle && displayCandle.open > 0
    ? ((displayCandle.close - displayCandle.open) / displayCandle.open * 100)
    : 0;
  const isUp = pctChange >= 0;

  const calcChange = (seconds: number): number => {
    if (!ohlcData || !lastCandle) return 0;
    const now = lastCandle.time;
    const target = now - seconds;
    const past = ohlcData.candles.filter(c => c.time <= target);
    const ref = past.length > 0 ? past[past.length - 1] : ohlcData.candles[0];
    if (!ref || ref.close === 0) return 0;
    return ((lastCandle.close - ref.close) / ref.close) * 100;
  };

  const change5m = calcChange(300);
  const change1h = calcChange(3600);
  const change6h = calcChange(21600);

  return (
    <div className="bg-[#131722] rounded-lg overflow-hidden" data-testid="trading-chart">
      {/* Top toolbar - like pump.fun */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1 border-b border-[#2a2e39]">
        <div className="flex items-center gap-1">
          {INTERVALS.map(i => (
            <button
              key={i}
              onClick={() => { userPickedIntervalRef.current = true; setInterval(i); }}
              className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
                interval === i
                  ? "text-white bg-[#2a2e39]"
                  : "text-[#787b86] hover:text-[#d1d4dc]"
              }`}
              data-testid={`button-interval-${i}`}
            >
              {i}
            </button>
          ))}
          <span className="w-px h-4 bg-[#2a2e39] mx-1" />
          <button
            onClick={() => setShowBubbles(!showBubbles)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              showBubbles ? "text-white bg-[#2a2e39]" : "text-[#787b86] hover:text-[#d1d4dc]"
            }`}
            data-testid="button-toggle-bubbles"
            title={showBubbles ? "Hide all trade bubbles" : "Show trade bubbles"}
          >
            {showBubbles ? "Hide bubbles" : "Show bubbles"}
          </button>
          <button
            onClick={() => setLogScale(!logScale)}
            className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
              logScale ? "text-white bg-[#2a2e39]" : "text-[#787b86] hover:text-[#d1d4dc]"
            }`}
            data-testid="button-toggle-logscale"
            title={logScale ? "Switch to linear scale" : "Switch to log scale"}
          >
            {logScale ? "log" : "auto"}
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode(viewMode === "mcap" ? "price" : "mcap")}
            className="px-2 py-0.5 text-[11px] rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors"
            data-testid="button-toggle-view"
          >
            {viewMode === "mcap" ? "Price/MCap" : "Price/MCap"}
          </button>
          <span className="w-px h-4 bg-[#2a2e39]" />
          <button
            onClick={() => setCurrency(currency === "usd" ? "sol" : "usd")}
            className="px-2 py-0.5 text-[11px] rounded text-[#787b86] hover:text-[#d1d4dc] hover:bg-[#2a2e39] transition-colors font-medium"
            data-testid="button-toggle-currency"
          >
            {currency === "usd" ? "USD/SOL" : "USD/SOL"}
          </button>
        </div>
      </div>

      {/* OHLC info line - like pump.fun */}
      <div className="px-3 py-1 text-[11px] leading-relaxed" style={{ fontFamily: "monospace" }}>
        <span className="text-[#787b86]">{tokenSymbol}/SOL {viewMode === "mcap" ? "Market Cap" : "Price"} ({currency.toUpperCase()}) </span>
        {displayCandle && (
          <>
            <span className="text-[#787b86]">O</span>
            <span className="text-[#d1d4dc]">{fmt(displayCandle.open)} </span>
            <span className="text-[#787b86]">H</span>
            <span className="text-[#d1d4dc]">{fmt(displayCandle.high)} </span>
            <span className="text-[#787b86]">L</span>
            <span className="text-[#d1d4dc]">{fmt(displayCandle.low)} </span>
            <span className="text-[#787b86]">C</span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>{fmt(displayCandle.close)} </span>
            <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>
              ({isUp ? "+" : ""}{pctChange.toFixed(2)}%)
            </span>
          </>
        )}
        {displayCandle && displayCandle.volume > 0 && (
          <div className="text-[#787b86]">Volume <span className="text-[#d1d4dc]">{displayCandle.volume.toFixed(2)}</span></div>
        )}
      </div>

      {/* Chart */}
      <div ref={chartContainerRef} className="relative w-full" style={{ minHeight: 350 }}>
        {/* pump.fun-style coin badges overlay - rendered as HTML so we can
            put the letter (DB / DS / C / B / S) inside a styled circle. */}
        {showBubbles && badges.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-10">
            {badges.map(b => {
              const pos = badgePositions[b.id];
              if (!pos) return null;
              // pump.fun coin palette:
              //  C/DB/DS = creator-related, purple
              //  B = regular buy, teal
              //  S = regular sell, soft red
              const isCreator = b.kind === "C" || b.kind === "DB" || b.kind === "DS";
              const fill = isCreator
                ? "#a855f7"
                : b.kind === "B"
                ? "#2dd4bf"
                : "#f87171";
              const ring = isCreator
                ? "#6b21a8"
                : b.kind === "B"
                ? "#0d9488"
                : "#b91c1c";
              // Buys sit just below the candle, sells just above.
              const isBuy = b.side === "buy";
              const yOffset = isBuy ? 14 : -14 - b.size;
              return (
                <div
                  key={b.id}
                  className="absolute flex flex-col items-center select-none"
                  style={{
                    left: pos.x - b.size / 2,
                    top: pos.y + yOffset,
                  }}
                  data-testid={`badge-${b.kind}-${b.time}`}
                >
                  <div
                    className="rounded-full flex items-center justify-center font-bold text-white"
                    style={{
                      width: b.size,
                      height: b.size,
                      backgroundColor: fill,
                      border: `1.5px solid ${ring}`,
                      fontSize: b.size <= 18 ? 8 : 9,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
                      lineHeight: 1,
                    }}
                  >
                    {b.kind}
                  </div>
                  <span
                    className="mt-0.5 text-[9px] font-semibold whitespace-nowrap"
                    style={{ color: fill, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}
                  >
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!hasCandles && (
          <div className="h-[350px] flex items-center justify-center text-sm text-[#787b86]">
            No trade data yet
          </div>
        )}
      </div>

      {/* Bottom stats bar - like pump.fun */}
      {lastCandle && (
        <div className="flex items-center border-t border-[#2a2e39] divide-x divide-[#2a2e39] text-center">
          <div className="flex-1 py-2 px-1">
            <div className="text-[10px] text-[#787b86]">Vol 24h</div>
            <div className="text-[12px] text-[#d1d4dc] font-medium">
              {(() => {
                const now = Math.floor(Date.now() / 1000);
                const vol24h = ohlcData?.candles
                  .filter(c => c.time > now - 86400)
                  .reduce((sum, c) => sum + c.volume, 0) || 0;
                return vol24h > 0 ? `${vol24h.toFixed(1)} SOL` : "--";
              })()}
            </div>
          </div>
          <div className="flex-1 py-2 px-1">
            <div className="text-[10px] text-[#787b86]">{viewMode === "mcap" ? "MCap" : "Price"}</div>
            <div className="text-[12px] text-[#d1d4dc] font-medium">
              {fmt(lastCandle.close * mult)}
            </div>
          </div>
          <div className="flex-1 py-2 px-1">
            <div className="text-[10px] text-[#787b86]">5m</div>
            <div className={`text-[12px] font-medium ${change5m >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
              {change5m >= 0 ? "+" : ""}{change5m.toFixed(2)}%
            </div>
          </div>
          <div className="flex-1 py-2 px-1">
            <div className="text-[10px] text-[#787b86]">1h</div>
            <div className={`text-[12px] font-medium ${change1h >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
              {change1h >= 0 ? "+" : ""}{change1h.toFixed(2)}%
            </div>
          </div>
          <div className="flex-1 py-2 px-1">
            <div className="text-[10px] text-[#787b86]">6h</div>
            <div className={`text-[12px] font-medium ${change6h >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}`}>
              {change6h >= 0 ? "+" : ""}{change6h.toFixed(2)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
