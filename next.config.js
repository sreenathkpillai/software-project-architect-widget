/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
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