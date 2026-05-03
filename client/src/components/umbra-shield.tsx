import { useId, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Shield, Eye, EyeOff, Loader2, Check } from "lucide-react";

interface UmbraPool {
  id: string;
  tokenMint: string;
  tokenSymbol: string;
  totalShielded: string;
  anonymitySet: number;
  active: boolean;
}

interface ShieldQuote {
  stealthAddress: string;
  estimatedFee: string;
  privacyScore: number;
  routingHops: number;
  expiresAt: number;
  umbraRef: string;
}

interface UmbraShieldProps {
  tokenMint: string;
  tokenSymbol: string;
  senderWallet: string | null;
  privateMode?: boolean;
}

export function UmbraShield({ tokenMint, tokenSymbol, senderWallet, privateMode }: UmbraShieldProps) {
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<ShieldQuote | null>(null);
  const baseId = useId();
  const panelId = `${baseId}-panel`;
  const recipientId = `${baseId}-recipient`;
  const amountId = `${baseId}-amount`;

  const { data: poolData } = useQuery<{ pools: UmbraPool[] }>({
    queryKey: ["umbra-pool", tokenMint],
    queryFn: async () => {
      const r = await fetch(`/api/umbra/pools?tokenMint=${tokenMint}`);
      if (!r.ok) throw new Error("pool fetch failed");
      return r.json();
    },
    enabled: open,
    staleTime: 60_000,
  });
  const pool = poolData?.pools?.[0];

  const shield = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/umbra/shield", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderWallet, recipientWallet: recipient, tokenMint, amount }),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || "shield request failed");
      }
      return r.json();
    },
    onSuccess: (data) => setQuote(data.quote),
  });

  const valid =
    senderWallet &&
    recipient.length >= 32 &&
    recipient.length <= 44 &&
    parseFloat(amount) > 0;

  return (
    <div
      className={`border-4 ${privateMode ? "border-[#4ADE80] bg-zinc-900" : "border-black bg-white"} shadow-[6px_6px_0_0_rgba(0,0,0,0.85)]`}
      data-testid="card-umbra-shield"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 font-black uppercase tracking-tight ${privateMode ? "text-[#4ADE80] hover:bg-zinc-800" : "text-black hover:bg-yellow-100"}`}
        data-testid="button-toggle-umbra"
      >
        <span className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Private transfer (Umbra)
        </span>
        <span className="text-[10px] font-bold opacity-60">
          {open ? "▲ hide" : "▼ shield ▼"}
        </span>
      </button>

      {open && (
        <div id={panelId} className={`p-4 border-t-4 ${privateMode ? "border-[#4ADE80]" : "border-black"} space-y-3`}>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="font-bold uppercase tracking-wide opacity-70">anonymity set</span>
              <span className="font-mono font-bold">{pool?.anonymitySet ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold uppercase tracking-wide opacity-70">total shielded</span>
              <span className="font-mono font-bold">{pool?.totalShielded ?? "-"} {tokenSymbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold uppercase tracking-wide opacity-70">routing hops</span>
              <span className="font-mono font-bold">3</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={recipientId} className="block text-[11px] font-black uppercase tracking-wider opacity-80">
              recipient (visible only to you)
            </label>
            <input
              id={recipientId}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
              placeholder="Recipient wallet address"
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-3 py-2 font-mono text-sm border-2 ${privateMode ? "border-[#4ADE80] bg-black text-[#4ADE80] placeholder-zinc-600" : "border-black bg-white text-black placeholder-gray-400"}`}
              data-testid="input-umbra-recipient"
            />
            <label htmlFor={amountId} className="block text-[11px] font-black uppercase tracking-wider opacity-80">
              amount {tokenSymbol}
            </label>
            <input
              id={amountId}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              inputMode="decimal"
              className={`w-full px-3 py-2 font-mono text-sm border-2 ${privateMode ? "border-[#4ADE80] bg-black text-[#4ADE80] placeholder-zinc-600" : "border-black bg-white text-black placeholder-gray-400"}`}
              data-testid="input-umbra-amount"
            />
          </div>

          <button
            onClick={() => shield.mutate()}
            disabled={!valid || shield.isPending}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 font-black uppercase tracking-wide border-2 ${privateMode ? "border-[#4ADE80] bg-[#4ADE80] text-black" : "border-black bg-purple-500 text-white"} disabled:opacity-40 disabled:cursor-not-allowed shadow-[3px_3px_0_0_rgba(0,0,0,0.85)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_rgba(0,0,0,0.85)] transition-all`}
            data-testid="button-shield-transfer"
          >
            {shield.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : quote ? (
              <Check className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
            {quote ? "stealth quote ready" : shield.isPending ? "generating..." : "shield transfer"}
          </button>

          {shield.error && (
            <div role="alert" aria-live="polite" className="text-xs font-bold text-red-600 bg-red-50 border-2 border-red-600 px-3 py-2">
              {(shield.error as Error).message}
            </div>
          )}

          {quote && (
            <div role="status" aria-live="polite" className={`text-xs space-y-1 p-3 border-2 ${privateMode ? "border-[#4ADE80] bg-black" : "border-black bg-yellow-50"}`} data-testid="text-umbra-quote">
              <div className="flex justify-between">
                <span className="font-bold uppercase">stealth address</span>
                <span className="font-mono">{quote.stealthAddress.slice(0, 8)}...{quote.stealthAddress.slice(-6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase">privacy score</span>
                <span className="font-mono font-black">{quote.privacyScore}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold uppercase">est. fee</span>
                <span className="font-mono">{quote.estimatedFee} SOL</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] mt-2 opacity-70">
                <Eye className="w-3 h-3" />
                amount + recipient hidden on-chain
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
