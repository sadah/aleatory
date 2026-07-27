import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const worksDir = resolve(rootDir, 'works');

function pageInputs(): Record<string, string> {
  const input: Record<string, string> = {
    index: resolve(rootDir, 'index.html'),
    about: resolve(rootDir, 'about.html'),
  };

  try {
    for (const fileName of readdirSync(worksDir)) {
      if (fileName.endsWith('.html')) {
        const name = fileName.slice(0, -'.html'.length);
        input[name] = resolve(worksDir, fileName);
      }
    }
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
  }

  return input;
}

export default defineConfig({
  base: '/aleatory/',
  build: {
    rollupOptions: {
      input: pageInputs(),
    },
  },
  server: {
    host: '127.0.0.1',
  },
});
