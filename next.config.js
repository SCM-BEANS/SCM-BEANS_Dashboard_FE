/** @type {import('next').NextConfig} */
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
    // Turbopack-style optimised package imports — tree-shakes icon libs
    // (optimizeCss removed — requires 'critters' peer dep not installed)
    optimizePackageImports: ["lucide-react"],
  },

  // Image domains (extend when adding external images)
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

module.exports = nextConfig;
