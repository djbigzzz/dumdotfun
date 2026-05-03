import { useState } from "react";
import { Lock, Loader2, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useWallet } from "@/lib/wallet-context";

interface CloakShieldButtonProps {
  marketId: string;
  recipientWallet: string;
  amountSol: number;
  className?: string;
}

interface CloakQuote {
  cloakRef: string;
  encryptedAmount: string;
  proofHash: string;
  estimatedFee: string;
  expiresAt: number;
}

export function CloakShieldButton({
  marketId,
  recipientWallet,
  amountSol,
  className = "",
}: CloakShieldButtonProps) {
  const { ensureSession } = useWallet();
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<CloakQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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
      if (!body.quote) throw new Error(body.error || "no quote returned");
      setQuote(body.quote);
    } catch (err: any) {
      setError(err?.message || "shield payout failed");
    } finally {
      setLoading(false);
    }
  };

  const copyRef = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!quote) return;
    navigator.clipboard.writeText(quote.cloakRef).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (quote) {
    return (
      <div
        className={`inline-flex flex-col gap-1 px-2 py-1 border-2 border-black bg-green-100 ${className}`}
        data-testid={`cloak-quote-${marketId}`}
      >
        <div className="flex items-center gap-1 text-[10px] font-black uppercase">
          <CheckCircle2 className="w-3 h-3" />
          shielded
          <button
            onClick={copyRef}
            className="ml-1 hover:underline font-mono normal-case"
            data-testid={`button-copy-cloak-ref-${marketId}`}
            aria-label="copy cloak ref"
          >
            {quote.cloakRef.slice(0, 14)}...
            <Copy className="w-2.5 h-2.5 inline ml-0.5" />
          </button>
        </div>
        <div className="text-[9px] font-mono opacity-70">
          fee ~{quote.estimatedFee} SOL {copied && <span className="text-green-700 font-bold">copied</span>}
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
        title="Generate a confidential payout quote via Cloak"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
        shield with cloak
      </button>
      {error && (
        <div
          className="inline-flex items-center gap-1 text-[9px] font-bold text-red-700"
          data-testid={`cloak-error-${marketId}`}
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </div>
      )}
    </div>
  );
}
