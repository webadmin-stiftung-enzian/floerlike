/**
 * Block "Bild bei Abholung" an der Kasse: WooCommerce ersetzt die
 * gespeicherte Hülle durch die Komponente aus block.js.
 */
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';

import Block from './block';
import metadata from './block.json';

registerCheckoutBlock( {
	metadata,
	component: Block,
} );
