// /** @type {import('next').NextConfig} */
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
});
module.exports = withPWA({
  webpack(config) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },
});
