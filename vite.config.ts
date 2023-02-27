import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      'vue-x6': fileURLToPath(new URL('./src/lib', import.meta.url))
    }
  },
  build: {
    lib: {
      entry: './src/lib/*.ts',
      fileName: (format) => `[name].${format == 'es' ? 'js' : format}`,
      formats: ["es", "cjs"]
    },
    rollupOptions: {
      input: {
        index: "./src/lib/index.ts",
      },
      external: ['vue', '@antv/x6', '@vue/runtime-core'],
      output: {
        globals: {
          '@antv/x6': 'X6',
          '@vue/runtime-core': 'VueRuntime',
          vue: 'Vue'
        }
      }
    }
  }
})
