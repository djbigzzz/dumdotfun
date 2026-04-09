import { useQuery } from "@tanstack/react-query";

interface SnsResolveResult {
  address: string;
  domain: string | null;
}

interface SnsLookupResult {
  domain: string;
  address: string | null;
}

export function useSnsName(address: string | null | undefined) {
  return useQuery<SnsResolveResult>({
    queryKey: ["sns-resolve", address],
    queryFn: async () => {
      const res = await fetch(`/api/sns/resolve/${address}`);
      if (!res.ok) throw new Error("Failed to resolve SNS name");
      return res.json();
    },
    enabled: !!address && address.length >= 32,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}

export function useSnsLookup(domain: string | null | undefined) {
  const normalized = domain?.toLowerCase().trim() ?? "";
  const isSolDomain = normalized.endsWith(".sol") && normalized.length > 4;

  return useQuery<SnsLookupResult>({
    queryKey: ["sns-lookup", normalized],
    queryFn: async () => {
      const res = await fetch(`/api/sns/lookup/${encodeURIComponent(normalized)}`);
      if (!res.ok) throw new Error("Failed to lookup SNS domain");
      return res.json();
    },
    enabled: isSolDomain,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: false,
  });
}
