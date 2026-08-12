/**
 * Registers a new block provided a unique name and an object defining its behavior.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
import { registerBlockType } from '@wordpress/blocks';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * All files containing `style` keyword are bundled together. The code used
 * gets applied both to the front of your site and to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './style.scss';

/**
 * Internal dependencies
 */
import Edit from './edit';
import metadata from './block.json';

/**
 * Custom block icon, sourced from the theme's icon-flower-plus.svg.
 * block.json can only hold a Dashicon slug string, so a custom SVG has to be
 * registered here as a JSX element instead.
 */
const strokeStyle = { fill: 'none', stroke: '#020202', strokeMiterlimit: 10, strokeWidth: '2px' };

const icon = (

	<svg id="Ebene_1" data-name="Ebene 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
		<g>
			<path d="M21.2,18.59c1.51-.31,2.65-1.65,2.65-3.25s-1.14-2.95-2.65-3.26c-.22-.05-.45-.07-.68-.07-1.47,0-2.71.95-3.16,2.27-.11.33-.17.69-.17,1.06s.06.72.17,1.06h.01" style={ strokeStyle } />
			<path d="M15.52,21.81c1.02,1.2,2.79,1.54,4.21.71,1.38-.81,1.96-2.47,1.47-3.93-.07-.22-.16-.43-.28-.63-.74-1.26-2.2-1.86-3.56-1.56-.35.07-.68.19-1,.38-.33.19-.62.43-.83.71" style={ strokeStyle } />
			<path d="M9.86,18.59c-.5,1.47.08,3.12,1.47,3.93,1.41.83,3.18.49,4.19-.71.14-.15.26-.31.36-.48.74-1.26.55-2.79-.35-3.84-.23-.28-.51-.52-.84-.71-.32-.19-.66-.31-1-.38" style={ strokeStyle } />
			<path d="M9.86,12.08c-1.51.31-2.65,1.65-2.65,3.26s1.14,2.94,2.65,3.25c.22.05.45.07.68.07,1.46,0,2.7-.95,3.15-2.26.11-.34.17-.69.17-1.06s-.06-.73-.17-1.06h0" style={ strokeStyle } />
			<path d="M15.53,8.86c-1.03-1.2-2.8-1.53-4.2-.7-1.39.8-1.97,2.46-1.47,3.92.07.22.16.43.28.63.74,1.26,2.19,1.86,3.55,1.57.34-.07.68-.19,1-.38.33-.19.61-.43.84-.71" style={ strokeStyle } />
			<path d="M21.2,12.08c.5-1.46-.09-3.12-1.47-3.92-1.41-.83-3.18-.5-4.2.7-.14.15-.26.31-.36.49-.73,1.25-.55,2.79.36,3.84.22.28.5.52.83.71.32.19.66.32,1,.38" style={ strokeStyle } />
		</g>
		<path d="M26.14,24.9c-.5,1.12-1.67,3.31-4.1,4.68-2.34,1.32-5.65,1.8-6.17.83s1.71-3.47,4.1-4.68c2.49-1.26,4.96-1.03,6.17-.83Z" style={ strokeStyle } />
		<path d="M6.43,25.9c1.04-.23,3.19-.53,5.44.47,2.17.97,4.27,3.07,3.88,3.94s-3.32.59-5.44-.47c-2.21-1.11-3.38-2.97-3.88-3.94Z" style={ strokeStyle } />
		<line x1="15.8" y1="21.98" x2="15.8" y2="31.17" style={ strokeStyle } />
		<line x1="22.53" y1="5.17" x2="29.44" y2="5.17" style={ strokeStyle } />
		<line x1="25.98" y1="1.71" x2="25.98" y2="8.63" style={ strokeStyle } />
	</svg>
);

/**
 * Every block starts by registering a new block type definition.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-registration/
 */
registerBlockType(metadata.name, {
	icon,
	/**
	 * @see ./edit.js
	 */
	edit: Edit,
});
