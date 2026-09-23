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
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _inline_svg__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./inline-svg */ "./src/img-svg-block/inline-svg.js");
/* harmony import */ var _editor_scss__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./editor.scss */ "./src/img-svg-block/editor.scss");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! react/jsx-runtime */ "react/jsx-runtime");
/* harmony import */ var react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8___default = /*#__PURE__*/__webpack_require__.n(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__);
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
 * Internal dependencies
 */


/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */


/**
 * Passes a block attribute through only when it is a single CSS value.
 *
 * These values end up in a `style` attribute, where escaping keeps them from
 * breaking out of the attribute but not from adding declarations of their own —
 * `x; background: url(https://evil.example/beacon)` would leak every visitor's
 * IP to a foreign host. Presets (`var(--wp--preset--…)`) and fluid sizes
 * (`clamp(…)`) have to survive, so what is checked is not the shape of a value
 * but the absence of anything that could end the declaration, start a rule or
 * pull in a remote resource. The server-side counterpart is
 * `img_svg_block_safe_css_value()` in `render.php`.
 *
 * @param {string} value Attribute value.
 * @return {?string} The value, or undefined when it is not one.
 */

const safeCssValue = value => {
  const candidate = String(value ?? '').trim();
  if (!candidate || candidate.length > 200) {
    return undefined;
  }
  return /[;{}\\<>]|url\s*\(|expression\s*\(|@import|\/\*/i.test(candidate) ? undefined : candidate;
};

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
 * Builds the style for a foreground element that is rendered as-is — an
 * `<img>` holding a vector graphic, or an inlined textPath SVG. Unlike a
 * masked shape it keeps its own artwork (colors, gradients, strokes), so it
 * only needs fitting into the block: `contain` shows the whole drawing at
 * 0 %, the focal point decides which part stays put, and `transform: scale()`
 * grows or shrinks it from there.
 *
 * @param {Object}                 props
 * @param {{x: number, y: number}} props.focalPoint Focal point value.
 * @param {number}                 props.scale      Scale attribute value.
 * @return {Object} React style object.
 */
const buildFitStyle = ({
  focalPoint,
  scale
}) => ({
  objectPosition: focalPointToPosition(focalPoint),
  transform: `scale(${scaleToFactor(scale)})`,
  transformOrigin: focalPointToPosition(focalPoint)
});

/**
 * Loads an SVG file and prepares it for embedding, re-running whenever the
 * file, the fitting, the coloring or the text changes.
 *
 * @param {string} url                 SVG file URL, empty when none is selected.
 * @param {string} preserveAspectRatio How the drawing is fitted into the block.
 * @param {string} overrides           CSS properties the block sets, comma-separated
 *                                     so the effect stays a stable dependency.
 * @param {string} text                Replaces the words drawn along a path.
 * @return {{markup: ?string, ownText: string, isLoading: boolean, hasError: boolean}} Load state.
 */
const useInlineSvg = (url, preserveAspectRatio, overrides, text) => {
  const [state, setState] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_5__.useState)({
    markup: null,
    ownText: '',
    isLoading: false,
    hasError: false
  });
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_5__.useEffect)(() => {
    if (!url) {
      setState({
        markup: null,
        ownText: '',
        isLoading: false,
        hasError: false
      });
      return undefined;
    }
    if (!(0,_inline_svg__WEBPACK_IMPORTED_MODULE_6__.isEmbeddableUrl)(url)) {
      // A file from somewhere else is never embedded — see
      // `isEmbeddableUrl` in `inline-svg.js`. Reported as an error so the
      // block falls back to the `<img>` a browser keeps in secure static
      // mode.
      setState({
        markup: null,
        ownText: '',
        isLoading: false,
        hasError: true
      });
      return undefined;
    }
    let isCurrent = true;
    setState(previous => ({
      ...previous,
      isLoading: true,
      hasError: false
    }));
    window.fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(response.statusText);
      }
      return response.text();
    }).then(source => {
      if (!isCurrent) {
        return;
      }
      const prepared = (0,_inline_svg__WEBPACK_IMPORTED_MODULE_6__.prepareInlineSvg)(source, {
        preserveAspectRatio,
        overrides: overrides ? overrides.split(',') : [],
        text
      });
      setState({
        markup: prepared?.markup ?? null,
        ownText: prepared?.text ?? '',
        isLoading: false,
        hasError: !prepared
      });
    }).catch(() => {
      if (isCurrent) {
        setState({
          markup: null,
          ownText: '',
          isLoading: false,
          hasError: true
        });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [url, preserveAspectRatio, overrides, text]);
  return state;
};

/**
 * Reads a preset setting as the flat array every control expects. A site that
 * defines presets at more than one origin hands them over keyed by origin
 * instead — `{ theme: [...], custom: [...] }` — which WordPress's own controls
 * do not all guard against: FontFamilyControl's emptiness check passes an
 * object straight through to `.map()`.
 *
 * @param {Array|Object|undefined} setting Setting as `useSettings` returns it.
 * @return {Array} The presets, flattened across origins.
 */
const toPresets = setting => {
  if (Array.isArray(setting)) {
    return setting;
  }
  return Object.values(setting ?? {}).flat();
};

/**
 * How the textPath layer is fitted into the block: whole and centred, since it
 * frames the foreground rather than being framed with it.
 */
const TEXTPATH_ASPECT_RATIO = 'xMidYMid meet';

/**
 * Renders an embedded SVG, or a placeholder while it is being loaded. The
 * markup is injected rather than referenced so an `<image>` inside it loads
 * and its fills can inherit the CSS `color` set here — see `inline-svg.js`.
 *
 * @param {Object}  props
 * @param {string}  props.className Class name for the wrapper.
 * @param {?string} props.markup    Sanitized SVG markup, null while unavailable.
 * @param {boolean} props.isLoading Whether the file is still being fetched.
 * @param {string}  props.alt       Alternative text.
 * @param {Object}  props.style     Styles the embedded SVG inherits.
 * @return {Element} Element to render.
 */
const InlineSvg = ({
  className,
  markup,
  isLoading,
  alt,
  style
}) => {
  if (!markup) {
    return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
      className: className,
      children: isLoading && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Spinner, {})
    });
  }
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
    className: className,
    style: style,
    role: "img",
    "aria-label": alt || ''
    // Sanitized by `prepareInlineSvg`: no scripts, event handlers or
    // `javascript:` URLs survive it.
    ,
    dangerouslySetInnerHTML: {
      __html: markup
    }
  });
};

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
    'fg-svg-color': fgSvgColor,
    'fg-textpath-enable': fgTextpathEnable,
    'fg-textpath-url': fgTextpathUrl,
    'fg-textpath-alt': fgTextpathAlt,
    'fg-textpath-id': fgTextpathId,
    'fg-textpath-text': fgTextpathText,
    'fg-textpath-color': fgTextpathColor,
    'fg-textpath-font-family': fgTextpathFontFamily,
    'fg-textpath-font-size': fgTextpathFontSize,
    'fg-textpath-letter-spacing': fgTextpathLetterSpacing,
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
  const [palette, fontFamilySetting, fontSizeSetting] = (0,_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.useSettings)('color.palette', 'typography.fontFamilies', 'typography.fontSizes');
  const colorPalette = toPresets(palette);
  const fontFamilies = toPresets(fontFamilySetting);
  const fontSizes = toPresets(fontSizeSetting);
  const isPixelForeground = fgType !== 'svg';
  const hasForeground = isPixelForeground ? !!imgUrl : !!fgSvgUrl;
  const foregroundPreviewUrl = isPixelForeground ? imgUrl : fgSvgUrl;
  const hasTextpath = !isPixelForeground && !!fgTextpathEnable && !!fgTextpathUrl;

  // The foreground SVG is embedded rather than referenced: an `<img>` would
  // put it into secure static mode, where an `<image>` inside it — a cut-out
  // photo from the media library — never loads.
  const foregroundSvg = useInlineSvg(isPixelForeground ? '' : fgSvgUrl, (0,_inline_svg__WEBPACK_IMPORTED_MODULE_6__.focalPointToPreserveAspectRatio)(fgFocalPoint), fgSvgColor ? 'fill' : '');

  // The textPath layer sits over the whole block rather than following the
  // foreground's size and focal point, so the words keep running around it.
  // Whatever the block styles, the file must stop dictating — see
  // `takeOverProperty` in `inline-svg.js`.
  const textpathStyle = {
    color: safeCssValue(fgTextpathColor),
    fontFamily: safeCssValue(fgTextpathFontFamily),
    fontSize: safeCssValue(fgTextpathFontSize),
    letterSpacing: safeCssValue(fgTextpathLetterSpacing)
  };
  const textpathOverrides = [
  // `fill` always: the layer is there to draw the block's words, so the
  // glyphs follow the block's color — the file's own fill (`none` in an
  // Inkscape export, which would draw nothing) is never the wanted one.
  'fill', fgTextpathFontFamily && 'font-family', fgTextpathFontSize && 'font-size', fgTextpathLetterSpacing && 'letter-spacing'].filter(Boolean).join(',');
  const textpathSvg = useInlineSvg(hasTextpath ? fgTextpathUrl : '', TEXTPATH_ASPECT_RATIO, textpathOverrides, fgTextpathText);
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
  const onSelectTextpathSvg = media => {
    setAttributes({
      'fg-textpath-url': media.url,
      'fg-textpath-id': String(media.id),
      'fg-textpath-alt': media.alt || ''
    });
  };
  const onRemoveTextpathSvg = () => {
    setAttributes({
      'fg-textpath-url': '',
      'fg-textpath-id': '',
      'fg-textpath-alt': ''
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

  // What the empty-state placeholder offers, per foreground format.
  const foregroundMedia = isPixelForeground ? {
    onSelect: onSelectImage,
    value: imgId,
    allowedTypes: ['image'],
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild auswählen', 'img-svg-block'),
    instructions: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Wähle ein Bild aus der Mediathek aus.', 'img-svg-block')
  } : {
    onSelect: onSelectForegroundSvg,
    value: fgSvgId,
    allowedTypes: ['image/svg+xml'],
    label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block'),
    instructions: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Wähle eine SVG-Datei aus der Mediathek aus.', 'img-svg-block')
  };

  // Falling back to a reference when the file cannot be embedded: the
  // artwork still shows, only the color and the text stay as the file has
  // them.
  const svgForeground = foregroundSvg.hasError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("img", {
    className: "img-svg-block__image img-svg-block__image--svg",
    src: fgSvgUrl,
    alt: fgSvgAlt || '',
    style: buildFitStyle({
      focalPoint: fgFocalPoint,
      scale: fgSvgScale
    })
  }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(InlineSvg, {
    className: "img-svg-block__image img-svg-block__inline-svg",
    markup: foregroundSvg.markup,
    isLoading: foregroundSvg.isLoading,
    alt: fgSvgAlt,
    style: {
      color: safeCssValue(fgSvgColor),
      transform: `scale(${scaleToFactor(fgSvgScale)})`,
      transformOrigin: focalPointToPosition(fgFocalPoint)
    }
  });
  const textpathLayer = textpathSvg.hasError ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("img", {
    className: "img-svg-block__textpath",
    src: fgTextpathUrl,
    alt: fgTextpathAlt || ''
  }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(InlineSvg, {
    className: "img-svg-block__textpath img-svg-block__inline-svg",
    markup: textpathSvg.markup,
    isLoading: textpathSvg.isLoading,
    alt: fgTextpathAlt,
    style: textpathStyle
  });
  return /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
    children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.InspectorControls, {
      children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Panel, {
        children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hintergrund', 'img-svg-block'),
          icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_3__["default"],
          initialOpen: true,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Hintergrundform anzeigen', 'img-svg-block'),
              checked: !!svgEnable,
              onChange: value => setAttributes({
                'svg-enable': value
              })
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                onSelect: onSelectSvg,
                allowedTypes: ['image/svg+xml'],
                value: svgId,
                render: ({
                  open
                }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                  onClick: open,
                  variant: "secondary",
                  children: svgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block')
                })
              })
            })
          }), svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              onClick: onRemoveSvg,
              variant: "link",
              isDestructive: true,
              children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG entfernen', 'img-svg-block')
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPalette, {
              colors: colorPalette,
              value: svgFillColor,
              onChange: color => setAttributes({
                'svg-fill-color': color
              })
            })
          }), isPixelForeground && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Vordergrund-Bild in Hintergrundform anzeigen', 'img-svg-block'),
              help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Schneidet das Vordergrundbild in die Form des SVGs (Maske).', 'img-svg-block'),
              checked: !!imgMaskEnable,
              onChange: value => setAttributes({
                'img-mask-enable': value
              })
            })
          }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
            label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Größe', 'img-svg-block'),
            help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('0 % = Form ist vollständig sichtbar, ohne Beschnitt. Negative Werte verkleinern, positive vergrößern die Form – vom Fokuspunkt aus.', 'img-svg-block'),
            value: svgScale,
            onChange: value => setAttributes({
              'svg-scale': value
            }),
            min: -200,
            max: 400,
            step: 1
          }), svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FocalPointPicker, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fokuspunkt der Form', 'img-svg-block'),
              url: svgUrl,
              value: svgFocalPoint,
              onChange: value => setAttributes({
                'svg-focal-point': value
              })
            })
          })]
        }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelBody, {
          title: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Vordergrund', 'img-svg-block'),
          icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
          initialOpen: true,
          children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RadioControl, {
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
          }), isPixelForeground ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                  onSelect: onSelectImage,
                  allowedTypes: ['image'],
                  value: imgId,
                  render: ({
                    open
                  }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    onClick: open,
                    variant: "primary",
                    children: imgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild auswählen', 'img-svg-block')
                  })
                })
              })
            }), imgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                onClick: onRemoveImage,
                variant: "link",
                isDestructive: true,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild entfernen', 'img-svg-block')
              })
            })]
          }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                  onSelect: onSelectForegroundSvg,
                  allowedTypes: ['image/svg+xml'],
                  value: fgSvgId,
                  render: ({
                    open
                  }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                    onClick: open,
                    variant: "primary",
                    children: fgSvgUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG-Datei auswählen', 'img-svg-block')
                  })
                })
              })
            }), fgSvgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                onClick: onRemoveForegroundSvg,
                variant: "link",
                isDestructive: true,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('SVG entfernen', 'img-svg-block')
              })
            }), foregroundSvg.hasError && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
                status: "warning",
                isDismissible: false,
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Die SVG-Datei konnte nicht eingebettet werden – Farbe und Text lassen sich daher nicht anpassen.', 'img-svg-block')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ColorPalette, {
                colors: colorPalette,
                value: fgSvgColor,
                onChange: color => setAttributes({
                  'fg-svg-color': color
                })
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
                className: "components-base-control__help",
                children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Ohne Farbauswahl behält die Grafik ihre eigenen Farben. Ein Bild (image-Tag) im SVG bleibt davon immer unberührt.', 'img-svg-block')
              })
            }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.RangeControl, {
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
          }), hasForeground && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
            children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FocalPointPicker, {
              label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Fokuspunkt', 'img-svg-block'),
              url: foregroundPreviewUrl,
              value: fgFocalPoint,
              onChange: value => setAttributes({
                'fg-focal-point': value
              })
            })
          }), !isPixelForeground && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
            children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
              children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.ToggleControl, {
                label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Zusätzliches SVG mit Textpfad', 'img-svg-block'),
                help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Legt ein zweites SVG über den Vordergrund – z. B. ein umlaufender Text um die freigestellte Grafik.', 'img-svg-block'),
                checked: !!fgTextpathEnable,
                onChange: value => setAttributes({
                  'fg-textpath-enable': value
                })
              })
            }), fgTextpathEnable && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
              children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
                  children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
                    onSelect: onSelectTextpathSvg,
                    allowedTypes: ['image/svg+xml'],
                    value: fgTextpathId,
                    render: ({
                      open
                    }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                      onClick: open,
                      variant: "secondary",
                      children: fgTextpathUrl ? (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Textpfad-SVG ändern', 'img-svg-block') : (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Textpfad-SVG auswählen', 'img-svg-block')
                    })
                  })
                })
              }), fgTextpathUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
                  onClick: onRemoveTextpathSvg,
                  variant: "link",
                  isDestructive: true,
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Textpfad-SVG entfernen', 'img-svg-block')
                })
              }), textpathSvg.hasError && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.PanelRow, {
                children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Notice, {
                  status: "warning",
                  isDismissible: false,
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Die SVG-Datei konnte nicht eingebettet werden – Text, Schrift und Farbe lassen sich daher nicht anpassen.', 'img-svg-block')
                })
              }), hasTextpath && !textpathSvg.hasError && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
                children: [/*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.TextControl, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Text', 'img-svg-block'),
                  help: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Leer lassen, um den Text aus der SVG-Datei zu verwenden.', 'img-svg-block'),
                  placeholder: textpathSvg.ownText,
                  value: fgTextpathText || '',
                  onChange: value => setAttributes({
                    'fg-textpath-text': value
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.__experimentalFontFamilyControl, {
                  fontFamilies: fontFamilies,
                  value: fgTextpathFontFamily,
                  onChange: value => setAttributes({
                    'fg-textpath-font-family': value
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.FontSizePicker, {
                  fontSizes: fontSizes,
                  value: fgTextpathFontSize,
                  onChange: value => setAttributes({
                    'fg-textpath-font-size': value
                  }),
                  withSlider: true
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.__experimentalLetterSpacingControl, {
                  value: fgTextpathLetterSpacing,
                  onChange: value => setAttributes({
                    'fg-textpath-letter-spacing': value
                  })
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("p", {
                  className: "components-base-control__help",
                  children: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Schriftgröße und Laufweite skalieren mit der Grafik: sie gelten im Koordinatensystem der SVG-Datei, nicht in Bildschirmpixeln.', 'img-svg-block')
                }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.ColorPaletteControl, {
                  label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Farbe', 'img-svg-block'),
                  colors: colorPalette,
                  value: fgTextpathColor,
                  onChange: color => setAttributes({
                    'fg-textpath-color': color
                  })
                })]
              })]
            })]
          })]
        })]
      })
    }), /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("figure", {
      ...blockProps,
      style: {
        ...blockProps.style,
        aspectRatio: isPixelForeground && imgWidth && imgHeight ? `${imgWidth} / ${imgHeight}` : undefined
      },
      children: !hasForeground ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Placeholder, {
        icon: _wordpress_icons__WEBPACK_IMPORTED_MODULE_4__["default"],
        label: (0,_wordpress_i18n__WEBPACK_IMPORTED_MODULE_0__.__)('Bild mit SVG-Hintergrund', 'img-svg-block'),
        instructions: foregroundMedia.instructions,
        children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUploadCheck, {
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_block_editor__WEBPACK_IMPORTED_MODULE_1__.MediaUpload, {
            onSelect: foregroundMedia.onSelect,
            allowedTypes: foregroundMedia.allowedTypes,
            value: foregroundMedia.value,
            render: ({
              open
            }) => /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)(_wordpress_components__WEBPACK_IMPORTED_MODULE_2__.Button, {
              onClick: open,
              variant: "primary",
              children: foregroundMedia.label
            })
          })
        })
      }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsxs)(react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.Fragment, {
        children: [svgEnable && svgUrl && /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
          className: "img-svg-block__shape",
          style: buildShapeStyle({
            url: svgUrl,
            fillColor: safeCssValue(svgFillColor),
            focalPoint: svgFocalPoint,
            scale: svgScale
          }),
          "aria-hidden": "true"
        }), isPixelForeground ? imgMaskEnable && svgUrl ? /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("span", {
          className: "img-svg-block__mask-wrapper",
          style: buildMaskBoxStyle({
            url: svgUrl,
            focalPoint: svgFocalPoint,
            scale: svgScale
          }),
          children: /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("img", {
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
        }) : /*#__PURE__*/(0,react_jsx_runtime__WEBPACK_IMPORTED_MODULE_8__.jsx)("img", {
          className: "img-svg-block__image",
          src: imgUrl,
          alt: imgAlt || '',
          style: {
            objectPosition: focalPointToPosition(fgFocalPoint)
          }
        }) : svgForeground, hasTextpath && textpathLayer]
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

