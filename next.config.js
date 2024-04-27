/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

module.exports = nextConfig,

module.exports = {
  env: {
    ABLY_API_KEY: process.env.ABLY_API_KEY,
  },
}
