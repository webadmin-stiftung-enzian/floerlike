/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/img-svg-block/edit.js"
/*!***********************************!*\
  !*** ./src/img-svg-block/edit.js ***!
  \***********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ Edit)
/* harmony export */ });
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/i18n */ "@wordpress/i18n");
/* harmony import */ var _wordpress_i18n__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/block-editor */ "@wordpress/block-editor");
/* harmony import */ var _wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/@wordpress/icons/build-module/library/background.mjs");
/* harmony import */ var _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! @wordpress/icons */ "./node_modules/@wordpress/icons/build-module/library/image.mjs");
/* harmony import */ var _editor_scss__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./editor.scss */ "./src/img-svg-block/editor.scss");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__);
/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */


/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */




/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */


/**
 * Formats a focal point object as a CSS position string.
 *
 * @param {{x: number, y: number}} focalPoint Focal point value.
 * @return {string} CSS position, e.g. "50% 50%".
 */

const focalPointToPosition = focalPoint => `${(focalPoint?.x ?? 0.5) * 100}% ${(focalPoint?.y ?? 0.5) * 100}%`;

/**
 * Converts a "Größe" scale attribute (-200..200, 0 = original size) into a
 * CSS transform scale factor, so the shape grows/shrinks as a whole and can
 * overflow past the block's edges instead of just zooming inside a fixed mask.
 *
 * @param {number} scale Scale attribute value.
 * @return {number} Non-negative scale factor for `transform: scale()`.
 */
const scaleToFactor = scale => Math.max(0, 1 + (Number(scale) || 0) / 100);

/**
 * Inverse of a scale factor, for cancelling out a parent's `transform: scale()`
 * on a child element (e.g. so a photo doesn't visually zoom while the mask
 * "window" revealing it grows/shrinks). Guards against dividing by zero when
 * the parent is fully scaled down to invisible.
 *
 * @param {number} factor Scale factor (as returned by `scaleToFactor`).
 * @return {number} Counter-scale factor.
 */
const counterScaleFactor = factor => factor > 0 ? 1 / factor : 1;

