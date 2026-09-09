import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// 모노레포 루트의 .env 를 로드한다 (Next 는 앱 디렉터리의 .env 만 읽으므로)
loadEnv({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  transpilePackages: ["@leadmagnet/db", "@leadmagnet/shared"],
  serverExternalPackages: ["postgres", "bcryptjs"],
  poweredByHeader: false,
  // Vercel 서버리스 번들에 모노레포 루트의 OpenAPI 원본을 포함
  outputFileTracingIncludes: { "/api-docs/openapi.yaml": ["../../docs/openapi.yaml"] },
};

export default nextConfig;