/***/ "./src/img-svg-block/inline-svg.js"
/*!*****************************************!*\
  !*** ./src/img-svg-block/inline-svg.js ***!
  \*****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   focalPointToPreserveAspectRatio: () => (/* binding */ focalPointToPreserveAspectRatio),
/* harmony export */   isEmbeddableUrl: () => (/* binding */ isEmbeddableUrl),
/* harmony export */   prepareInlineSvg: () => (/* binding */ prepareInlineSvg)
/* harmony export */ });
/**
 * Helpers for embedding an SVG file's markup directly into the document
 * instead of referencing it from an `<img>`/`mask-image`.
 *
 * Embedding buys three things a referenced SVG cannot have. An `<image>`
 * inside it renders at all: a browser puts an SVG loaded through `<img>` into
 * secure static mode, where external references — a cut-out photo pulled from
 * the media library, say — never load. Color and typography can be handed over
 * to the block's own controls. And a textPath's glyphs stay real text running
 * along their path, so the page's fonts apply to them and the words can be
 * swapped out from the editor. What is embedded is the file cut down to a
 * drawing — see `isEmbeddableUrl` for which files qualify at all and
 * `sanitizeSvg` for what survives of them. The equivalent server-side
 * implementation lives in `render.php` — keep the two in sync.
 */

