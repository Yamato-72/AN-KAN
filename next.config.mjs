/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",   // ← これが重要（静的エクスポート禁止）
  experimental: {
    serverActions: {
      allowedOrigins: ["*"],
    },
  },
  serverExternalPackages: ["pg"],  // ← Cloud Run で PostgreSQL を使うとき必要
};

export default nextConfig;
