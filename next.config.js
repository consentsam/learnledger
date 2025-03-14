/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['docs.github.com'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to import node modules on the client side
      config.resolve.fallback = { 
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }
    return config;
  },
  // Temporarily exclude API docs from the build to fix deployment
  experimental: {
    serverComponentsExternalPackages: ['swagger-ui-react', 'swagger-jsdoc', 'next-swagger-doc'],
    serverActions: {
      allowedOrigins: ['*']
    }
  },
  // Disable static generation for API routes
  output: "standalone",
  generateBuildId: async () => {
    return "build-" + new Date().getTime()
  },
  // Disable TypeScript type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable eslint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Properly handle dynamic API routes
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
        ],
      },
    ]
  }
}

module.exports = nextConfig
