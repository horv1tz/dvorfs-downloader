import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.js');

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL_BACKEND: process.env.NEXT_PUBLIC_API_URL_BACKEND,
  },
};

export default withNextIntl(nextConfig);
