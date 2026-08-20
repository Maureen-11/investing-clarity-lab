import type { NextConfig } from "next";

const publicBasePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(process.env.MAINLAND_EXPORT === "1"
    ? {
        output: "export" as const,
        trailingSlash: true,
        basePath: publicBasePath,
        images: { unoptimized: true },
        // The mainland bundle never imports the Cloudflare-only database layer.
        // The regular Sites build remains the source-of-truth type check.
        typescript: { ignoreBuildErrors: true },
      }
    : {}),
};

export default nextConfig;
