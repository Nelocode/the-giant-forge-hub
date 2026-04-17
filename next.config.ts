import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  // Allow serving uploads from public/uploads
  async headers() {
    return [
      {
        source: '/uploads/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000' }],
      },
    ];
  },
  // Turbopack config for Next.js 16 (replaces webpack externals for native modules)
  turbopack: {},
  // Keep webpack config for non-turbopack builds (e.g. production build)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('better-sqlite3');
    }
    return config;
  },
};

export default nextConfig;
