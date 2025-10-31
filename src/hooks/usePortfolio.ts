// src/hooks/usePortfolio.ts
import { useQuery } from "@tanstack/react-query";

export const fetchPortfolio = async () => {
  const res = await fetch("/api/portfolio");
  if (!res.ok) throw new Error("Failed to fetch portfolio");
  return res.json();
};

// ✅ React Query v5 syntax: single object argument
export const usePortfolio = (enabled = true) =>
  useQuery({
    queryKey: ["portfolio"],
    queryFn: fetchPortfolio,
    refetchInterval: 15000, // auto-refresh every 15s
    refetchOnWindowFocus: false,
    retry: 1,
    enabled,
  });
