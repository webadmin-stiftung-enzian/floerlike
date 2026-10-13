/**
 * Block "Grusskarte hinzufügen": schaltet `wantsCard` -- davon hängen
 * Kartenauswahl und Grusstext ab (data-wp-bind--hidden in deren render.php).
 */
import { store } from '@wordpress/interactivity';

const { state } = store( 'greeting-card-bundle', {
	actions: {
		toggleWantsCard( event ) {
			state.wantsCard = event.target.checked;
		},
	},
} );
