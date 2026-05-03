import { useState } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/lib/wallet-context";

interface CloakShieldButtonProps {
  marketId: string;
  recipientWallet: string;
  amountSol: number;
  className?: string;
}

interface ShieldedPayout {
  depositSignature: string;
  withdrawSignature: string;
  shieldedAmountLamports: string;
  recipient: string;
  marketId: string;
  programId: string;
  network: "devnet";
  explorerDeposit: string;
  explorerWithdraw: string;
  durationMs: number;
}

export function CloakShieldButton({
  marketId,
  recipientWallet,
  amountSol,
  className = "",
}: CloakShieldButtonProps) {
  const { ensureSession } = useWallet();
  const [loading, setLoading] = useState(false);
  const [payout, setPayout] = useState<ShieldedPayout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"deposit" | "withdraw" | null>(null);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    setLoading(true);
    try {
      try {
        await ensureSession();
      } catch (sessionErr: any) {
        throw new Error(sessionErr?.message || "Wallet sign-in required");
      }
      const res = await apiRequest("POST", "/api/cloak/shield-payout", {
        marketId,
        recipientWallet,
        amountSol,
      });
      const body = await res.json();
      if (!body.payout) throw new Error(body.error || "no payout returned");
      setPayout(body.payout);
    } catch (err: any) {
      setError(err?.message || "shield payout failed");
    } finally {
      setLoading(false);
    }
  };

  const copySig = (sig: string, which: "deposit" | "withdraw") => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(sig).catch(() => {});
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  if (payout) {
    return (
      <div
        className={`inline-flex flex-col gap-1 px-2 py-1 border-2 border-black bg-green-100 ${className}`}
        data-testid={`cloak-payout-${marketId}`}
      >
        <div className="flex items-center gap-1 text-[10px] font-black uppercase">
          <CheckCircle2 className="w-3 h-3" />
          shielded on devnet
        </div>
        <div className="flex flex-col gap-0.5 text-[9px] font-mono">
          <div className="flex items-center gap-1">
            <span className="font-bold uppercase">deposit:</span>
            <a
              href={payout.explorerDeposit}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-cloak-deposit-${marketId}`}
            >
              {payout.depositSignature.slice(0, 10)}...
              <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
            </a>
            <button
              onClick={copySig(payout.depositSignature, "deposit")}
              className="hover:opacity-70"
              data-testid={`button-copy-cloak-deposit-${marketId}`}
              aria-label="copy deposit signature"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
            {copied === "deposit" && <span className="text-green-700 font-bold">copied</span>}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold uppercase">withdraw:</span>
            <a
              href={payout.explorerWithdraw}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
              onClick={(e) => e.stopPropagation()}
              data-testid={`link-cloak-withdraw-${marketId}`}
            >
              {payout.withdrawSignature.slice(0, 10)}...
              <ExternalLink className="w-2.5 h-2.5 inline ml-0.5" />
            </a>
            <button
              onClick={copySig(payout.withdrawSignature, "withdraw")}
              className="hover:opacity-70"
              data-testid={`button-copy-cloak-withdraw-${marketId}`}
              aria-label="copy withdraw signature"
            >
              <Copy className="w-2.5 h-2.5" />
            </button>
            {copied === "withdraw" && <span className="text-green-700 font-bold">copied</span>}
          </div>
          <div className="opacity-60">{(payout.durationMs / 1000).toFixed(1)}s end-to-end</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col items-end gap-1 ${className}`}>
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-1 text-[10px] font-black uppercase border-2 border-black px-2 py-1 bg-purple-300 hover:bg-purple-400 disabled:opacity-50"
        data-testid={`button-cloak-shield-${marketId}`}
        title="Route this payout privately through Cloak's shielded pool on devnet"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
        {loading ? "proving + submitting..." : "shield with cloak"}
      </button>
      {loading && (
        <div className="text-[9px] font-mono opacity-70" data-testid={`cloak-loading-hint-${marketId}`}>
          Groth16 proof can take 30-90s on first run
        </div>
      )}
      {error && (
        <div
          className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700 max-w-[280px]"
          data-testid={`cloak-error-${marketId}`}
        >
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span className="break-words">{error}</span>
        </div>
      )}
    </div>
  );
}
