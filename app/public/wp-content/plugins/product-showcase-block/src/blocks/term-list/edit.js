/**
 * Editor-Ansicht der "Begriffsliste".
 *
 * Zeigt die echte Ausgabe von render.php für das Produkt, das die
 * Produktvorlage bzw. die Produktseite gerade darstellt (Kontext postId) --
 * gleiches Vorgehen wie bei der "Produktangabe": ServerSideRender kennt
 * keinen Block-Kontext, die Produkt-ID geht als post_id mit.
 *
 * Die möglichen Quellen gibt der Server mit (window.psbTermList,
 * includes/class-term-list.php).
 */
import { __ } from '@wordpress/i18n';
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';

const DATA = window.psbTermList || { sources: [] };

const ORDER = [
	{
		value: 'source',
		label: __( 'Wie beim Attribut eingestellt', 'product-showcase-block' ),
	},
	{ value: 'menu_order', label: __( 'Eigene Reihenfolge', 'product-showcase-block' ) },
	{ value: 'name_asc', label: __( 'Name A–Z', 'product-showcase-block' ) },
	{ value: 'name_desc', label: __( 'Name Z–A', 'product-showcase-block' ) },
];

const Hint = ( { children } ) => (
	<p className="psb-term-list__hint">{ children }</p>
);

export default function Edit( { attributes, setAttributes, context, name } ) {
	const blockProps = useBlockProps();
	const { taxonomy, orderBy, label, separator, isLink } = attributes;

	let preview;
	if ( ! taxonomy ) {
		preview = (
			<Hint>
				{ __(
					'Begriffsliste: In der Seitenleiste eine Quelle wählen, z. B. „Blumen“.',
					'product-showcase-block'
				) }
			</Hint>
		);
	} else if ( ! context.postId ) {
		preview = (
			<Hint>
				{ __(
					'Begriffsliste: erscheint in der Produktvorlage einer Produktsammlung oder auf der Produktseite.',
					'product-showcase-block'
				) }
			</Hint>
		);
	} else {
		preview = (
			<ServerSideRender
				block={ name }
				attributes={ attributes }
				urlQueryArgs={ { post_id: context.postId } }
				EmptyResponsePlaceholder={ () => (
					<Hint>
						{ __(
							'Begriffsliste: bei diesem Produkt nichts zugeordnet.',
							'product-showcase-block'
						) }
					</Hint>
				) }
			/>
		);
	}

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={ __( 'Begriffsliste', 'product-showcase-block' ) }
				>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Quelle', 'product-showcase-block' ) }
						help={ __(
							'Globale Attribute (Produkte → Attribute), Kategorien oder Schlagwörter.',
							'product-showcase-block'
						) }
						value={ taxonomy }
						options={ [
							{
								value: '',
								label: __( '— wählen —', 'product-showcase-block' ),
							},
							...DATA.sources,
						] }
						onChange={ ( next ) => setAttributes( { taxonomy: next } ) }
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Sortierung', 'product-showcase-block' ) }
						help={ __(
							'„Eigene Reihenfolge“: wie unter Produkte → Attribute → Werte per Ziehen festgelegt.',
							'product-showcase-block'
						) }
						value={ orderBy }
						options={ ORDER }
						onChange={ ( next ) => setAttributes( { orderBy: next } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Beschriftung', 'product-showcase-block' ) }
						help={ __(
							'Z. B. „Blumen:“. Leer = ohne Beschriftung.',
							'product-showcase-block'
						) }
						value={ label }
						onChange={ ( next ) => setAttributes( { label: next } ) }
					/>
					<TextControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={ __( 'Trennzeichen', 'product-showcase-block' ) }
						value={ separator }
						onChange={ ( next ) =>
							setAttributes( { separator: next } )
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={ __( 'Verlinken', 'product-showcase-block' ) }
						help={ __(
							'Jeden Begriff mit seiner Übersichtsseite verlinken – nur wenn es eine gibt (beim Attribut „Archive aktivieren“).',
							'product-showcase-block'
						) }
						checked={ isLink }
						onChange={ ( next ) => setAttributes( { isLink: next } ) }
					/>
				</PanelBody>
			</InspectorControls>
			<div { ...blockProps }>{ preview }</div>
		</>
	);
}
