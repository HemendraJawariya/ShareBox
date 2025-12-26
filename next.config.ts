import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Max duration: 1 hour for 50GB files (set at route level in api/upload/route.ts)
  // Note: For very large files, use chunked upload via /api/upload-chunk
};

export default nextConfig;
