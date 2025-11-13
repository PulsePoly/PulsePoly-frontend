import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Important: more specific paths should be FIRST
      '/api/public-search': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/public-search/, '/public-search'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [VITE PROXY /api/public-search] Proxy error:', err.message);
            console.error('   Request URL:', req.url);
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/public-search', '/public-search')}`;
            console.log('📤 [VITE PROXY /api/public-search] Sending request:');
            console.log('   Method:', req.method);
            console.log('   Original URL:', req.url);
            console.log('   Target URL:', targetUrl);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/public-search', '/public-search')}`;
            console.log('📥 [VITE PROXY /api/public-search] Received response:');
            console.log('   Status:', proxyRes.statusCode, proxyRes.statusMessage);
            console.log('   URL:', targetUrl);
          });
        },
      },
      '/api/polymarket': {
        target: 'https://clob.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/polymarket/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [VITE PROXY /api/polymarket] Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const targetUrl = `https://clob.polymarket.com${req.url.replace('/api/polymarket', '')}`;
            console.log('📤 [VITE PROXY /api/polymarket] Sending request:', req.method, req.url, '→', targetUrl);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 [VITE PROXY /api/polymarket] Received response:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/api/gamma': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gamma/, ''),
      },
      '/api/markets': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/markets/, '/markets'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [VITE PROXY /api/markets] Proxy error:', err.message);
            console.error('   Request URL:', req.url);
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/markets', '/markets')}`;
            console.log('📤 [VITE PROXY /api/markets] Sending request:');
            console.log('   Method:', req.method);
            console.log('   Original URL:', req.url);
            console.log('   Target URL:', targetUrl);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/markets', '/markets')}`;
            console.log('📥 [VITE PROXY /api/markets] Received response:');
            console.log('   Status:', proxyRes.statusCode, proxyRes.statusMessage);
            console.log('   URL:', targetUrl);
          });
        },
      },
      '/api/events': {
        target: 'https://gamma-api.polymarket.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/events/, '/events'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [VITE PROXY /api/events] Proxy error:', err.message);
            console.error('   Request URL:', req.url);
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/events', '/events')}`;
            console.log('📤 [VITE PROXY /api/events] Sending request:');
            console.log('   Method:', req.method);
            console.log('   Original URL:', req.url);
            console.log('   Target URL:', targetUrl);
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const targetUrl = `https://gamma-api.polymarket.com${req.url.replace('/api/events', '/events')}`;
            console.log('📥 [VITE PROXY /api/events] Received response:');
            console.log('   Status:', proxyRes.statusCode, proxyRes.statusMessage);
            console.log('   URL:', targetUrl);
          });
        },
      },
      '/api/jupiter': {
        target: 'https://prediction-market-api.jup.ag',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/jupiter/, '/api/v1'),
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [VITE PROXY /api/jupiter] Proxy error:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const targetUrl = `https://prediction-market-api.jup.ag${req.url.replace('/api/jupiter', '/api/v1')}`;
            console.log('📤 [VITE PROXY /api/jupiter] Sending request:', req.method, req.url, '→', targetUrl);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('📥 [VITE PROXY /api/jupiter] Received response:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
})

