// /** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
});
module.exports = withPWA({
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },
});
