/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@flowops/shared', '@flowops/database'],
  serverExternalPackages: ['postgres'],
};

module.exports = nextConfig;
