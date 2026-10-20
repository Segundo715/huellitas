import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  // Hay otro package-lock.json en la carpeta de arriba; la raíz es esta.
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
