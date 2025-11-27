import { useMemo } from "react";
import { motion } from "framer-motion";

export function DoomChart({ data }: { data: { time: number; price: number }[] }) {
  // Normalize data for SVG
  const points = useMemo(() => {
    if (data.length === 0) return "";
    const maxPrice = Math.max(...data.map(d => d.price));
    const width = 100;
    const height = 100;
    
    return data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.price / maxPrice) * height;
      return `${x},${y}`;
    }).join(" ");
  }, [data]);

  return (
    <div className="w-full h-64 bg-black border-2 border-red-900 relative overflow-hidden p-2">
      {/* Grid lines */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div key={i} className="border-r border-b border-green-900/20" />
        ))}
      </div>

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <motion.polyline
          points={points}
          fill="none"
          stroke="red"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: "linear" }}
        />
        {/* Glitch duplicate line */}
        <motion.polyline
          points={points}
          fill="none"
          stroke="cyan"
          strokeWidth="1"
          strokeOpacity="0.5"
          vectorEffect="non-scaling-stroke"
          className="translate-x-[2px]"
          animate={{ x: [-2, 2, -1, 1, 0], opacity: [0.5, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 0.2 }}
        />
      </svg>

      {/* Current Price Indicator */}
      <div className="absolute bottom-2 right-2 bg-red-600 text-black font-mono font-bold px-2 text-sm animate-pulse">
        CRASHING
      </div>
    </div>
  );
}
