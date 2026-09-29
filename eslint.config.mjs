import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  // eslint-plugin-react's version auto-detect calls an API removed in ESLint 10.
  { settings: { react: { version: '19' } } },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'data/**', 'next-env.d.ts'])
])
