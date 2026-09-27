/** @type {import('next').NextConfig} */
const apiOrigin = (process.env.API_PROXY_TARGET ?? 'http://localhost:4000').replace(/\/+$/, '');

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiOrigin}/:path*` }];
  }
};

export default nextConfig;
