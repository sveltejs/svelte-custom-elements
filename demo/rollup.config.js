import svelte from 'rollup-plugin-svelte';
import path from 'path';

export default {
	entry: 'src/main.js',
	dest: 'bundle.js',
	format: 'iife',
	plugins: [
		// for the purposes of this demo... normally you'd
		// use rollup-plugin-node-resolve
		{
			resolveId ( id ) {
				if ( id === 'svelte-custom-elements' ) {
					return path.resolve( '../dist/svelte-custom-elements.es.js' );
				}
			}
		},
		svelte()
	]
};