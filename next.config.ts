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

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "xlsx", "@imgly/background-removal-node", "onnxruntime-node"],
  images: supabaseHostname
    ? {
        remotePatterns: [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ],
      }
    : undefined,
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