/**
 * The elements an embedded drawing may consist of, by local name.
 *
 * An allowlist rather than a list of the dangerous ones: a blocklist has to be
 * complete to hold, and SVG keeps handing out new ways to run code — SMIL
 * (`<animate>`, `<set>`) can rewrite an attribute into a `javascript:` URL,
 * `<foreignObject>` opens a hole into HTML. Everything here is static drawing;
 * anything a drawing does not need is not on the list and is dropped with its
 * subtree.
 */
const ALLOWED_ELEMENTS = ['svg', 'g', 'defs', 'symbol', 'use', 'switch', 'a', 'title', 'desc', 'style', 'view', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'textpath', 'tspan', 'tref', 'image', 'lineargradient', 'radialgradient', 'stop', 'pattern', 'clippath', 'mask', 'marker', 'filter', 'fegaussianblur', 'feoffset', 'feblend', 'fecolormatrix', 'fecomponenttransfer', 'fefuncr', 'fefuncg', 'fefuncb', 'fefunca', 'fecomposite', 'feconvolvematrix', 'fediffuselighting', 'fedisplacementmap', 'fedistantlight', 'fedropshadow', 'feflood', 'feimage', 'femerge', 'femergenode', 'femorphology', 'fepointlight', 'fespecularlighting', 'fespotlight', 'fetile', 'feturbulence'];
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Tells whether a file may be embedded at all.
 *
 * Embedding runs a file's markup inside the editor, in the session of whoever
 * opens the post — so the file has to come from this site, where uploads pass
 * through the media library's sanitizing. A block attribute is just text in
 * the post, and anyone who may edit a post can point it at a host of their
 * own; a foreign URL is therefore not embedded but left to the `<img>`
 * fallback, which browsers keep in secure static mode.
 *
 * @param {string} url URL to load the drawing from.
 * @return {boolean} Whether it is safe to embed.
 */
