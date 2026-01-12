import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

/**
 * Vite Configuration for Veterinary Chatbot Widget
 * 
 * Supports two build modes:
 * 1. Development mode: Standard React app for testing
 * 2. Widget mode: Single IIFE bundle for embedding via script tag
 */

export default defineConfig(({ command, mode }) => {
    // Load env variables
    const env = loadEnv(mode, process.cwd(), '');

    // Check if building as widget
    const isWidgetBuild = mode === 'widget' || process.env.BUILD_WIDGET === 'true';

    // Base configuration
    const baseConfig = {
        plugins: [
            react({
                // Fast refresh for development
                fastRefresh: command === 'serve',
            }),
        ],

        // Path aliases
        resolve: {
            alias: {
                '@': resolve(__dirname, 'src'),
                '@components': resolve(__dirname, 'src/components'),
                '@hooks': resolve(__dirname, 'src/hooks'),
                '@services': resolve(__dirname, 'src/services'),
                '@utils': resolve(__dirname, 'src/utils'),
                '@styles': resolve(__dirname, 'src/styles'),
            },
        },

        // Define global constants
        define: {
            'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
            '__DEV__': mode === 'development',
        },

        // Development server configuration
        server: {
            port: 5173,
            host: true,
            open: true,
            cors: true,
            // Proxy API requests to backend
            proxy: {
                '/api': {
                    target: env.VITE_API_BASE_URL || 'http://localhost:5000',
                    changeOrigin: true,
                    secure: false,
                },
            },
        },

        // Preview server (for testing production build)
        preview: {
            port: 4173,
            host: true,
        },

        // CSS configuration
        css: {
            // Enable CSS modules with scoped class names
            modules: {
                localsConvention: 'camelCase',
            },
            // PostCSS configuration
            postcss: './postcss.config.js',
        },
    };

    // Widget build configuration
    if (isWidgetBuild) {
        return {
            ...baseConfig,

            // Use widget entry point
            build: {
                // Output directory
                outDir: 'dist/widget',

                // Library mode configuration
                lib: {
                    // Entry point for widget build
                    entry: resolve(__dirname, 'src/widget.jsx'),

                    // Output file name
                    name: 'VetChatbot',

                    // Output as IIFE (Immediately Invoked Function Expression)
                    formats: ['iife'],

                    // File naming
                    fileName: () => 'chatbot.js',
                },

                // Rollup options
                rollupOptions: {
                    // Don't externalize anything - bundle everything
                    external: [],

                    output: {
                        // Single file output
                        inlineDynamicImports: true,

                        // Global variable name when format is IIFE
                        name: 'VetChatbot',

                        // Ensure CSS is inlined
                        assetFileNames: (assetInfo) => {
                            if (assetInfo.name === 'style.css') {
                                return 'chatbot.css';
                            }
                            return assetInfo.name;
                        },

                        // Banner for the output file
                        banner: `/*!
 * Veterinary Chatbot Widget v1.0.0
 * (c) ${new Date().getFullYear()} Veterinary Clinic
 * Released under the MIT License
 */`,
                    },
                },

                // Minification
                minify: 'terser',
                terserOptions: {
                    compress: {
                        drop_console: true,
                        drop_debugger: true,
                    },
                    format: {
                        comments: /^!/,
                    },
                },

                // Enable source maps for debugging
                sourcemap: true,

                // Target modern browsers
                target: 'es2018',

                // CSS code splitting disabled for single file
                cssCodeSplit: false,

                // Inline assets under this size
                assetsInlineLimit: 100000, // 100kb

                // Report compressed size
                reportCompressedSize: true,

                // Empty output directory before build
                emptyOutDir: true,
            },
        };
    }

    // Standard development/production build
    return {
        ...baseConfig,

        build: {
            // Output directory
            outDir: 'dist',

            // Standard build configuration
            rollupOptions: {
                input: {
                    main: resolve(__dirname, 'index.html'),
                },
                output: {
                    // Chunk naming
                    chunkFileNames: 'assets/[name]-[hash].js',
                    entryFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash].[ext]',
                },
            },

            // Minification
            minify: mode === 'production' ? 'terser' : false,

            // Source maps
            sourcemap: mode === 'development',

            // Target
            target: 'es2018',

            // Report compressed size
            reportCompressedSize: true,
        },
    };
});