/**
 * Builds the style for a mask "box" element sized to fill its container
 * exactly. `mask-size: contain` fits the SVG entirely within it at 0 %
 * scale, whichever axis is the limiting one — unlike forcing the height to
 * 100 % (which clips the sides of an SVG whose aspect ratio is wider than
 * the container's), this never crops anything, regardless of the SVG's
 * proportions. The whole box is then grown/shrunk via `transform: scale()`
 * anchored at the focal point, so it stays proportionally consistent across
 * screen sizes while still being able to bleed past the container's edges.
 *
 * @param {Object}                  props
 * @param {string}                  props.url        Mask image URL.
 * @param {{x: number, y: number}}  props.focalPoint Focal point value.
 * @param {number}                  props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildMaskBoxStyle = ({
  url,
  focalPoint,
  scale
}) => ({
  position: 'absolute',
  inset: 0,
  zIndex: 1,
  WebkitMaskImage: `url(${url})`,
  maskImage: `url(${url})`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
  WebkitMaskPosition: focalPointToPosition(focalPoint),
  maskPosition: focalPointToPosition(focalPoint),
  transform: `scale(${scaleToFactor(scale)})`,
  transformOrigin: focalPointToPosition(focalPoint)
});

/**
 * Builds the style for a solid-color mask "shape" element (background shape
 * or standalone foreground SVG) — a mask box filled with a flat color.
 *
 * @param {Object}                  props
 * @param {string}                  props.url        Mask image URL.
 * @param {string}                  props.fillColor  CSS color.
 * @param {{x: number, y: number}}  props.focalPoint Focal point value.
 * @param {number}                  props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildShapeStyle = ({
  url,
  fillColor,
  focalPoint,
  scale
}) => ({
  ...buildMaskBoxStyle({
    url,
    focalPoint,
    scale
  }),
  backgroundColor: fillColor || '#000000'
});

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
function Edit({
  attributes,
  setAttributes
}) {
  const blockProps = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.useBlockProps)();
  const {
    'fg-type': fgType,
    'img-url': imgUrl,
    'img-alt': imgAlt,
    'img-id': imgId,
    'img-width': imgWidth,
    'img-height': imgHeight,
    'fg-svg-url': fgSvgUrl,
    'fg-svg-alt': fgSvgAlt,
    'fg-svg-id': fgSvgId,
    'fg-svg-fill-color': fgSvgFillColor,
    'fg-svg-scale': fgSvgScale,
    'fg-focal-point': fgFocalPoint,
    'svg-url': svgUrl,
    'svg-alt': svgAlt,
    'svg-id': svgId,
    'svg-fill-color': svgFillColor,
    'svg-enable': svgEnable,
    'img-mask-enable': imgMaskEnable,
    'svg-scale': svgScale,
    'svg-focal-point': svgFocalPoint
  } = attributes;
  const [colorPalette] = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.useSettings)('color.palette');
  const isPixelForeground = fgType !== 'svg';
  const hasForeground = isPixelForeground ? !!imgUrl : !!fgSvgUrl;
  const foregroundPreviewUrl = isPixelForeground ? imgUrl : fgSvgUrl;
  const onSelectImage = media => {
    setAttributes({
      'img-url': media.url,
      'img-id': String(media.id),
      'img-alt': media.alt || '',
      'img-width': media.width || undefined,
      'img-height': media.height || undefined
    });
  };
  const onRemoveImage = () => {
    setAttributes({
      'img-url': '',
      'img-id': '',
      'img-alt': '',
      'img-width': undefined,
      'img-height': undefined
    });
  };
  const onSelectForegroundSvg = media => {
    setAttributes({
      'fg-svg-url': media.url,
      'fg-svg-id': String(media.id),
      'fg-svg-alt': media.alt || ''
    });
  };
  const onRemoveForegroundSvg = () => {
    setAttributes({
      'fg-svg-url': '',
      'fg-svg-id': '',
      'fg-svg-alt': ''
    });
  };
  const onSelectSvg = media => {
    setAttributes({
      'svg-url': media.url,
      'svg-id': String(media.id),
      'svg-alt': media.alt || ''
    });
  };
  const onRemoveSvg = () => {
    setAttributes({
      'svg-url': '',
      'svg-id': '',
      'svg-alt': ''
    });
  };
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.InspectorControls, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hintergrund', 'img-svg-block'),
          icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__["default"],
          initialOpen: true,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hintergrundform anzeigen', 'img-svg-block'),
              checked: !!svgEnable,
              onChange: value => setAttributes({
                'svg-enable': value
              })
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                onSelect: onSelectSvg,
                allowedTypes: ['image/svg+xml'],
                value: svgId,
                render: ({
                  open
                }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                  onClick: open,
                  variant: "secondary",
                  children: svgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block')
                })
              })
            })
          }), svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              onClick: onRemoveSvg,
              variant: "link",
              isDestructive: true,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG entfernen', 'img-svg-block')
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPalette, {
              colors: colorPalette,
              value: svgFillColor,
              onChange: color => setAttributes({
                'svg-fill-color': color
              })
            })
          }), isPixelForeground && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Vordergrund-Bild in Hintergrundform anzeigen', 'img-svg-block'),
              help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Schneidet das Vordergrundbild in die Form des SVGs (Maske).', 'img-svg-block'),
              checked: !!imgMaskEnable,
              onChange: value => setAttributes({
                'img-mask-enable': value
              })
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Größe', 'img-svg-block'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('0 % = Form ist vollständig sichtbar, ohne Beschnitt. Negative Werte verkleinern, positive vergrößern die Form – vom Fokuspunkt aus.', 'img-svg-block'),
            value: svgScale,
            onChange: value => setAttributes({
              'svg-scale': value
            }),
            min: -200,
            max: 400,
            step: 1
          }), svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FocalPointPicker, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fokuspunkt der Form', 'img-svg-block'),
              url: svgUrl,
              value: svgFocalPoint,
              onChange: value => setAttributes({
                'svg-focal-point': value
              })
            })
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Vordergrund', 'img-svg-block'),
          icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
          initialOpen: true,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RadioControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Format', 'img-svg-block'),
              selected: fgType || 'pixel',
              options: [{
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Pixelbild', 'img-svg-block'),
                value: 'pixel'
              }, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Vektorgrafik (SVG)', 'img-svg-block'),
                value: 'svg'
              }],
              onChange: value => setAttributes({
                'fg-type': value
              })
            })
          }), isPixelForeground ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                  onSelect: onSelectImage,
                  allowedTypes: ['image'],
                  value: imgId,
                  render: ({
                    open
                  }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    onClick: open,
                    variant: "primary",
                    children: imgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild auswählen', 'img-svg-block')
                  })
                })
              })
            }), imgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                onClick: onRemoveImage,
                variant: "link",
                isDestructive: true,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild entfernen', 'img-svg-block')
              })
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                  onSelect: onSelectForegroundSvg,
                  allowedTypes: ['image/svg+xml'],
                  value: fgSvgId,
                  render: ({
                    open
                  }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    onClick: open,
                    variant: "primary",
                    children: fgSvgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block')
                  })
                })
              })
            }), fgSvgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                onClick: onRemoveForegroundSvg,
                variant: "link",
                isDestructive: true,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG entfernen', 'img-svg-block')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPalette, {
                colors: colorPalette,
                value: fgSvgFillColor,
                onChange: color => setAttributes({
                  'fg-svg-fill-color': color
                })
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Größe', 'img-svg-block'),
              help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('0 % = Form ist vollständig sichtbar, ohne Beschnitt. Negative Werte verkleinern, positive vergrößern die Form – vom Fokuspunkt aus.', 'img-svg-block'),
              value: fgSvgScale,
              onChange: value => setAttributes({
                'fg-svg-scale': value
              }),
              min: -200,
              max: 200,
              step: 1
            })]
          }), hasForeground && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FocalPointPicker, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fokuspunkt', 'img-svg-block'),
              url: foregroundPreviewUrl,
              value: fgFocalPoint,
              onChange: value => setAttributes({
                'fg-focal-point': value
              })
            })
          })]
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("figure", {
      ...blockProps,
      style: {
        ...blockProps.style,
        aspectRatio: isPixelForeground && imgWidth && imgHeight ? `${imgWidth} / ${imgHeight}` : undefined
      },
      children: !hasForeground ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Placeholder, {
        icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild mit SVG-Hintergrund', 'img-svg-block'),
        instructions: isPixelForeground ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Wähle ein Bild aus der Mediathek aus.', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Wähle eine SVG-Datei aus der Mediathek aus.', 'img-svg-block'),
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
            onSelect: isPixelForeground ? onSelectImage : onSelectForegroundSvg,
            allowedTypes: isPixelForeground ? ['image'] : ['image/svg+xml'],
            value: isPixelForeground ? imgId : fgSvgId,
            render: ({
              open
            }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              onClick: open,
              variant: "primary",
              children: isPixelForeground ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild auswählen', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block')
            })
          })
        })
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.Fragment, {
        children: [svgEnable && svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          className: "img-svg-block__shape",
          style: buildShapeStyle({
            url: svgUrl,
            fillColor: svgFillColor,
            focalPoint: svgFocalPoint,
            scale: svgScale
          }),
          "aria-hidden": "true"
        }), isPixelForeground ? imgMaskEnable && svgUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          className: "img-svg-block__mask-wrapper",
          style: buildMaskBoxStyle({
            url: svgUrl,
            focalPoint: svgFocalPoint,
            scale: svgScale
          }),
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("img", {
            className: "img-svg-block__image img-svg-block__image--masked",
            src: imgUrl,
            alt: imgAlt || '',
            style: {
              position: 'absolute',
              inset: 0,
              objectPosition: focalPointToPosition(fgFocalPoint),
              transform: `scale(${counterScaleFactor(scaleToFactor(svgScale))})`,
              transformOrigin: focalPointToPosition(svgFocalPoint)
            }
          })
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("img", {
          className: "img-svg-block__image",
          src: imgUrl,
          alt: imgAlt || '',
          style: {
            objectPosition: focalPointToPosition(fgFocalPoint)
          }
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_6__.jsx)("span", {
          className: "img-svg-block__image img-svg-block__image--svg",
          style: buildShapeStyle({
            url: fgSvgUrl,
            fillColor: fgSvgFillColor,
            focalPoint: fgFocalPoint,
            scale: fgSvgScale
          }),
          role: "img",
          "aria-label": fgSvgAlt || ''
        })]
      })
    })]
  });
}

/***/ },