const isEmbeddableUrl = url => {
  try {
    return new window.URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
};

/**
 * Tells whether a reference may stay on an embedded element.
 *
 * Browsers ignore control characters and whitespace inside a URL's scheme, so
 * `jav&#9;ascript:alert(1)` runs as `javascript:alert(1)` while a check for a
 * leading `javascript:` sees something harmless. Stripping those characters
 * before comparing is what closes that gap, and an allowlist of schemes is
 * what keeps the next such trick (`vbscript:`, `data:text/html`) from needing
 * its own rule. An absolute reference is how a drawing points at a photo in
 * the media library, so it is allowed — but only to this site.
 *
 * @param {string} value Attribute value.
 * @return {boolean} Whether the reference is safe to keep.
 */
const isSafeHref = value => {
  const reference = String(value).replace(/[\u0000-\u0020]+/g, '');
  if ('' === reference || reference.startsWith('#') || reference.startsWith('/')) {
    return true;
  }
  if (/^https?:\/\//i.test(reference)) {
    return isEmbeddableUrl(reference);
  }
  if (/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(reference)) {
    return true;
  }

  // A relative path: no scheme in front of the first separator.
  return !/^[a-z0-9+.-]*:/i.test(reference);
};

/**
 * Names the class the file's own CSS gets bound to. Derived from the source so
 * that re-preparing the same file yields the same markup.
 *
 * @param {string} source SVG file contents.
 * @return {string} Class name.
 */
const scopeName = source => {
  let hash = 5381;
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 33 + source.charCodeAt(index)) % 4294967296;
  }
  return `img-svg-block-scope-${hash.toString(16)}`;
};

