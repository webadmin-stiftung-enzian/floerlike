/**
 * Editor-Ansicht der "Zeile".
 *
 * Vorlage beim Einfügen (Spezifikation, Kapitel 5.3): Überschrift und eine
 * Produktsammlung "nach Kategorie" im Stil "Swiper Slider" -- wie im
 * Entwurf 3 Produkte, das vierte angeschnitten. Die Kategorie wählt man an
 * der Produktsammlung (Seitenleiste, "Filter" → Produktkategorien).
 * Danach ist alles frei änderbar; weitere Blöcke dürfen dazu.
 *
 * Die Attribute der Produktsammlung sind die, die WooCommerce selbst beim
 * Einfügen der Sammlung "Produkte nach Kategorie" setzt (WooCommerce 11.1),
 * nur mit anderer Anzahl, Spalten und Stil. "Produkte pro Seite" ist hier
 * die Obergrenze im Slider (Spezifikation, Kapitel 11).
 */
import { __ } from '@wordpress/i18n';
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

const MAX_PRODUCTS = 24;

const COLLECTION = {
	collection: 'woocommerce/product-collection/by-category',
	className: 'is-style-swiper',
	query: {
		perPage: MAX_PRODUCTS,
		pages: 0,
		offset: 0,
		postType: 'product',
		order: 'asc',
		orderBy: 'title',
		search: '',
		exclude: [],
		inherit: false,
		taxQuery: {},
		isProductCollectionBlock: true,
		featured: false,
		woocommerceOnSale: false,
		woocommerceStockStatus: [ 'instock', 'outofstock', 'onbackorder' ],
		woocommerceAttributes: [],
		woocommerceHandPickedProducts: [],
		filterable: false,
		relatedBy: { categories: true, tags: true },
	},
	tagName: 'div',
	displayLayout: { type: 'flex', columns: 3, shrinkColumns: true },
	dimensions: { widthType: 'fill' },
	hideControls: [ 'inherit', 'hand-picked', 'filterable' ],
	queryContextIncludes: [ 'collection' ],
	// Panel "Slider" (src/editor/product-collection.js).
	psbSlider: { peek: true },
};

const TEMPLATE = [
	[
		'core/heading',
		{
			level: 2,
			placeholder: __(
				'Überschrift der Zeile, z. B. „Für jeden Anlass“',
				'product-showcase-block'
			),
		},
	],
	[
		'woocommerce/product-collection',
		COLLECTION,
		[
			[
				'woocommerce/product-template',
				{},
				[
					[
						'woocommerce/product-image',
						{ showSaleBadge: false, isDescendentOfQueryLoop: true },
					],
					[
						'core/post-title',
						{
							isLink: true,
							level: 3,
							__woocommerceNamespace:
								'woocommerce/product-collection/product-title',
						},
					],
					[
						'woocommerce/product-price',
						{ isDescendentOfQueryLoop: true },
					],
				],
			],
		],
	],
];

export default function Edit() {
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: TEMPLATE,
	} );

	return <section { ...innerBlocksProps } />;
}
