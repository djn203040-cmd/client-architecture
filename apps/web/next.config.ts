import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"],
  outputFileTracingRoot: path.join(process.cwd(), "../../"),
  experimental: { typedRoutes: true },
};

export default config;
