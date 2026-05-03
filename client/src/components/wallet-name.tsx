import { useSnsName } from "@/hooks/use-sns";

interface WalletNameProps {
  address: string | null | undefined;
  truncate?: number;
  showBadge?: boolean;
  className?: string;
  monoFallback?: boolean;
  testId?: string;
}

function truncateAddr(addr: string, n: number): string {
  if (addr.length <= n * 2 + 3) return addr;
  return `${addr.slice(0, n)}...${addr.slice(-Math.min(4, n))}`;
}

export function WalletName({
  address,
  truncate = 4,
  showBadge = true,
  className = "",
  monoFallback = true,
  testId,
}: WalletNameProps) {
  const { data } = useSnsName(address);
  if (!address) return <span className={className}>-</span>;

  const sns = data?.domain;
  if (sns) {
    return (
      <span
        className={`inline-flex items-center gap-1 ${className}`}
        title={address}
        data-testid={testId}
      >
        <span className="font-bold">{sns}</span>
        {showBadge && (
          <span className="text-[9px] font-black px-1 py-0.5 bg-purple-600 text-white rounded leading-none uppercase tracking-wider">
            sns
          </span>
        )}
      </span>
    );
  }
  return (
    <span
      className={`${monoFallback ? "font-mono" : ""} ${className}`}
      title={address}
      data-testid={testId}
    >
      {truncateAddr(address, truncate)}
    </span>
  );
}
