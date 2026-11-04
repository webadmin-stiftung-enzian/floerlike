/**
 * Akkordeon (core/accordion): Auf- und Zuklappen mit GSAP.
 *
 * Das Akkordeon gehört WordPress: Die Interactivity API setzt beim Schliessen
 * hidden="until-found" am Panel und entfernt es beim Öffnen. Dieses Skript
 * greift in nichts davon ein -- es beobachtet nur das Attribut und animiert
 * dazu. So laufen auch Öffnen über einen Link (#anker) und über die Suche im
 * Browser animiert, und der Zustand bleibt der von WordPress.
 *
 *   Öffnen     Höhe und Innenabstand wachsen von 0, die Blöcke im Panel
 *              schieben sich gestaffelt von oben herein.
 *   Schliessen WordPress hat das Panel schon versteckt; die Klasse
 *              is-animating hält es sichtbar (main.css), bis Höhe und
 *              Innenabstand bei 0 sind.
 *
 * Den Innenabstand setzt main.css mit !important (WordPress auch, für das
 * geschlossene Panel) -- ein Inline-Wert käme dagegen nicht an. Animiert wird
 * deshalb die Variable --accordion-panel-padding, die main.css während der
 * Animation verwendet.
 *
 * Ohne GSAP oder bei "Bewegung reduzieren" klappt das Akkordeon wie gewohnt
 * ohne Animation.
 */
( function () {
	if ( ! window.gsap ) {
		return;
	}

	const reduceMotion = window.matchMedia( '(prefers-reduced-motion: reduce)' );

	// autoRound: GSAP rundet Pixelwerte sonst auf ganze Zahlen -- die
	// Endhöhe läge dann einen Bruchteil neben der echten, ein Ruck am Ende.
	const OPEN = { duration: 0.5, ease: 'power3.out', autoRound: false };
	const CLOSE = { duration: 0.35, ease: 'power2.inOut', autoRound: false };
	// Die Blöcke im Panel: kurz nach dem Panel, je 60 ms versetzt.
	const STAGGER = { y: -24, delay: 0.08, each: 0.06, duration: 0.45, ease: 'power2.out' };

	// Unrundet: offsetHeight rundet auf ganze Pixel, am Ende der Animation
	// bliebe ein Rest von einem Bruchteil eines Pixels als Ruck.
	const exactHeight = ( element ) => element.getBoundingClientRect().height;

	function setup( panel ) {
		// Höhe im offenen Zustand -- beim Schliessen ist sie schon weg, weil
		// WordPress das Panel vor der Animation versteckt.
		let openHeight = panel.hidden ? 0 : exactHeight( panel );
		let timeline = null;

		new ResizeObserver( () => {
			if ( ! panel.hidden && ! panel.classList.contains( 'is-animating' ) ) {
				openHeight = exactHeight( panel );
			}
		} ).observe( panel );

		const finish = () => {
			panel.classList.remove( 'is-animating' );
			gsap.set( panel, { clearProps: 'height,--accordion-panel-padding' } );
			gsap.set( panel.children, { clearProps: 'transform,opacity,visibility' } );
			if ( ! panel.hidden ) {
				openHeight = exactHeight( panel );
			}
		};

		new MutationObserver( () => {
			if ( timeline ) {
				timeline.kill();
				timeline = null;
			}
			if ( reduceMotion.matches ) {
				finish();
				return;
			}

			const children = Array.from( panel.children );
			panel.classList.add( 'is-animating' );

			if ( panel.hidden ) {
				timeline = gsap
					.timeline( { onComplete: finish } )
					.fromTo(
						panel,
						{ height: openHeight, '--accordion-panel-padding': '1.5rem' },
						{ height: 0, '--accordion-panel-padding': '0rem', ...CLOSE },
						0
					)
					.to( children, { autoAlpha: 0, duration: CLOSE.duration * 0.6, ease: 'power1.in' }, 0 );
				return;
			}

			gsap.set( panel, { '--accordion-panel-padding': '1.5rem' } );
			const height = exactHeight( panel );

			timeline = gsap
				.timeline( { onComplete: finish } )
				.fromTo(
					panel,
					{ height: 0, '--accordion-panel-padding': '0rem' },
					{ height, '--accordion-panel-padding': '1.5rem', ...OPEN },
					0
				)
				.from(
					children,
					{
						y: STAGGER.y,
						autoAlpha: 0,
						duration: STAGGER.duration,
						ease: STAGGER.ease,
						stagger: STAGGER.each,
					},
					STAGGER.delay
				);
		} ).observe( panel, { attributes: true, attributeFilter: [ 'hidden' ] } );
	}

	function init() {
		document.querySelectorAll( '.wp-block-accordion-panel' ).forEach( setup );
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
} )();
