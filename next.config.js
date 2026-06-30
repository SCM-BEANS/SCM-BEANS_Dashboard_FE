/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stricter React mode — catches double-invoke issues in dev
  reactStrictMode: true,

  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei'],

  // Compiler optimisations
  compiler: {
    // Remove console.log in production builds
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental features for better performance
  experimental: {
    // Turbopack-style optimised package imports — tree-shakes icon libs
    // (optimizeCss removed — requires 'critters' peer dep not installed)
    optimizePackageImports: ["lucide-react"],
  },

  // Image domains (extend when adding external images)
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Proxy API requests to avoid CORS issues during development
  async rewrites() {
    // If NEXT_PUBLIC_API_URL is set (e.g. localhost), use it for proxying, otherwise fallback to netbird
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://idaas.netbird.cloud:4000/api/v1';

    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiBaseUrl}/:path*`, // Proxy to Golang Backend
      },
    ];
  },
};

module.exports = nextConfig;