/***/ "./src/img-svg-block/index.js"
/*!************************************!*\
  !*** ./src/img-svg-block/index.js ***!
  \************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/blocks */ "@wordpress/blocks");
/* harmony import */ var _wordpress_blocks__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_scss__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./style.scss */ "./src/img-svg-block/style.scss");
/* harmony import */ var _edit__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./edit */ "./src/img-svg-block/edit.js");
/* harmony import */ var _block_json__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./block.json */ "./src/img-svg-block/block.json");
/**
 * Registers a new block provided a unique name and an object defining its behavior.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */


/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * All files containing `style` keyword are bundled together. The code used
 * gets applied both to the front of your site and to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */


/**
 * Internal dependencies
 */



/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
(0,_wordpress_blocks__WEBPACK_IMPORTED_MODULE_0__.registerBlockType)(_block_json__WEBPACK_IMPORTED_MODULE_3__.name, {
  /**
   * @see ./edit.js
   */
  edit: _edit__WEBPACK_IMPORTED_MODULE_2__["default"]
});

/***/ },

/***/ "./src/img-svg-block/editor.scss"
/*!***************************************!*\
  !*** ./src/img-svg-block/editor.scss ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "./src/img-svg-block/style.scss"
/*!**************************************!*\
  !*** ./src/img-svg-block/style.scss ***!
  \**************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
// extracted by mini-css-extract-plugin


/***/ },

