import { useQuery } from "@tanstack/react-query";
import { Zap, Loader2, AlertCircle } from "lucide-react";

interface MagicBlockStatus {
  live?: {
    reachable: boolean;
    slot: number | null;
    latencyMs: number | null;
    error?: string;
  };
}

interface MagicBlockBadgeProps {
  className?: string;
}

export function MagicBlockBadge({ className = "" }: MagicBlockBadgeProps) {
  const { data, isLoading } = useQuery<MagicBlockStatus>({
    queryKey: ["magicblock-status"],
    queryFn: async () => {
      const r = await fetch("/api/magicblock/status");
      if (!r.ok) throw new Error("magicblock status failed");
      return r.json();
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const live = data?.live;
  const reachable = !!live?.reachable;
  const latency = live?.latencyMs;

  return (
    <a
      href="https://docs.magicblock.gg"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border-2 border-black ${reachable ? "bg-yellow-300 text-black" : "bg-zinc-200 text-zinc-600"} ${className}`}
      data-testid="badge-magicblock-live"
      aria-label={reachable ? `MagicBlock ER live, ${latency}ms latency` : "MagicBlock ER unreachable"}
      title={live?.error ? `MagicBlock ER: ${live.error}` : reachable ? `slot ${live?.slot} - ${latency}ms` : "MagicBlock ER offline"}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : reachable ? (
        <Zap className="w-3 h-3" />
      ) : (
        <AlertCircle className="w-3 h-3" />
      )}
      <span>magicblock</span>
      {reachable && typeof latency === "number" && (
        <span className="font-mono opacity-70">{latency}ms</span>
      )}
    </a>
  );
}
