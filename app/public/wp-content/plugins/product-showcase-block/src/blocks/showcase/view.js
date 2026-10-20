/**
 * Schaufenster im Browser: Filter wählen und Zeilen ausdünnen
 * (Spezifikation, Kapitel 7).
 *
 * Der Zustand steht im Kontext des Rahmens (render.php):
 *
 *   activeTag    Slug des gewählten Schlagworts, null = kein Filter
 *   activeClass  CSS-Klasse, die WooCommerce passenden Produkten gibt
 *                (product_tag-…, psb_tag_class() in includes/class-blocks.php)
 *
 * Die Knöpfe (filter/render.php) liegen im Rahmen und erben diesen Kontext;
 * ihr eigener Kontext ergänzt tag und tagClass.
 *
 * Gefiltert wird nur im Browser, ohne neue Abfrage: Der Server liefert jeder
 * Zeile alle Produkte ihrer Kategorie, ein Filter verkleinert die Menge nur.
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Alle Produkte je Liste in ursprünglicher Reihenfolge, beim ersten Filtern
 * gemerkt. Swiper kommt mit versteckten Folien nicht zurecht (er rechnet sie
 * mit) -- unpassende Produkte werden deshalb aus der Liste genommen und beim
 * Aufheben aus diesem Speicher zurückgelegt.
 */
const allProducts = new WeakMap();

const PRODUCT = '.wc-block-product';

/**
 * Filter auf alle Zeilen anwenden.
 *
 * @param {HTMLElement} root        Rahmen.
 * @param {?string}     activeClass Klasse der passenden Produkte, null = alle.
 */
function applyFilter( root, activeClass ) {
	root.querySelectorAll( '.wp-block-product-showcase-row' ).forEach(
		( row ) => {
			let visible = 0;
			const sliders = [];

			row.querySelectorAll( '.wc-block-product-template' ).forEach(
				( list ) => {
					if ( ! allProducts.has( list ) ) {
						// Noch nie gefiltert und kein Filter: nichts zu tun.
						if ( ! activeClass ) {
							visible += list.querySelectorAll(
								`:scope > ${ PRODUCT }`
							).length;
							return;
						}
						allProducts.set( list, [
							...list.querySelectorAll( `:scope > ${ PRODUCT }` ),
						] );
					}

					const all = allProducts.get( list );
					const keep = activeClass
						? all.filter( ( product ) =>
								product.classList.contains( activeClass )
						  )
						: all;

					list.replaceChildren( ...keep );
					visible += keep.length;

					// Swiper hängt sich als .swiper an sein Element.
					const swiper = list.closest( '.swiper' )?.swiper;
					if ( swiper ) {
						sliders.push( swiper );
					}
				}
			);

			// Erst sichtbar machen, dann Swiper neu rechnen lassen: in einer
			// versteckten Zeile hätte er keine Breite.
			row.hidden = visible === 0;
			if ( ! row.hidden ) {
				sliders.forEach( ( swiper ) => {
					swiper.update();
					swiper.slideTo( 0, 0 );
				} );
			}
		}
	);
}

store( 'product-showcase', {
	state: {
		/**
		 * Ist der Knopf (Kontext mit tag) der gewählte Filter?
		 *
		 * @return {boolean} Gewählt.
		 */
		get isPressed() {
			const context = getContext();
			return !! context.tag && context.activeTag === context.tag;
		},
	},
	actions: {
		/**
		 * Klick auf einen Filter-Knopf: wählen, oder -- war er schon
		 * gewählt -- aufheben. Höchstens ein Filter ist aktiv.
		 */
		toggleTag() {
			const context = getContext();
			const off = context.activeTag === context.tag;

			context.activeTag = off ? null : context.tag;
			context.activeClass = off ? null : context.tagClass;
		},
	},
	callbacks: {
		/**
		 * Läuft beim Start und bei jeder Änderung von activeClass
		 * (data-wp-watch am Rahmen).
		 */
		applyFilter() {
			const { activeClass } = getContext();
			const { ref } = getElement();
			applyFilter( ref, activeClass );
		},
	},
} );
