import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"],
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  experimental: { typedRoutes: true },
  async redirects() {
    return [
      { source: "/settings/autonomous", destination: "/settings#autonomous", permanent: true },
      { source: "/settings/notifications", destination: "/settings#notifications", permanent: true },
      { source: "/settings/voice", destination: "/settings#voice", permanent: true },
    ];
  },
};

export default config;
