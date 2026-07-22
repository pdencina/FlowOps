/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flowops/shared', '@flowops/database'],
  experimental: {
    serverComponentsExternalPackages: ['postgres'],
  },
};

module.exports = nextConfig;