/**
 * Binds a `<style>` element's rules to the drawing it came with.
 *
 * CSS inside an SVG that is *embedded* is not scoped to that SVG the way a
 * referenced file's is — it applies to the whole page, so `body{display:none}`
 * in an uploaded drawing takes the editor down with it and an attribute
 * selector can read values off the page and post them to a foreign host
 * through a background URL. Every selector is therefore prefixed with the
 * class the embedding step puts on the drawing's root, at-rules (which have no
 * selector to prefix) and `url()` are dropped, and what an export actually
 * relies on — the `.cls-1{fill:…}` rules Illustrator and Figma write — keeps
 * working.
 *
 * @param {string} css   Style element contents.
 * @param {string} scope Class name on the drawing's root element.
 * @return {string} Scoped CSS.
 */
const scopeCss = (css, scope) => css.replace(/@[^;{}]*;/g, '').replace(/@[^{}]*\{(?:[^{}]*\{[^{}]*\}\s*)*[^{}]*\}/g, '').replace(/url\s*\([^)]*\)/gi, '').replace(/(^|\})([^{}]+)\{/g, (match, before, selectors) => {
  const scoped = selectors.split(',').map(selector => selector.trim()).filter(Boolean).map(selector => `.${scope} ${selector}`);
  return `${before}${scoped.join(',')}{`;
});

