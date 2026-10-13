/**
 * Block "Grusstext": schreibt den Text in den gemeinsamen State.
 *
 * Die Höchstlänge kommt aus dem State (state.maxLength), nicht aus einer
 * Konstanten -- siehe Hinweis in src/shared/store.js.
 */
import { store } from '@wordpress/interactivity';

const { state } = store( 'greeting-card-bundle', {
	actions: {
		updateText( event ) {
			state.text = event.target.value.substring( 0, state.maxLength );
		},
	},
} );
