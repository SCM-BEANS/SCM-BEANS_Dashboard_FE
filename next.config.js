/** @type {import('next').NextConfig} */
const doloresApiOrigin = process.env.DOLORES_API_URL?.replace(/\/+$/, '');

const nextConfig = {
  // Stricter React mode — catches double-invoke issues in dev
  reactStrictMode: true,

  // Compiler optimisations
  compiler: {
    // Remove console.log in production builds
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Experimental features for better performance
  experimental: {
    // Turbopack-style optimised package imports
    optimizePackageImports: ["lucide-react"],
  },

  // Fix Next.js 15 / React 19 compatibility issues with Three.js / Fiber
  transpilePackages: ['three', '@react-three/fiber', '@react-three/drei', '@astryxdesign/core', '@astryxdesign/theme-neutral'],

  // Image domains (extend when adding external images)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'www.caye.com',
      },
    ],
  },

  // Proxy the separate Dolores API to avoid browser CORS requests.
  async rewrites() {
    return [
      ...(doloresApiOrigin
        ? [{
            source: '/api/dolores/v1/:path*',
            destination: doloresApiOrigin + '/api/v1/:path*',
          }]
        : []),
    ];
  },
};

module.exports = nextConfig;