/**
 * Reduces a parsed SVG to what a drawing needs: allowed elements, no event
 * handlers, no unsafe references, and its own CSS bound to itself.
 *
 * SVG uploads are sanitized on their way into the media library already — this
 * is the second line of defence, and the only one on the path the block itself
 * opens by embedding a file's markup into the page.
 *
 * @param {SVGElement} svg   Root SVG element (mutated in place).
 * @param {string}     scope Class name to bind the file's own CSS to.
 */
const sanitizeSvg = (svg, scope) => {
  svg.querySelectorAll('*').forEach(element => {
    const isSvgElement = null === element.namespaceURI || SVG_NAMESPACE === element.namespaceURI;
    if (!isSvgElement || !ALLOWED_ELEMENTS.includes(element.localName.toLowerCase())) {
      element.remove();
    }
  });
  [svg, ...svg.querySelectorAll('*')].forEach(element => {
    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || name.includes('href') && !isSafeHref(attribute.value)) {
        element.removeAttributeNode(attribute);
      }
    });
  });
  svg.querySelectorAll('style').forEach(style => {
    style.textContent = scopeCss(style.textContent, scope);
  });
};

/**
 * Values that survive a property being taken over: `fill: none` marks an
 * outline, and filling it in would turn the drawing into a silhouette.
 */
