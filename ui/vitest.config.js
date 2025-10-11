import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    globalSetup: './vitest.global.setup.js',
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    css: true,
    testTimeout: 10000, // Increase timeout for async tests
  },
})
