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
      <head>
        <title>AN-KAN - YS案件管理</title>
        <meta name="theme-color" content="#c8463a" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=IBM+Plex+Mono:wght@400;500&display=swap"
        />
      </head>
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
