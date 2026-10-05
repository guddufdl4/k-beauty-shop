import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const SUPABASE_URL_PATTERN = /https:\/\/[a-z0-9-]+\.supabase\.co/i;

function resolveSupabaseHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    return null;
  }

  const match = raw.match(SUPABASE_URL_PATTERN);
  if (!match?.[0]) {
    return null;
  }

  try {
    return new URL(match[0]).hostname;
  } catch {
    return null;
  }
}

const supabaseHostname = resolveSupabaseHostname();

const imageSettings = {
  formats: ["image/webp"] as Array<"image/avif" | "image/webp">,
  minimumCacheTTL: 2678400,
  deviceSizes: [640, 750, 828, 1080, 1200],
  imageSizes: [64, 96, 128, 256, 384],
};

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "xlsx", "@imgly/background-removal-node", "onnxruntime-node"],
  // Vercel uses Linux x64 CPU inference; cached GPU binaries are not required.
  outputFileTracingExcludes: process.platform === "linux" ? {
    "/*": [
      "node_modules/onnxruntime-node/bin/napi-v3/{darwin,win32}/**/*",
      "node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
      "node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_cuda.so",
      "node_modules/onnxruntime-node/bin/napi-v3/linux/x64/libonnxruntime_providers_tensorrt.so",
    ],
  } : undefined,
  images: supabaseHostname
    ? {
        ...imageSettings,
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : { ...imageSettings },
  experimental: {
    optimizePackageImports: ["next-intl"],
    // Local environments that block child processes can use worker threads.
    workerThreads: process.env.HMT_BUILD_WORKER_THREADS === "1",
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
