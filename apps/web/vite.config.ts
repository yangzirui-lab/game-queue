import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base:
    process.env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/game-gallery/' : '/'),

  // 路径别名配置
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@services': path.resolve(__dirname, './src/services'),
    },
  },

  // 构建优化配置
  build: {
    rollupOptions: {
      output: {
        // 代码分割策略
        manualChunks: {
          // 核心框架库
          'vendor-react': ['react', 'react-dom'],

          // 动画库
          'vendor-animation': ['framer-motion'],

          // 图标库
          'vendor-icons': ['lucide-react'],

          // 工具库
          'vendor-utils': ['classnames', 'date-fns'],

          // 物理引擎（仅部分小游戏使用）
          'vendor-physics': ['matter-js'],

          // 服务层
          services: ['./src/services/github', './src/services/steam', './src/services/auth'],
        },

        // 文件命名策略
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },

    // 提高 chunk 大小警告阈值（因为有些依赖本身就很大）
    chunkSizeWarningLimit: 1000,

    // 启用 CSS 代码分割
    cssCodeSplit: true,

    // 启用 sourcemap（仅开发环境）
    sourcemap: process.env.NODE_ENV === 'development',

    // 压缩选项
    minify: 'esbuild',

    // 目标浏览器
    target: 'es2015',
  },

  server: {
    port: 5173,
    strictPort: true,
    open: true,
  },
})