const KEPT_VALUES = {
  fill: 'none'
};

/**
 * The elements whose fill paints glyphs, and the one exception to the rule
 * above: on a shape `fill: none` means an outline, but a drawing program
 * routinely leaves it on the `<text>` of a textPath — the words are then
 * stroked, or simply invisible in the file — and keeping it would draw
 * nothing at all where the block expects its own text.
 */
const TEXT_ELEMENTS = ['text', 'textpath', 'tspan', 'tref'];

/**
 * Tells whether one element's value for the property being taken over must
 * survive.
 *
 * @param {Element} element  Element carrying the declaration.
 * @param {string}  property CSS property being taken over.
 * @return {Function} Predicate over the declared value.
 */
const keepsValue = (element, property) => value => {
  const kept = KEPT_VALUES[property];
  return !!kept && value.trim().toLowerCase() === kept && !TEXT_ELEMENTS.includes(element.tagName.toLowerCase());
};

/**
 * Removes one property's declaration from an inline `style` value.
 *
 * @param {string}   style    Inline style value.
 * @param {string}   property CSS property to remove.
 * @param {Function} isKept   Tells whether a value must survive.
 * @return {string} Style value without that declaration.
 */
const stripDeclaration = (style, property, isKept) => style.split(';').filter(declaration => {
  const [name, value = ''] = declaration.split(':');
  return name.trim().toLowerCase() !== property || isKept(value);
}).join(';');

/**
 * Removes everything the file says about one inherited property — presentation
 * attribute, inline style and `<style>` rule alike, since class-based
 * declarations are how Illustrator and Figma usually export — so that the
 * value the block sets on the container is what the drawing inherits. Every
 * property handled here (`fill`, and the typography ones) is inherited in SVG,
 * so clearing the descendants is enough for the block's value to reach them.
 *
 * @param {SVGElement} svg      Root SVG element (mutated in place).
 * @param {string}     property CSS property the block takes over.
 */
const takeOverProperty = (svg, property) => {
  const kept = KEPT_VALUES[property];
  const rule = new RegExp(`${property}\\s*:\\s*${kept ? `(?!\\s*${kept})` : ''}[^;}]+;?`, 'gi');
  svg.querySelectorAll('style').forEach(style => {
    style.textContent = style.textContent.replace(rule, '');
  });
  [svg, ...svg.querySelectorAll('*')].forEach(element => {
    const isKept = keepsValue(element, property);
    const attribute = element.getAttribute(property);
    if (null !== attribute && !isKept(attribute)) {
      element.removeAttribute(property);
    }
    const style = element.getAttribute('style');
    if (style) {
      element.setAttribute('style', stripDeclaration(style, property, isKept));
    }
  });
};

/**
 * Finds the text a textPath SVG draws along its path. A file may hold several
 * runs; the first is the one the block exposes for editing.
 *
 * @param {SVGElement} svg Root SVG element.
 * @return {?Element} The `<textPath>`, its `<text>` when the file has no
 *                    textPath, or null when it carries no text at all.
 */
const findTextNode = svg => svg.querySelector('textPath') || svg.querySelector('text');

/**
 * Maps a focal point onto an SVG `preserveAspectRatio` alignment. An inline
 * SVG has no `object-position`; the nearest equivalent is which corner of its
 * viewBox is pinned when the drawing is fitted ("meet", i.e. contain) into a
 * box of a different aspect ratio. The picker's continuous position is
 * therefore quantised to the nine alignments SVG offers.
 *
 * @param {{x: number, y: number}} focalPoint Focal point value.
 * @return {string} `preserveAspectRatio` value.
 */
