import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      exclude: [
        'node_modules/',
        '.next/',
        'src/test/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/types.ts',
      ],
      thresholds: {
        lines: 40,
        statements: 40,
        branches: 30,
        functions: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
