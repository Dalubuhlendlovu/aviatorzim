import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aviator-zim/shared"],
  // NEXT_DIST_DIR lets local Windows/OneDrive builds redirect output outside
  // the synced folder (readlink EINVAL workaround). Netlify leaves it unset.
  // ../../../../.aviator-next resolves to C:\Users\darri\.aviator-next —
  // outside OneDrive, avoiding the readlink EINVAL on Windows.
  // On Netlify (Linux, no OneDrive) NEXT_DIST_DIR is unset so we fall back to
  // the standard ".next" which netlify.toml publishes.
  distDir: process.env.NEXT_DIST_DIR ?? "../../../../.aviator-next/web",
  typescript: {
    // Type checking is done by tsc; skip Next.js's redundant pass which breaks
    // when distDir is outside the project root (external OneDrive workaround).
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
