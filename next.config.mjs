/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The public site is a fully static export served by Caddy/nginx (see deploy/).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
