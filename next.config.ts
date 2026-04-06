import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use "standalone" for Docker, remove/comment for Vercel
  ...(process.env.DOCKER_BUILD === "1" ? { output: "standalone" as const } : {}),
};

export default nextConfig;
