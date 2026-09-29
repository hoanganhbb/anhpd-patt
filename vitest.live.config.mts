import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

import base from './vitest.config.mjs'

// Live run against the real Mantis server: npm run test:api
export default defineConfig({
  resolve: base.resolve,
  test: {
    environment: 'node',
    include: ['tests/live/**/*.test.ts'],
    // Load MANTIS_BASE_URL etc. from .env / .env.local like Next.js does.
    env: loadEnv('development', process.cwd(), ''),
    testTimeout: 60000,
    fileParallelism: false
  }
})
