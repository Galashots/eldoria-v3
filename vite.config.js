import { defineConfig } from 'vite';

// `base: './'` makes the production build use relative paths, so it runs from any
// folder or static host (GitHub Pages, a USB stick, file:// on the iPad) without
// rewriting URLs. That preserves the "just open it" property your kids' build had.
export default defineConfig({
  base: './',
  build: {
    target: 'es2018',        // Safari on older iPads is happy here
    assetsInlineLimit: 0,    // keep sprite PNGs as real files (better caching, simpler debugging)
  },
  server: {
    host: true,              // expose on your LAN so you can test on the actual iPad
    port: 5173,
  },
});
