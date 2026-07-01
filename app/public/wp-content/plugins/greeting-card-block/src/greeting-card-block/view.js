// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import { store, getElement } from '@wordpress/interactivity';

const MAX_LENGTH = 300;

const { state } = store('greeting-card-block', {
	state: {
		get charCounter() {
			return `Zeichen verbleibend: ${MAX_LENGTH - state.text.length}`;
		},
		get isCardPressed() {
			const { ref } = getElement();
			return state.selectedCardId === ref.dataset.cardId;
		},
		get isCardSelected() {
			return state.selectedCardId !== '';
		},
		get hasText() {
			return state.text.trim() !== '';
		},
		get isValid() {
			return ! state.wantsCard || ( state.isCardSelected && state.hasText );
		},
		get showCardError() {
			return state.wantsCard && state.validated && ! state.isCardSelected;
		},
		get showTextError() {
			return state.wantsCard && state.validated && ! state.hasText;
		},
	},
	actions: {
		toggleWantsCard( event ) {
			state.wantsCard = event.target.checked;
		},
		selectCard() {
			const { ref } = getElement();
			const cardId = ref.dataset.cardId;
			state.selectedCardId = state.selectedCardId === cardId ? '' : cardId;
		},
		updateText( event ) {
			state.text = event.target.value.substring( 0, MAX_LENGTH );
		},
	},
	callbacks: {
		initSwiper() {
			const { ref } = getElement();
			new Swiper( ref, {
				modules: [ Navigation, Pagination ],
				loop: false,
				navigation: {
					nextEl: '.swiper-button-next',
					prevEl: '.swiper-button-prev',
				},
				pagination: {
					el: '.swiper-pagination',
					clickable: true,
				},
			} );
		},
	},
} );

// Add-to-Cart blockieren, solange die Grußkarte unvollständig ist.
document.addEventListener(
	'submit',
	( event ) => {
		const form = event.target;
		if (
			! ( form instanceof HTMLElement ) ||
			! form.matches(
				'form.wp-block-woocommerce-add-to-cart-with-options, form.cart'
			)
		) {
			return;
		}

		state.validated = true;

		if ( ! state.isValid ) {
			event.preventDefault();
			event.stopImmediatePropagation();
		}
	},
	true
);
