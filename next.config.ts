import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["*.loca.lt"],
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],
};

export default nextConfig;
