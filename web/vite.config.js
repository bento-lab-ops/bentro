import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.', // Root is the current directory (web)
    base: '/', // Base URL
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        port: 3000,
        strictPort: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './js'),
        },
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./tests/setup.js'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'lcov'],
            reportsDirectory: './coverage'
        }
    },
});
