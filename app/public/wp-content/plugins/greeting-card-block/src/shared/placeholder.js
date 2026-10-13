/**
 * Platzhalter der Kauf-Blöcke im Editor.
 *
 * Eine echte Vorschau gibt es nicht: Was ein Block zeigt, hängt vom Produkt
 * ab (Varianten, Karten), und im Template steht kein bestimmtes Produkt.
 * Der Platzhalter sagt deshalb, was an dieser Stelle auf der Seite erscheint.
 *
 * Nur für Editor-Skripte (index.js) -- nicht in view.js importieren.
 */
import { useBlockProps } from '@wordpress/block-editor';

import { flowerIcon } from './icon';

/**
 * @param {Object} props
 * @param {string} props.title       Titel des Blocks.
 * @param {string} props.description Was hier auf der Seite erscheint.
 * @return {Element} Platzhalter.
 */
export function BlockPlaceholder( { title, description } ) {
	return (
		<div { ...useBlockProps( { className: 'gcb-placeholder' } ) }>
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
