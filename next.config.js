// /** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});
module.exports = withPWA({
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      ...config.experiments,
      topLevelAwait: true,
    };
    config.resolve.fallback = {
      module: false,
      perf_hooks: false,
    };
    return config;
  },
});
