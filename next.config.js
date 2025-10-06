/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/widget',
  webpack: (config) => {
    // Suppress punycode deprecation warnings
    config.ignoreWarnings = [
      { module: /node_modules\/punycode/ },
      /Critical dependency: the request of a dependency is an expression/
    ];
    return config;
  },
  // Allow iframe embedding
  async headers() {
    return [
      {
        source: '/widget',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.yourapp.com https://localhost:* http://localhost:*",
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig