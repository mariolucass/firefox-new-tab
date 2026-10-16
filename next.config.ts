import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Caminhos relativos só no build da extensão; em dev quebram a hidratação e o HMR.
  assetPrefix: process.env.NODE_ENV === "production" ? "." : undefined,
  experimental: { useTypeScriptCli: false },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
