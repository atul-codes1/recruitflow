/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
