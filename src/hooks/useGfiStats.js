// src/hooks/useGfiStats.js
"use client";

import { useQuery } from "@tanstack/react-query";

export function useGfiStats() {
  return useQuery({
    queryKey: ["gfi-stats"],
    queryFn: async () => {
      const response = await fetch("/api/gfi/stats");
      if (!response.ok) {
        throw new Error("Failed to fetch GFI statistics");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5分
    refetchOnWindowFocus: true,
  });
}
