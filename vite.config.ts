import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const disableHmr =
    process.env.DISABLE_HMR === 'true' ||
    process.env.VITE_DISABLE_HMR === 'true' ||
    Boolean(process.env.K_SERVICE);

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR & Vite WS are disabled in AI Studio / Cloud Run to avoid unreachable WS port reload loops.
      ws: disableHmr ? (false as const) : undefined,
      hmr: !disableHmr,
      watch: disableHmr
        ? null
        : {
            ignored: [
              '**/data/**',
              '**/backups/**',
              '**/.data/**',
              '**/public/assets/aistudio/**',
            ],
          },
    },
  };
});
