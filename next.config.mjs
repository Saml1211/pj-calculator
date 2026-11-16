/** @type {import('next').NextConfig} */
// PAGES_BASE_PATH is set only by the GitHub Pages workflow; local dev and `next start` are unchanged.
const basePath = process.env.PAGES_BASE_PATH || '';

const nextConfig = basePath
  ? { output: 'export', basePath, images: { unoptimized: true }, trailingSlash: true }
  : {};

export default nextConfig;
