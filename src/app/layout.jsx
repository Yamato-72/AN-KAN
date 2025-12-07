"use client";

import "./globals.css"; // ← これ追加

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                fontSize: "14px",
              },
              duration: 3000,
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
