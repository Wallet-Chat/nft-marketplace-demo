/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  experimental: {
    transpilePackages: ['@reservoir0x/reservoir-kit-ui'],
  },
  
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
