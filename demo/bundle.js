(function () {
'use strict';

function appendNode ( node, target ) {
	target.appendChild( node );
}

function insertNode ( node, target, anchor ) {
	target.insertBefore( node, anchor );
}

function detachNode ( node ) {
	node.parentNode.removeChild( node );
}

function createElement ( name ) {
	return document.createElement( name );
}

function createText ( data ) {
	return document.createTextNode( data );
}

function addEventListener ( node, event, handler ) {
	node.addEventListener ( event, handler, false );
}

function removeEventListener ( node, event, handler ) {
	node.removeEventListener ( event, handler, false );
}

function get ( key ) {
	return key ? this._state[ key ] : this._state;
}

function fire ( eventName, data ) {
	var handlers = eventName in this._handlers && this._handlers[ eventName ].slice();
	if ( !handlers ) return;

	for ( var i = 0; i < handlers.length; i += 1 ) {
		handlers[i].call( this, data );
	}
}

function observe ( key, callback, options ) {
	var group = ( options && options.defer ) ? this._observers.pre : this._observers.post;

	( group[ key ] || ( group[ key ] = [] ) ).push( callback );

	if ( !options || options.init !== false ) {
		callback.__calling = true;
		callback.call( this, this._state[ key ] );
		callback.__calling = false;
	}

	return {
		cancel: function () {
			var index = group[ key ].indexOf( callback );
			if ( ~index ) group[ key ].splice( index, 1 );
		}
	};
}

function on ( eventName, handler ) {
	var handlers = this._handlers[ eventName ] || ( this._handlers[ eventName ] = [] );
	handlers.push( handler );

	return {
		cancel: function () {
			var index = handlers.indexOf( handler );
			if ( ~index ) handlers.splice( index, 1 );
		}
	};
}

function set ( newState ) {
	this._set( newState );
	( this._root || this )._flush();
}

function _flush () {
	if ( !this._renderHooks ) return;

	while ( this._renderHooks.length ) {
		var hook = this._renderHooks.pop();
		hook.fn.call( hook.context );
	}
}

function dispatchObservers ( component, group, newState, oldState ) {
	for ( var key in group ) {
		if ( !( key in newState ) ) continue;

		var newValue = newState[ key ];
		var oldValue = oldState[ key ];

		if ( newValue === oldValue && typeof newValue !== 'object' ) continue;

		var callbacks = group[ key ];
		if ( !callbacks ) continue;

		for ( var i = 0; i < callbacks.length; i += 1 ) {
			var callback = callbacks[i];
			if ( callback.__calling ) continue;

			callback.__calling = true;
			callback.call( component, newValue, oldValue );
			callback.__calling = false;
		}
	}
}

function renderMainFragment ( root, component ) {
	var div = createElement( 'div' );
	
	var div1 = createElement( 'div' );
	
	appendNode( div1, div );
	appendNode( createText( "Count: " ), div1 );
	var last_text1 = root.value;
	var text1 = createText( last_text1 );
	appendNode( text1, div1 );
	appendNode( createText( "\n\t" ), div );
	
	var button = createElement( 'button' );
	
	function clickHandler ( event ) {
		var root = this.__svelte.root;
		
		component.set({ value: root.value + 1 });
	}
	
	addEventListener( button, 'click', clickHandler );
	
	button.__svelte = {
		root: root
	};
	
	appendNode( button, div );
	appendNode( createText( "+" ), button );
	appendNode( createText( "\n\t" ), div );
	
	var button1 = createElement( 'button' );
	
	function clickHandler1 ( event ) {
		var root = this.__svelte.root;
		
		component.set({ value: root.value - 1 });
	}
	
	addEventListener( button1, 'click', clickHandler1 );
	
	button1.__svelte = {
		root: root
	};
	
	appendNode( button1, div );
	appendNode( createText( "-" ), button1 );

	return {
		mount: function ( target, anchor ) {
			insertNode( div, target, anchor );
		},
		
		update: function ( changed, root ) {
			var __tmp;
		
			if ( ( __tmp = root.value ) !== last_text1 ) {
				text1.data = last_text1 = __tmp;
			}
			
			button.__svelte.root = root;
			
			button1.__svelte.root = root;
		},
		
		teardown: function ( detach ) {
			removeEventListener( button, 'click', clickHandler );
			removeEventListener( button1, 'click', clickHandler1 );
			
			if ( detach ) {
				detachNode( div );
			}
		}
	};
}

function Counter ( options ) {
	options = options || {};
	this._state = options.data || {};
	
	this._observers = {
		pre: Object.create( null ),
		post: Object.create( null )
	};
	
	this._handlers = Object.create( null );
	
	this._root = options._root;
	this._yield = options._yield;
	
	this._torndown = false;
	
	this._fragment = renderMainFragment( this._state, this );
	if ( options.target ) this._fragment.mount( options.target, null );
}

Counter.prototype.get = get;
Counter.prototype.fire = fire;
Counter.prototype.observe = observe;
Counter.prototype.on = on;
Counter.prototype.set = set;
Counter.prototype._flush = _flush;

Counter.prototype._set = function _set ( newState ) {
	var oldState = this._state;
	this._state = Object.assign( {}, oldState, newState );
	
	dispatchObservers( this, this._observers.pre, newState, oldState );
	if ( this._fragment ) this._fragment.update( newState, this._state );
	dispatchObservers( this, this._observers.post, newState, oldState );
};

Counter.prototype.teardown = Counter.prototype.destroy = function destroy ( detach ) {
	this.fire( 'teardown' );

	this._fragment.teardown( detach !== false );
	this._fragment = null;

	this._state = {};
	this._torndown = true;
};

function register ( tagName, Component, props = [] ) {
	class SvelteElement extends HTMLElement {
		constructor () {
			super();

			this.target = this.attachShadow({ mode: 'closed' });
			this.data = {};
		}

		connectedCallback () {
			props.forEach( prop => {
				const value = this[ prop ];
				if ( value !== undefined ) {
					this.data[ prop ] = this[ prop ];
				}
			});

			this.instance = new Component({
				target: this.target,
				data: this.data
			});

			props.forEach( prop => {
				this.instance.observe( prop, value => {
					this.setAttribute( prop, value );
				});
			});
		}

		detachedCallback () {
			this.instance.destroy();
			this.instance = null;
		}

		attributeChangedCallback ( attr, oldValue, newValue ) {
			const value = isNaN( newValue ) ? newValue : +newValue;
			this.data[ attr ] = value;
			if ( this.instance ) this.instance.set({ [ attr ]: value });
		}
	}

	Object.defineProperty( SvelteElement, 'observedAttributes', {
		get () {
			return props;
		}
	});

	props.forEach( prop => {
		Object.defineProperty( SvelteElement.prototype, prop, {
			get () {
				return this.instance ? this.instance.get( prop ) : this.data[ prop ];
			},

			set ( value ) {
				this.data[ prop ] = value;
				if ( this.instance ) this.instance.set({ [ prop ]: value });
			}
		});
	});

	const result = customElements.define( tagName, SvelteElement );
	return SvelteElement;
}

register( 'my-component', Counter, [ 'value' ] );

document.body.innerHTML = `<my-component value='42'></my-component>`;

}());
