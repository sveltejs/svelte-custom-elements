import Counter from './Counter.html';
import { register } from 'svelte-custom-elements';

register( 'my-component', Counter, [ 'value' ] );

document.body.innerHTML = `<my-component value='42'></my-component>`;