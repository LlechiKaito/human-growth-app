/** @type {import('next').NextConfig} */
const isExport = process.env.NEXT_OUTPUT === 'export';

const nextConfig = {
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
  images: { unoptimized: true },
  reactStrictMode: true,
  async rewrites() {
    if (isExport) return [];
    const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';
    return [{ source: '/api/:path*', destination: `${target}/api/:path*` }];
  },
};

export default nextConfig;
