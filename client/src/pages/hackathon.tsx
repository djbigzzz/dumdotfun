import { Layout } from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Trophy, ExternalLink, Loader2, CheckCircle2, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { MagicBlockBadge } from "@/components/magicblock-badge";

function isSafeHttpUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
import { usePageTitle } from "@/hooks/use-page-title";

interface UseCase {
  name: string;
  description: string;
  status: string;
}

interface Track {
  id: string;
  name: string;
  prize: string;
  status: string;
  routes: string[];
  summary?: string;
  detail?: {
    docs?: string;
    hackathonTrack?: string;
    features?: string[];
    useCases?: UseCase[];
  };
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; icon: typeof CheckCircle2 }> = {
  live: { bg: "bg-green-500", text: "text-white", label: "LIVE", icon: CheckCircle2 },
  "integration-ready": { bg: "bg-yellow-400", text: "text-black", label: "INTEGRATION READY", icon: Clock },
  "program-ready": { bg: "bg-purple-500", text: "text-white", label: "PROGRAM READY", icon: ShieldCheck },
  "audit-applied": { bg: "bg-blue-500", text: "text-white", label: "AUDIT APPLIED", icon: ShieldCheck },
};

export default function HackathonPage() {
  usePageTitle("Hackathon Tracks - Dum.fun");
  const { data, isLoading, isError, error, refetch } = useQuery<{ tracks: Track[] }>({
    queryKey: ["hackathon-integrations"],
    queryFn: async () => {
      const r = await fetch("/api/hackathon/integrations");
      if (!r.ok) throw new Error("failed to load tracks");
      return r.json();
    },
  });

  const tracks = data?.tracks ?? [];
  const totalPrize = tracks.reduce((sum, t) => {
    const m = t.prize.match(/\$([\d,]+)/);
    return sum + (m ? parseInt(m[1].replace(/,/g, ""), 10) : 0);
  }, 0);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-4 border-black bg-yellow-300 p-6 shadow-[8px_8px_0_0_rgba(0,0,0,0.85)]"
        >
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8" />
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight" data-testid="text-hackathon-title">
              Colosseum Frontier 2026
            </h1>
          </div>
          <p className="text-sm md:text-base font-bold opacity-80">
            Dum.fun integration surface across {tracks.length} hackathon tracks · target prize pool ${totalPrize.toLocaleString()}+
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <MagicBlockBadge />
            <span className="text-[10px] font-mono opacity-60">live ER ping every 30s</span>
          </div>
        </motion.div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}

        {isError && (
          <div role="alert" className="border-4 border-black bg-red-100 p-4 flex items-center justify-between gap-3" data-testid="error-hackathon">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold text-sm">Failed to load tracks: {(error as Error)?.message ?? "unknown error"}</span>
            </div>
            <button
              onClick={() => refetch()}
              className="text-xs font-black uppercase border-2 border-black px-3 py-1 bg-white hover:bg-black hover:text-white"
              data-testid="button-retry-hackathon"
            >
              retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tracks.map((track, i) => {
            const style = STATUS_STYLES[track.status] ?? STATUS_STYLES["integration-ready"];
            const StatusIcon = style.icon;
            const primaryRoute = track.routes[0];
            const features = track.detail?.features ?? [];
            const useCases = track.detail?.useCases ?? [];

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-4 border-black bg-white shadow-[6px_6px_0_0_rgba(0,0,0,0.85)] flex flex-col"
                data-testid={`card-track-${track.id}`}
              >
                <div className="p-4 border-b-4 border-black flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-black uppercase truncate" data-testid={`text-track-name-${track.id}`}>
                        {track.name}
                      </h2>
                      <span className="text-xs font-mono font-black bg-black text-white px-2 py-0.5">
                        {track.prize}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-black uppercase tracking-wider border-2 border-black ${style.bg} ${style.text} flex-shrink-0`}
                    data-testid={`status-${track.id}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {style.label}
                  </span>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  {track.summary && (
                    <p className="text-sm leading-relaxed">{track.summary}</p>
                  )}

                  {features.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">Features</div>
                      <ul className="text-xs space-y-1">
                        {features.slice(0, 3).map((f, idx) => (
                          <li key={idx} className="flex gap-2">
                            <span className="opacity-50">▸</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {useCases.length > 0 && (
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-wider opacity-60 mb-1">Use cases</div>
                      <ul className="text-xs space-y-2">
                        {useCases.slice(0, 2).map((uc, idx) => (
                          <li key={idx} className="border-l-2 border-black pl-2">
                            <div className="font-bold">{uc.name}</div>
                            <div className="opacity-70 text-[11px] leading-snug">{uc.description}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-3 border-t-4 border-black bg-zinc-50 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-mono opacity-60 truncate">
                    {track.routes.join(" · ")}
                  </div>
                  <div className="flex items-center gap-2">
                    {isSafeHttpUrl(track.detail?.docs) && (
                      <a
                        href={track.detail!.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black uppercase border-2 border-black px-2 py-1 hover:bg-black hover:text-white"
                        data-testid={`link-docs-${track.id}`}
                      >
                        docs <ExternalLink className="inline w-3 h-3" />
                      </a>
                    )}
                    {primaryRoute && !primaryRoute.includes(":") && (
                      <Link
                        href={primaryRoute}
                        className="text-[10px] font-black uppercase bg-red-500 text-white border-2 border-black px-2 py-1 hover:bg-black"
                        data-testid={`link-demo-${track.id}`}
                      >
                        demo →
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
