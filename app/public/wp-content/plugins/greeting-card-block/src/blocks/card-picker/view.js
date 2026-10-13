/**
 * Block "Grusskarten-Auswahl": Kartenwahl und Slider.
 *
 * Swiper wird nur hier geladen -- die anderen Kauf-Blöcke brauchen ihn nicht.
 */
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getContext, getElement } from '@wordpress/interactivity';

const { state } = store( 'greeting-card-bundle', {
	actions: {
		// Radio-Verhalten: eine Karte ist gewählt, bis eine andere gewählt wird.
		// Ganz ohne Karte geht es über die Checkbox "Grusskarte hinzufügen".
		selectCard() {
			state.selectedCardId = getContext().cardId;
		},
	},
	callbacks: {
		// ref ist der äussere .slider; Swiper selbst läuft auf dem inneren
		// .swiper. Pfeile und Punkte liegen daneben (gleiche Struktur wie der
		// Slider-Block, siehe main.css "SLIDER") -- daher ":scope >", damit nur
		// die eigenen Elemente gefunden werden.
		initSwiper() {
			const { ref } = getElement();
			const swiper = new Swiper(
				ref.querySelector( ':scope > .swiper' ),
				{
					modules: [ Navigation, Pagination ],
					loop: false,
					// Der Block ist beim Laden ausgeblendet (keine Karte gewünscht).
					// Ohne diese Beobachtung würde Swiper seine Masse an einem
					// unsichtbaren Element messen und falsch darstellen, sobald der
					// Block erscheint.
					observer: true,
					observeParents: true,
					navigation: {
						nextEl: ref.querySelector(
							':scope > .swiper-button-next'
						),
						prevEl: ref.querySelector(
							':scope > .swiper-button-prev'
						),
					},
					pagination: {
						el: ref.querySelector( ':scope > .swiper-pagination' ),
						clickable: true,
					},
				}
			);

			// Mit den Pfeiltasten wandert die Auswahl durch die Radio-Gruppe --
			// auch zu Karten, die gerade ausserhalb des Sliders liegen. Dann
			// den Slider mitziehen, damit die gewählte Karte sichtbar ist.
			ref.addEventListener( 'focusin', ( event ) => {
				const slide = event.target.closest( '.swiper-slide' );
				const index = swiper.slides.indexOf( slide );
				if ( index >= 0 && index !== swiper.activeIndex ) {
					swiper.slideTo( index );
				}
			} );
		},
	},
} );
