module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  pageExtensions: ['ts', 'tsx'],
  typescript: {
    ignoreBuildErrors: false,
  },
  publicRuntimeConfig: {
    // Public runtime config
    apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
  },
  env: {
    // Backend environment variables (matching Vercel exactly)
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    JWT_SECRET: process.env.JWT_SECRET,
    DB_PROVIDER: process.env.DB_PROVIDER,
  }
}
