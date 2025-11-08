/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

console.log(">>> next.config.js: NEXTAUTH_URL:", process.env.NEXTAUTH_URL);

module.exports = nextConfig;
