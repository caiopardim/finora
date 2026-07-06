const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3000'] },
    instrumentationHook: true, // habilita src/instrumentation.ts (Next 14)
  },
};

// withSentryConfig só faz upload de source maps quando há org/project/authToken.
// Sem essas envs, é inerte no build e o app funciona normalmente.
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
