// /** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config, { isServer, dev }) {
    config.experiments = {
      asyncWebAssembly: true,
      layers: true,
      ...config.experiments,
      topLevelAwait: true,
    };

    return config;
  },
};
module.exports = nextConfig;
