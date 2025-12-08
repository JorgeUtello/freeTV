import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        proxy: {
            '/Api': {
                target: 'https://telefe.com',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
