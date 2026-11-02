import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackRustReactCompiler: true,
    turbopackGc: true,
    turbopackLazyDynamicImports: true,
    turbopackPluginRuntimeStrategy: "workerThreads",
    turbopackChunking: {
      generateComponentChunks: true,
    },
  },
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  typedRoutes: true,
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
