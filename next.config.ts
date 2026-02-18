import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // better-sqlite3はサーバーサイドのみで使用
      config.externals = [...(config.externals || []), 'better-sqlite3'];
    }
    return config;
  },
  // データベースファイルのパスをVercel用に設定
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
