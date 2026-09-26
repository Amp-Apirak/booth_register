import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (client/Dockerfile)
  output: "standalone",
  // Development server only: let phones, tablets and LED PCs on the local network open it
  // (http://192.168.x.x:3000). Otherwise Next.js refuses the page's scripts on those devices,
  // so full screen, live updates and every button stop working there. No effect in production.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*', '*.local'],
};

export default nextConfig;
