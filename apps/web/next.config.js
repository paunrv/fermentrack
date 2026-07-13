const createNextIntlPlugin = require('next-intl/plugin')
const os = require('os')

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

/** LAN + Cloudflare quick-tunnel hosts so phone can load /_next/* in development. */
function lanDevOrigins() {
  const hosts = new Set([
    '127.0.0.1',
    'localhost',
    '*.trycloudflare.com',
  ])
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets ?? []) {
      if (net.family !== 'IPv4' && net.family !== 4) continue
      if (net.internal) continue
      hosts.add(net.address)
    }
  }
  return [...hosts]
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@fermentrack/ui'],
  allowedDevOrigins: lanDevOrigins(),
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
}

module.exports = withNextIntl(nextConfig)
