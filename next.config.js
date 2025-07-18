/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config');
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    // Ignorar hammerjs en el servidor para evitar errores de SSR
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'hammerjs': false,
      };
    }
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },
  i18n,
}

module.exports = withPWA(nextConfig)
