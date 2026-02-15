import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 0, // Disable client-side Router Cache for dynamic pages so navigations always show fresh data
    },
  },
};

export default withNextIntl(nextConfig);
