/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "@woocommerce/blocks-checkout"
/*!****************************************!*\
  !*** external ["wc","blocksCheckout"] ***!
  \****************************************/
(module) {

module.exports = window["wc"]["blocksCheckout"];

/***/ },

/***/ "@woocommerce/block-data"
/*!**************************************!*\
  !*** external ["wc","wcBlocksData"] ***!
  \**************************************/
(module) {

module.exports = window["wc"]["wcBlocksData"];

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			var e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry needs to be wrapped in an IIFE because it needs to be isolated against other modules in the chunk.
(() => {
/*!**********************************************!*\
  !*** ./src/greeting-card-block/cart-sync.js ***!
  \**********************************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _woocommerce_blocks_checkout__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @woocommerce/blocks-checkout */ "@woocommerce/blocks-checkout");
/* harmony import */ var _woocommerce_blocks_checkout__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_woocommerce_blocks_checkout__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _woocommerce_block_data__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @woocommerce/block-data */ "@woocommerce/block-data");
/* harmony import */ var _woocommerce_block_data__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_woocommerce_block_data__WEBPACK_IMPORTED_MODULE_1__);
/**
 * Klassisches viewScript für die WooCommerce-Blocks-Integration.
 *
 * Die WooCommerce-Blocks-APIs (extensionCartUpdate, processErrorResponse)
 * stehen nur als klassische Script-Globals (window.wc.*) zur Verfügung und
 * können daher NICHT aus dem Interactivity-Module (view.js) importiert werden.
 * Deshalb läuft die Cart-Schreiblogik in diesem separaten klassischen Script.
 *
 * Die Auswahl wird bewusst aus dem DOM gelesen (Single Source of Truth), das
 * vom Interactivity-Store in view.js gepflegt wird – so bleiben beide Welten
 * entkoppelt.
 */




// [DEBUG] Bestätigt, dass das klassische viewScript geladen wurde und die
// WooCommerce-Globals verfügbar sind.
/* eslint-disable no-console */
console.log('[greeting-card][DEBUG] cart-sync.js geladen. extensionCartUpdate=', typeof _woocommerce_blocks_checkout__WEBPACK_IMPORTED_MODULE_0__.extensionCartUpdate);
/* eslint-enable no-console */

document.body.addEventListener('wc-blocks_added_to_cart', () => {
  const checkbox = document.getElementById('isGreetingCardChecked');
  const wantsCard = checkbox ? checkbox.checked : false;
  const selectedCard = document.querySelector('.greeting-card-block__card[aria-pressed="true"]');
  const selectedCardId = selectedCard ? selectedCard.dataset.cardId : '';
  const messageElement = document.getElementById('greetingCardMessage');
  const text = messageElement ? messageElement.value.trim() : '';
  if (!wantsCard || !selectedCardId || !text) {
    return;
  }
  (0,_woocommerce_blocks_checkout__WEBPACK_IMPORTED_MODULE_0__.extensionCartUpdate)({
    namespace: 'greeting-card-block',
    data: {
      action: 'add',
      card_id: selectedCardId,
      text
    }
  }).catch(error => (0,_woocommerce_block_data__WEBPACK_IMPORTED_MODULE_1__.processErrorResponse)(error));
});
})();

/******/ })()
;
//# sourceMappingURL=cart-sync.js.map