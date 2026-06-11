/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false,
    // Next 14: serverComponentsExternalPackages (renamed serverExternalPackages in v15)
    // Solo @clerk/backend (server). Externalizar @clerk/nextjs rompe ClerkProvider en dev/SSR.
    serverComponentsExternalPackages: ['@clerk/backend'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@supabase/supabase-js',
        '@supabase/ssr',
        '@supabase/realtime-js',
      ]
    }
    return config
  },
};

module.exports = nextConfig;
