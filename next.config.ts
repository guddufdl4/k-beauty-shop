import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "xlsx", "@imgly/background-removal-node", "onnxruntime-node"],
  experimental: {
    optimizePackageImports: ["next-intl"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/.next/**", "**/.next.bak-build/**", "**/node_modules/**"],
      };
    }

    return config;
  },
};

export default withNextIntl(nextConfig);
