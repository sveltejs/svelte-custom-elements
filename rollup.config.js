const pkg = require( './package.json' );

export default {
	entry: 'src/index.js',
	moduleName: 'svelteCustomElements',
	targets: [
		{ dest: pkg.main, format: 'umd' },
		{ dest: pkg.module, format: 'es' }
	]
};