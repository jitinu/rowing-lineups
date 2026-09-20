import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Dev previews sit behind a tunnel that forwards the request with a different
// origin than the host; production is served directly and keeps the strict default.
const devOrigins = ["localhost", "localhost:3000", "localhost:3100", "*.preview.devinapps.com"];

const nextConfig: NextConfig = {
  ...(isDev
    ? {
        allowedDevOrigins: devOrigins,
        experimental: { serverActions: { allowedOrigins: devOrigins } },
      }
    : {}),
};

export default nextConfig;
