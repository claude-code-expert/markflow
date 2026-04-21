import type { NextConfig } from 'next';
import path from 'node:path';
  
const nextConfig: NextConfig = {
  transpilePackages: ['@markflow/editor'],
  turbopack: {
    root: path.join(__dirname, '../..'),
  },
};
export default nextConfig;