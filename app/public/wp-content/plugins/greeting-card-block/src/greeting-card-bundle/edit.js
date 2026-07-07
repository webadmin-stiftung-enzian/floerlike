/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';

/**
 * The block's markup depends on the bundled items of the current product
 * (§6 der Spec) und wird komplett von render.php erzeugt. Im Editor gibt es
 * keine Live-Vorschau, nur einen Platzhalter — Bearbeitung findet auf der
 * Produktseite selbst statt.
 *
 * @return {Element} Element to render.
 */
export default function Edit() {
	return (
		<p { ...useBlockProps() }>
			{ __(
				'Grusskarte + Bundle in den Warenkorb – Vorschau nur auf der Produktseite sichtbar.',
				'greeting-card-block'
			) }
		</p>
	);
}