const focalPointToPreserveAspectRatio = focalPoint => {
  const third = value => {
    if (value < 1 / 3) {
      return 'Min';
    }
    return value > 2 / 3 ? 'Max' : 'Mid';
  };
  return `x${third(focalPoint?.x ?? 0.5)}Y${third(focalPoint?.y ?? 0.5)} meet`;
};

/**
 * Parses an SVG file's source into markup that is safe to inject, optionally
 * handing some of its properties over to the block's own styling and replacing
 * the words it draws along a path.
 *
 * @param {string}   source                      SVG file contents.
 * @param {Object}   options
 * @param {string}   options.preserveAspectRatio How the drawing is fitted into the block.
 * @param {string[]} options.overrides           CSS properties the block sets on
 *                                               the container and the drawing
 *                                               must therefore inherit, e.g.
 *                                               `fill` or `font-family`.
 * @param {string}   options.text                Replaces the words drawn along the
 *                                               path; empty keeps the file's own.
 * @return {?{markup: string, text: string}} The sanitized `<svg>` and the text
 *                                           the file itself carries, or null
 *                                           when the source is not SVG.
 */
const prepareInlineSvg = (source, {
  preserveAspectRatio,
  overrides = [],
  text
} = {}) => {
  const parsed = new window.DOMParser().parseFromString(source, 'image/svg+xml');
  const svg = parsed.querySelector('svg');
  if (!svg || parsed.querySelector('parsererror')) {
    return null;
  }
  const scope = scopeName(source);
  sanitizeSvg(svg, scope);
  svg.setAttribute('class', `${svg.getAttribute('class') ?? ''} ${scope}`.trim());
  overrides.forEach(property => takeOverProperty(svg, property));
  if (overrides.includes('fill')) {
    // `fill` is the one property with no CSS keyword for "whatever the
    // container says", so it needs pointing at the inherited color.
    svg.setAttribute('fill', 'currentColor');
  }
  const textNode = findTextNode(svg);
  const ownText = textNode ? textNode.textContent.trim() : '';
  if (textNode && text) {
    textNode.textContent = text;
  }
  if (preserveAspectRatio) {
    svg.setAttribute('preserveAspectRatio', preserveAspectRatio);
  }
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  return {
    markup: svg.outerHTML,
    text: ownText
  };
};

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

/***/ "@wordpress/element"
/*!*********************************!*\
  !*** external ["wp","element"] ***!
  \*********************************/
(module) {

module.exports = window["wp"]["element"];

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

module.exports = /*#__PURE__*/JSON.parse('{"$schema":"https://schemas.wp.org/trunk/block.json","apiVersion":3,"name":"stiftung-enzian/img-svg-block","version":"0.1.0","title":"Bild mit SVG-Hintergrund","category":"media","icon":"smiley","description":"Bild-Block mit optionalem SVG-Formhintergrund.","example":{},"attributes":{"fg-type":{"type":"string","default":"pixel"},"img-url":{"type":"string"},"img-alt":{"type":"string"},"img-id":{"type":"string"},"img-width":{"type":"number"},"img-height":{"type":"number"},"fg-svg-url":{"type":"string"},"fg-svg-alt":{"type":"string"},"fg-svg-id":{"type":"string"},"fg-svg-color":{"type":"string"},"fg-textpath-enable":{"type":"boolean","default":false},"fg-textpath-url":{"type":"string"},"fg-textpath-alt":{"type":"string"},"fg-textpath-id":{"type":"string"},"fg-textpath-text":{"type":"string"},"fg-textpath-color":{"type":"string"},"fg-textpath-font-family":{"type":"string"},"fg-textpath-font-size":{"type":"string"},"fg-textpath-letter-spacing":{"type":"string"},"fg-svg-scale":{"type":"number","default":0},"fg-focal-point":{"type":"object","default":{"x":0.5,"y":0.5}},"svg-url":{"type":"string"},"svg-alt":{"type":"string"},"svg-id":{"type":"string"},"svg-fill-color":{"type":"string"},"svg-enable":{"type":"boolean","default":false},"img-mask-enable":{"type":"boolean","default":false},"svg-scale":{"type":"number","default":0},"svg-focal-point":{"type":"object","default":{"x":0.5,"y":0.5}}},"supports":{"align":["wide","full"],"anchor":true},"textdomain":"img-svg-block","editorScript":"file:./index.js","editorStyle":"file:./index.css","style":"file:./style-index.css","render":"file:./render.php","viewScript":"file:./view.js"}');

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