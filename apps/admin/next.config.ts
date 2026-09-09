import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@leadmagnet/db", "@leadmagnet/shared"],
  serverExternalPackages: ["postgres", "bcryptjs"],
  poweredByHeader: false,
};

export default nextConfig;