/***/ "react/jsx-runtime"
/*!**********************************!*\
  !*** external "ReactJSXRuntime" ***!
  \**********************************/
(module) {

module.exports = window["ReactJSXRuntime"];

/***/ },

/***/ "@wordpress/block-editor"
/*!*************************************!*\
  !*** external ["wp","blockEditor"] ***!
  \*************************************/
(module) {

module.exports = window["wp"]["blockEditor"];

/***/ },

/***/ "@wordpress/blocks"
/*!********************************!*\
  !*** external ["wp","blocks"] ***!
  \********************************/
(module) {

module.exports = window["wp"]["blocks"];

/***/ },

/***/ "@wordpress/components"
/*!************************************!*\
  !*** external ["wp","components"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["components"];

/***/ },

/***/ "@wordpress/i18n"
/*!******************************!*\
  !*** external ["wp","i18n"] ***!
  \******************************/
(module) {

module.exports = window["wp"]["i18n"];

/***/ },

/***/ "@wordpress/primitives"
/*!************************************!*\
  !*** external ["wp","primitives"] ***!
  \************************************/
(module) {

module.exports = window["wp"]["primitives"];

/***/ },

/***/ "./node_modules/@wordpress/icons/build-module/library/background.mjs"
/*!***************************************************************************!*\
  !*** ./node_modules/@wordpress/icons/build-module/library/background.mjs ***!
  \***************************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ background_default)
/* harmony export */ });
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
// packages/icons/src/library/background.tsx


var background_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__.Path, { fillRule: "evenodd", clipRule: "evenodd", d: "M11.53 4.47a.75.75 0 1 0-1.06 1.06l8 8a.75.75 0 1 0 1.06-1.06l-8-8Zm5 1a.75.75 0 1 0-1.06 1.06l2 2a.75.75 0 1 0 1.06-1.06l-2-2Zm-11.06 10a.75.75 0 0 1 1.06 0l2 2a.75.75 0 1 1-1.06 1.06l-2-2a.75.75 0 0 1 0-1.06Zm.06-5a.75.75 0 0 0-1.06 1.06l8 8a.75.75 0 1 0 1.06-1.06l-8-8Zm-.06-3a.75.75 0 0 1 1.06 0l10 10a.75.75 0 1 1-1.06 1.06l-10-10a.75.75 0 0 1 0-1.06Zm3.06-2a.75.75 0 0 0-1.06 1.06l10 10a.75.75 0 1 0 1.06-1.06l-10-10Z" }) });

//# sourceMappingURL=background.mjs.map


/***/ },

/***/ "./node_modules/@wordpress/icons/build-module/library/image.mjs"
/*!**********************************************************************!*\
  !*** ./node_modules/@wordpress/icons/build-module/library/image.mjs ***!
  \**********************************************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ image_default)
/* harmony export */ });
/* harmony import */ var _wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @wordpress/primitives */ "@wordpress/primitives");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
// packages/icons/src/library/image.tsx


