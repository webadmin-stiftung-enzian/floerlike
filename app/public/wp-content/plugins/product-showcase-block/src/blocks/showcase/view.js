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
 *
 * Der Filter steht in der Adresse (?filter=…), damit man den Link teilen
 * kann. Steht er beim Laden schon dort, hat der Server die Seite bereits
 * gefiltert (psb_apply_server_filter()).
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

/** Name des Parameters, wie PSB_FILTER_PARAM in includes/class-blocks.php. */
const PARAM = 'filter';

/**
 * Filter in die Adresse schreiben bzw. entfernen -- ohne neuen Eintrag im
 * Verlauf: "Zurück" führt weiter zur vorigen Seite, nicht durch jeden Klick.
 *
 * @param {?string} tag Slug des Schlagworts, null = kein Filter.
 */
function updateUrl( tag ) {
	const url = new URL( window.location.href );
	if ( tag ) {
		url.searchParams.set( PARAM, tag );
	} else {
		url.searchParams.delete( PARAM );
	}
	window.history.replaceState( window.history.state, '', url );
}

/**
 * Filter auf alle Zeilen anwenden.
 *
 * @param {HTMLElement} root        Rahmen.
 * @param {?string}     activeClass Klasse der passenden Produkte, null = alle.
 * @return {{products: number, rows: number}} Sichtbare Produkte und Zeilen.
 */
function applyFilter( root, activeClass ) {
	const total = { products: 0, rows: 0 };

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
						const products = [
							...list.querySelectorAll( `:scope > ${ PRODUCT }` ),
						];
						// Mit ?filter= hat der Server unpassende Produkte schon
						// versteckt. Ab jetzt regelt das Herausnehmen die
						// Sichtbarkeit -- sonst blieben sie nach dem Aufheben
						// unsichtbar.
						products.forEach( ( product ) => {
							product.hidden = false;
						} );
						allProducts.set( list, products );
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
				total.products += visible;
				total.rows += 1;
				sliders.forEach( ( swiper ) => {
					swiper.update();
					swiper.slideTo( 0, 0 );
				} );
			}
		}
	);

	return total;
}

/**
 * Text der Ansage für Screenreader, z. B. "12 Produkte in 2 Kategorien".
 * Die Textbausteine kommen übersetzt vom Server (state.messages,
 * includes/class-blocks.php) -- in Skriptmodulen gibt es kein wp.i18n.
 *
 * @param {Object}  messages Textbausteine.
 * @param {Object}  total    Ergebnis von applyFilter().
 * @param {boolean} filtered Ist ein Filter aktiv?
 * @return {string} Ansage.
 */
function announcement( messages, total, filtered ) {
	if ( ! total.products ) {
		return messages.none;
	}
	const products = (
		total.products === 1 ? messages.productOne : messages.productMany
	).replace( '%d', total.products );
	const rows = (
		total.rows === 1 ? messages.rowOne : messages.rowMany
	).replace( '%d', total.rows );
	const result = `${ products } ${ rows }`;

	return filtered ? result : `${ messages.reset } ${ result }`;
}

/** Rahmen, deren erster Lauf schon war -- beim Laden wird nichts angesagt. */
const started = new WeakSet();

const { state } = store( 'product-showcase', {
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
			updateUrl( context.activeTag );
		},

		/**
		 * Knopf in "Kein Treffer": Filter aufheben. Der Fokus geht an den
		 * ersten Filter-Knopf -- der Knopf hier verschwindet ja gleich mit
		 * seinem Block.
		 */
		resetFilter() {
			const context = getContext();
			const { ref } = getElement();

			context.activeTag = null;
			context.activeClass = null;
			updateUrl( null );

			ref.closest( '.wp-block-product-showcase-showcase' )
				?.querySelector( '.psb-filter__button:not([hidden])' )
				?.focus();
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
			const total = applyFilter( ref, activeClass );

			// "Kein Treffer" nur bei aktivem Filter ohne ein einziges Produkt.
			ref.querySelectorAll( '.wp-block-product-showcase-empty' ).forEach(
				( empty ) => {
					empty.hidden = !! total.products || ! activeClass;
				}
			);

			// Ansage erst ab dem ersten Klick, nicht beim Laden der Seite.
			if ( ! started.has( ref ) ) {
				started.add( ref );
				return;
			}
			const live = ref.querySelector( '.psb-showcase__announce' );
			if ( live ) {
				live.textContent = announcement(
					state.messages,
					total,
					!! activeClass
				);
			}
		},
	},
} );
