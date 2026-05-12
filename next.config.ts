import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // @ts-expect-error: reactCompiler not yet in type definitions
    reactCompiler: true,
  },
};

export default nextConfig;
