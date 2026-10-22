/**
 * Editor-Ansicht des Filters.
 *
 * Zeigt dieselben Knöpfe wie die Seite: die Schlagwörter, die gerade im
 * Filter stehen (Im Filter zeigen, im Zeitraum, in ihrer Reihenfolge). Die
 * Liste gibt der Server dem Editor mit (window.psbEditorData, Ende von
 * includes/class-blocks.php). Anders als auf der Seite erscheinen auch
 * Schlagwörter, zu denen im Schaufenster (noch) kein Produkt steht -- das
 * prüft erst der Rahmen beim Ausliefern der Seite.
 *
 * Die Knöpfe bedienen hier den Vorschau-Filter des Schaufensters
 * (Kapitel 9): Ein Klick wählt das Schlagwort, ein zweiter hebt es auf --
 * wie auf der Seite. Der gewählte Knopf erscheint gedrückt. Dasselbe lässt
 * sich am Schaufenster in der Seitenleiste einstellen (Vorschau-Filter).
 */
import { __ } from '@wordpress/i18n';
import {
	InspectorControls,
	useBlockProps,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { PanelBody, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';

const SHOWCASE = 'product-showcase/showcase';

export default function Edit( {
	attributes,
	setAttributes,
	clientId,
	context,
} ) {
	const blockProps = useBlockProps();
	const previewTag = context[ 'product-showcase/previewTag' ] || '';

	// Nur die, die auch auf der Seite als Knopf erscheinen würden.
	const tags = ( window.psbEditorData?.filterTags || [] ).filter(
		( tag ) => tag.active
	);

	const showcaseId = useSelect(
		( select ) =>
			select( blockEditorStore ).getBlockParentsByBlockName(
				clientId,
				SHOWCASE
			)[ 0 ],
		[ clientId ]
	);
	const { updateBlockAttributes } = useDispatch( blockEditorStore );
	const toggle = ( slug ) =>
		showcaseId &&
		updateBlockAttributes( showcaseId, {
			previewTag: previewTag === slug ? '' : slug,
		} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Filter', 'product-showcase-block' ) }>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Beschriftung', 'product-showcase-block' ) }
						value={ attributes.label }
						onChange={ ( label ) => setAttributes( { label } ) }
					/>
					<p>
						{ __(
							'Ein Klick auf einen Knopf zeigt im Editor, was bei diesem Filter auf der Seite übrig bliebe (Vorschau-Filter am Schaufenster). Gespeichert wird dabei nur die Vorschau.',
							'product-showcase-block'
						) }
					</p>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>
				{ tags.length ? (
					<div role="group" aria-label={ attributes.label }>
						<p className="psb-filter__label">
							{ attributes.label }
						</p>
						<div className="psb-filter__buttons">
							{ tags.map( ( tag ) => {
								const pressed = tag.slug === previewTag;
								return (
									<button
										key={ tag.slug }
										type="button"
										className={ `psb-filter__button button outline${
											pressed ? ' is-selected' : ''
										}` }
										aria-pressed={ pressed }
										onClick={ () => toggle( tag.slug ) }
									>
										{ tag.name }
									</button>
								);
							} ) }
						</div>
					</div>
				) : (
					<p className="psb-filter__empty">
						{ __(
							'Filter: Gerade steht kein Schlagwort im Filter. Unter Produkte → Schlagwörter bei einem Schlagwort „Im Filter zeigen“ einschalten (und den Zeitraum prüfen).',
							'product-showcase-block'
						) }
					</p>
				) }
			</div>
		</>
	);
}
