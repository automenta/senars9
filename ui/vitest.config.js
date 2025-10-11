import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.jsx'],
    globalSetup: './vitest.global.setup.js',
    include: ['**/*.test.{js,jsx,ts,tsx}'],
    css: true,
    testTimeout: 5000, // Reduced timeout for debugging infinite loops
    fileParallelism: false,
  },
})
