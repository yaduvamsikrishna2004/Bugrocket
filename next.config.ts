import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false,
    // @ts-ignore
    appIsrStatus: false,
  },
};

export default nextConfig;