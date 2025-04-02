import { defineConfig } from 'vite';
import { version } from './package.json';

export default defineConfig({
	define: {
		'import.meta.env.PACKAGE_VERSION': JSON.stringify(version),
	},
	build: {
		target: 'ES2022',
	},
	worker: {
		format: 'es',
	},
	server: {
		proxy: {
			'/poe-ninja-api': {
				target: 'https://poe.ninja',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/poe-ninja-api/, ''),
				secure: false,
			}
		}
	}
});
