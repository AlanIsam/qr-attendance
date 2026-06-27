import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the workspace root to this app so Turbopack doesn't pick up a stray
  // lockfile in a parent directory and resolve node_modules incorrectly.
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ["*.loca.lt"],
  serverExternalPackages: [
    "@prisma/adapter-libsql",
    "@libsql/client",
    "libsql",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent the app from being embedded in iframes (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Stop browsers from MIME-sniffing responses.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Limit referrer leakage to other origins.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Allow the camera only for the QR scanner (same origin); deny the rest.
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
