import type { NextConfig } from 'next'

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
})

const nextConfig: NextConfig = {
  basePath:    '/v2',      // toutes les routes préfixées par /v2
  assetPrefix: '/v2',      // assets JS/CSS/images sous /v2
  images: { unoptimized: true },
}

module.exports = withPWA(nextConfig)