var image_default = /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__.SVG, { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ (0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_1__.jsx)(_wordpress_primitives__WEBPACK_IMPORTED_MODULE_0__.Path, { d: "M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 4.5h14c.3 0 .5.2.5.5v8.4l-3-2.9c-.3-.3-.8-.3-1 0L11.9 14 9 12c-.3-.2-.6-.2-.8 0l-3.6 2.6V5c-.1-.3.1-.5.4-.5zm14 15H5c-.3 0-.5-.2-.5-.5v-2.4l4.1-3 3 1.9c.3.2.7.2.9-.1L16 12l3.5 3.4V19c0 .3-.2.5-.5.5z" }) });

//# sourceMappingURL=image.mjs.map


/***/ },

/***/ "./src/img-svg-block/block.json"
/*!**************************************!*\
  !*** ./src/img-svg-block/block.json ***!
  \**************************************/
(module) {

module.exports = /*#__PURE__*/JSON.parse('{"$schema":"https://schemas.wp.org/trunk/block.json","apiVersion":3,"name":"stiftung-enzian/img-svg-block","version":"0.1.0","title":"Bild mit SVG-Hintergrund","category":"media","icon":"smiley","description":"Bild-Block mit optionalem SVG-Formhintergrund.","example":{},"attributes":{"fg-type":{"type":"string","default":"pixel"},"img-url":{"type":"string"},"img-alt":{"type":"string"},"img-id":{"type":"string"},"img-width":{"type":"number"},"img-height":{"type":"number"},"fg-svg-url":{"type":"string"},"fg-svg-alt":{"type":"string"},"fg-svg-id":{"type":"string"},"fg-svg-fill-color":{"type":"string"},"fg-svg-scale":{"type":"number","default":0},"fg-focal-point":{"type":"object","default":{"x":0.5,"y":0.5}},"svg-url":{"type":"string"},"svg-alt":{"type":"string"},"svg-id":{"type":"string"},"svg-fill-color":{"type":"string"},"svg-enable":{"type":"boolean","default":false},"img-mask-enable":{"type":"boolean","default":false},"svg-scale":{"type":"number","default":0},"svg-focal-point":{"type":"object","default":{"x":0.5,"y":0.5}}},"supports":{"align":["wide","full"],"anchor":true},"textdomain":"img-svg-block","editorScript":"file:./index.js","editorStyle":"file:./index.css","style":"file:./style-index.css","render":"file:./render.php","viewScript":"file:./view.js"}');

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	const __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		const cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		const module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		if (!(moduleId in __webpack_modules__)) {
/******/ 			delete __webpack_module_cache__[moduleId];
/******/ 			const e = new Error("Cannot find module '" + moduleId + "'");
/******/ 			e.code = 'MODULE_NOT_FOUND';
/******/ 			throw e;
/******/ 		}
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		const deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			let notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				let [chunkIds, fn, priority] = deferred[i];
/******/ 				let fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					const r = fn();
/******/ 					if (r !== undefined) result = r;
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			const getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter/value functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			if(Array.isArray(definition)) {
/******/ 				var i = 0;
/******/ 				while(i < definition.length) {
/******/ 					var key = definition[i++];
/******/ 					var binding = definition[i++];
/******/ 					if(!__webpack_require__.o(exports, key)) {
/******/ 						if(binding === 0) {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, value: definition[i++] });
/******/ 						} else {
/******/ 							Object.defineProperty(exports, key, { enumerable: true, get: binding });
/******/ 						}
/******/ 					} else if(binding === 0) { i++; }
/******/ 				}
/******/ 			} else {
/******/ 				for(var key in definition) {
/******/ 					if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 						Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.hasOwn(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		const installedChunks = {
/******/ 			"img-svg-block/index": 0,
/******/ 			"img-svg-block/style-index": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		const webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			let [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			if(chunkIds.some((id) => (installedChunks[id] !== 0))) {
/******/ 				for(moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 					}
/******/ 				}
/******/ 				if(runtime) var result = runtime(__webpack_require__);
/******/ 			}
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		const chunkLoadingGlobal = globalThis["webpackChunkimg_svg_block"] ||= [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	let __webpack_exports__ = __webpack_require__.O(undefined, ["img-svg-block/style-index"], () => (__webpack_require__("./src/img-svg-block/index.js")))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;
//# sourceMappingURL=index.js.map