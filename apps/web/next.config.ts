import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: NextConfig = {
  transpilePackages: ["@client/shared", "@client/database", "@client/ai-engine"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: { typedRoutes: true },
};

export default config;
