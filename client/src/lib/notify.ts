import { toast } from "sonner";

const SOLSCAN_BASE = "https://solscan.io";
const CLUSTER_QS = "?cluster=devnet";

const txUrl = (sig: string) => `${SOLSCAN_BASE}/tx/${sig}${CLUSTER_QS}`;

const openTx = (sig: string) => {
  if (typeof window !== "undefined") window.open(txUrl(sig), "_blank", "noopener,noreferrer");
};

type TxKind = "buy" | "sell" | "bet" | "launch" | "claim" | "transfer";

const KIND_LABEL: Record<TxKind, { building: string; signing: string; submitting: string; done: string }> = {
  buy:      { building: "Preparing your buy",        signing: "Approve in wallet",          submitting: "Buy submitted",        done: "Buy confirmed" },
  sell:     { building: "Preparing your sell",       signing: "Approve in wallet",          submitting: "Sell submitted",       done: "Sell confirmed" },
  bet:      { building: "Preparing your bet",        signing: "Approve in wallet",          submitting: "Bet submitted",        done: "Bet placed" },
  launch:   { building: "Preparing your launch",     signing: "Approve in wallet",          submitting: "Launch submitted",     done: "Token launched" },
  claim:    { building: "Preparing your claim",      signing: "Approve in wallet",          submitting: "Claim submitted",      done: "Claim confirmed" },
  transfer: { building: "Preparing your transfer",   signing: "Approve in wallet",          submitting: "Transfer submitted",   done: "Transfer confirmed" },
};

export interface TxToast {
  id: string | number;
  building: (msg?: string) => void;
  signing: (msg?: string) => void;
  submitting: (msg?: string) => void;
  success: (opts: { signature: string; description?: string; durationMs?: number }) => void;
  error: (msg: string) => void;
  dismiss: () => void;
}

/**
 * Single toast that progresses through the lifecycle of a transaction.
 * Replaces the old 3-4-toast chatter with one in-place updating notification.
 */
export function txToast(kind: TxKind, initialDescription?: string): TxToast {
  const labels = KIND_LABEL[kind];
  const id = toast.loading(labels.building, {
    description: initialDescription,
    duration: Infinity,
  });

  return {
    id,
    building: (msg?: string) => toast.loading(labels.building, { id, description: msg ?? initialDescription, duration: Infinity }),
    signing:  (msg?: string) => toast.loading(labels.signing,  { id, description: msg ?? "Confirm the transaction in your wallet", duration: Infinity }),
    submitting: (msg?: string) => toast.loading(labels.submitting, { id, description: msg ?? "Broadcasting to Solana devnet...", duration: Infinity }),
    success: ({ signature, description, durationMs }) => {
      toast.success(labels.done, {
        id,
        description: description ?? `Tx ${signature.slice(0, 6)}...${signature.slice(-4)}`,
        duration: durationMs ?? 6000,
        action: {
          label: "View",
          onClick: () => openTx(signature),
        },
      });
    },
    error: (msg: string) => {
      toast.error("Transaction failed", { id, description: msg, duration: 6500 });
    },
    dismiss: () => toast.dismiss(id),
  };
}

/**
 * Celebratory points award toast - distinct gold/sparkle styling,
 * shown briefly so it doesn't compete with the main success toast.
 */
export function pointsAwarded(points: number, reason: string) {
  toast.success(`+${points.toLocaleString()} pts`, {
    description: reason,
    duration: 3500,
    className: "dum-toast-points",
  });
}

/**
 * Quest claim / streak / login - similar to points but with a distinct icon hint via reason text.
 */
export function questClaimed(points: number, questLabel: string, streak?: number) {
  toast.success(`+${points} pts claimed!`, {
    description: streak ? `${questLabel} - ${streak} day streak` : questLabel,
    duration: 4000,
    className: "dum-toast-points",
  });
}

/**
 * Rich bet confirmation. Shows side, stake, potential payout, plus
 * a "View market" action that takes the user to the position.
 */
export function betPlaced(opts: {
  side: "yes" | "no";
  amountSol: number;
  potentialPayoutSol?: number;
  marketHref?: string;
  signature?: string;
  shareText?: string;
  shareUrl?: string;
}) {
  const { side, amountSol, potentialPayoutSol, marketHref, signature, shareText, shareUrl } = opts;
  const sideLabel = side.toUpperCase();
  const payoutText = potentialPayoutSol && potentialPayoutSol > amountSol
    ? `Stake ${amountSol.toFixed(3)} SOL - max payout ~${potentialPayoutSol.toFixed(3)} SOL`
    : `Stake ${amountSol.toFixed(3)} SOL on ${sideLabel}`;

  let action: { label: string; onClick: () => void } | undefined;
  if (shareText && shareUrl && typeof window !== "undefined") {
    action = {
      label: "Brag on X",
      onClick: () => window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
        "_blank",
        "noopener,noreferrer"
      ),
    };
  } else if (signature) {
    action = { label: "View tx", onClick: () => openTx(signature) };
  } else if (marketHref && typeof window !== "undefined") {
    action = { label: "View market", onClick: () => { window.location.href = marketHref; } };
  }

  toast.success(`${sideLabel} bet placed`, {
    description: payoutText,
    duration: 6000,
    action,
  });
}

/**
 * Friendly error mapping for common Solana / bonding-curve failures.
 * Returns a user-readable string from a raw error message.
 */
export function friendlyError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw ?? "");
  if (!msg) return "Something went wrong. Please try again.";
  if (msg.includes("User rejected") || msg.includes("rejected")) return "Transaction cancelled in wallet.";
  if (msg.includes("subtract with overflow") || msg.includes("panicked")) return "Not enough liquidity in the curve for that size. Try a smaller amount.";
  if (msg.includes("InsufficientLiquidity")) return "Bonding curve is low on SOL. Try a smaller amount.";
  if (msg.includes("SlippageExceeded")) return "Price moved too much - try again.";
  if (msg.includes("InsufficientFundsForRent") || msg.includes("insufficient lamports")) return "Not enough SOL for transaction fees. Top up your devnet wallet.";
  if (msg.includes("blockhash not found") || msg.includes("BlockhashNotFound")) return "Network busy - please retry.";
  if (msg.length > 160) return "Transaction failed. Please try again.";
  return msg;
}

export { openTx, txUrl };
