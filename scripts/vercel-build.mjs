import { build } from 'vite';
import { fileURLToPath } from 'url';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Building for Vercel...');

await build({
  root: path.resolve(rootDir, 'client'),
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, 'client', 'src'),
      '@shared': path.resolve(rootDir, 'shared'),
      '@assets': path.resolve(rootDir, 'attached_assets'),
    },
  },
  build: {
    outDir: path.resolve(rootDir, 'dist/public'),
    emptyOutDir: true,
  },
});

console.log('Build complete!');
