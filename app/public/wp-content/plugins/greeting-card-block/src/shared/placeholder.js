/**
 * Ansicht der Kauf-Blöcke im Editor.
 *
 * BlockPreview zeigt die echte Ausgabe des Blocks -- derselbe render.php wie
 * auf der Seite, abgefragt über ServerSideRender. So sieht der Editor aus wie
 * die Seite, und man kann die Blöcke nach dem tatsächlichen Erscheinungsbild
 * anordnen. Als Produkt dient das Vorschau-Produkt des Rahmens
 * (includes/class-preview.php).
 *
 * Gibt der Block für das Vorschau-Produkt nichts aus (z. B. Variantenauswahl
 * bei einem einfachen Produkt), erscheint stattdessen ein Platzhalter, der
 * erklärt, was hier auf der Seite stünde.
 *
 * Nur für Editor-Skripte (index.js) -- nicht in view.js importieren.
 */
import { useBlockProps } from '@wordpress/block-editor';
import ServerSideRender from '@wordpress/server-side-render';

import { flowerIcon } from './icon';

/**
 * Kasten mit Symbol, Titel und Erklärung -- ohne eigene Block-Hülle.
 *
 * @param {Object} props
 * @param {string} props.title       Titel des Blocks.
 * @param {string} props.description Was hier auf der Seite erscheint.
 * @return {Element} Platzhalter.
 */
function PlaceholderBox( { title, description } ) {
	return (
		<div className="gcb-placeholder">
			<span className="gcb-placeholder__icon" aria-hidden="true">
				{ flowerIcon }
			</span>
			<span className="gcb-placeholder__text">
				<strong>{ title }</strong>
				<span>{ description }</span>
			</span>
		</div>
	);
}

/**
 * Echte Vorschau eines Kauf-Blocks im Editor.
 *
 * @param {Object} props
 * @param {string} props.name        Blockname.
 * @param {string} props.title       Titel des Blocks.
 * @param {string} props.description Text für den Platzhalter.
 * @param {Object} props.attributes  Block-Attribute.
 * @param {Object} props.context     Block-Kontext (Vorschau-Produkt vom Rahmen).
 * @return {Element} Vorschau.
 */
export function BlockPreview( {
	name,
	title,
	description,
	attributes,
	context,
} ) {
	const blockProps = useBlockProps();
	const previewProductId =
		context?.[ 'greeting-card-block/previewProductId' ] || 0;

	return (
		<div { ...blockProps }>
			{ /* Nur ansehen, nicht bedienen: Klicks sollen den Block auswählen,
			     nicht z. B. einen Variantenknopf umschalten. */ }
			<div className="gcb-preview">
				<ServerSideRender
					block={ name }
					attributes={ attributes }
					urlQueryArgs={ { gcb_preview_product: previewProductId } }
					EmptyResponsePlaceholder={ () => (
						<PlaceholderBox
							title={ title }
							description={ description }
						/>
					) }
				/>
			</div>
		</div>
	);
}
