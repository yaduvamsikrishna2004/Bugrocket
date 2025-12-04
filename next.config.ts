import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cast the entire devIndicators object to 'any' or 'object'
  devIndicators: {
    buildActivity: false,
    // @ts-ignore
    appIsrStatus: false,
  } as any, // 👈 ADD 'as any' here
};

export default nextConfig;
