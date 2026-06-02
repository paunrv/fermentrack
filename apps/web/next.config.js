/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    missingSuspenseWithCSRBailout: false,
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
