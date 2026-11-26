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
    useCacheTimeout: 300,
  },
  reactCompiler: true,
  cacheComponents: true,
  partialPrefetching: true,
  logging: { fetches: { fullUrl: true } },
  reactStrictMode: true,
  typedRoutes: true,
  typescript: { ignoreBuildErrors: true },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
