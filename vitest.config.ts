import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Node 22+'s own experimental global `localStorage` can shadow jsdom's
// working implementation before jsdom's environment sets itself up,
// leaving `localStorage` undefined in tests - disable Node's version so
// jsdom's takes over. Must be set before the test worker processes spawn.
// Gated on the Node major version since --no-experimental-webstorage is
// itself a Node 22+ flag - passing it under Node <22 (e.g. CI's Node 20)
// makes Node refuse to start at all rather than just being ignored.
if (Number(process.versions.node.split('.')[0]) >= 22) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --no-experimental-webstorage`.trim()
}

// Separate from vite.config.ts so tests don't pull in vite-plugin-pwa
// (service worker generation has no place in a test environment).
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
