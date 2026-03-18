import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mapbox-gl is client-only (uses window/document)
  // Mark as external for server to prevent SSR resolution
  serverExternalPackages: ['mapbox-gl'],
};

export default nextConfig;
