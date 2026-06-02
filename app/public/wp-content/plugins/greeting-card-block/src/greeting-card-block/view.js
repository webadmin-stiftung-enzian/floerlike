/**
 * Use this file for JavaScript code that you want to run in the front-end
 * on posts/pages that contain this block.
 *
 * When this file is defined as the value of the `viewScript` property
 * in `block.json` it will be enqueued on the front end of the site.
 *
 * Example:
 *
 * ```js
 * {
 *   "viewScript": "file:./view.js"
 * }
 * ```
 *
 * If you're not making any changes to this file because your project doesn't need any
 * JavaScript running in the front-end, then you should delete this file and remove
 * the `viewScript` property from `block.json`.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-metadata/#view-script
 */

// import Swiper JS
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
// import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

/* eslint-disable no-console */
console.log(
	'Hello World! (from greeting-card-block-greeting-card-block block)'
);
/* eslint-enable no-console */

// Initialize Swiper
const swiper = new Swiper('.swiper', {
	modules: [Navigation, Pagination],
	loop: true,
	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
	pagination: {
		el: '.swiper-pagination',
		clickable: true,
	},
});

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((element) => {
	element.style.display = 'none';
});

const contentElement = document.querySelector('.greeting-card-block__content');

console.log('Swiper initialized:', swiper);

document.getElementById('isGreetingCardChecked').addEventListener('change', function () {
	if (this.checked) {
		contentElement.style.display = 'block';
	} else {
		contentElement.style.display = 'none';	
	}
});