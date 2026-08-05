/**
 * Retrieves the translation of text.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-i18n/
 */
import { __ } from '@wordpress/i18n';

/**
 * React hook that is used to mark the block wrapper element.
 * It provides all the necessary props like the class name.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-editor/#useblockprops
 */
import { useBlockProps } from '@wordpress/block-editor';

/**
 * Lets webpack process CSS, SASS or SCSS files referenced in JavaScript files.
 * Those files can contain any CSS code that gets applied to the editor.
 *
 * @see https://www.npmjs.com/package/@wordpress/scripts#using-css
 */
import './editor.scss';
import { InnerBlocks, InspectorControls, useSettings} from "@wordpress/block-editor";
import { Panel, PanelBody, PanelRow, ColorPalette } from "@wordpress/components";
import { background, textHorizontal } from '@wordpress/icons';
import ServerSideRender from '@wordpress/server-side-render';

/**
 * The edit function describes the structure of your block in the context of the
 * editor. This represents what the editor will render when the block is used.
 *
 * @see https://developer.wordpress.org/block-editor/reference-guides/block-api/block-edit-save/#edit
 *
 * @return {Element} Element to render.
 */
export default function Edit({ attributes, setAttributes }) {
	const {
		'foreground-color': foregroundColor,
		'background-image': backgroundImage,
		'background-color': backgroundColor,
		'path-text': pathText,
	} = attributes;
	const blockProps = useBlockProps();
	// Liest die Farbpalette aus theme.json (settings.color.palette) statt sie
	// hier zu duplizieren -- theme.json bleibt damit die Single Source of
	// Truth. useSettings() spiegelt automatisch jede Änderung an der Palette
	// wider, ganz ohne Anpassung an diesem Block.
	const [colorPalette] = useSettings('color.palette');
	return (
		<>
			<InspectorControls>
				<Panel title={__('Hero SVG Block Settings', 'hero-svg-block')}>
					<PanelBody title={__('Hintergrundfarbe', 'hero-svg-block')} icon={ background } initialOpen={ false }>
						<PanelRow>
						<ColorPalette
							colors={colorPalette}
							value={backgroundColor}
							onChange={(color) => setAttributes({ 'background-color': color })}
						/>
						</PanelRow>
					</PanelBody>
					<PanelBody title={__('Farbe Hintergrundgrafik', 'hero-svg-block')} icon={ background } initialOpen={ false }>
						<PanelRow>
						<ColorPalette
							colors={colorPalette}
							value={backgroundImage}
							onChange={(color) => setAttributes({ 'background-image': color })}
						/>
						</PanelRow>
					</PanelBody>
					<PanelBody title={__('Farbe Text', 'hero-svg-block')} icon={ background } initialOpen={ false }>
						<PanelRow>
						<ColorPalette
							colors={colorPalette}
							value={foregroundColor}
							onChange={(color) => setAttributes({ 'foreground-color': color })}
						/>
						</PanelRow>
					</PanelBody>
					<PanelBody title={__('Pfad Text', 'hero-svg-block')} icon={ textHorizontal } initialOpen={ true }>
						<PanelRow>
						<input
							type="text"
							value={pathText}
							onChange={(event) => setAttributes({ 'path-text': event.target.value })}
						/>
						</PanelRow>
					</PanelBody>
				</Panel>
			</InspectorControls>
			<div {...blockProps}>
				<ServerSideRender block="stiftung-enzian/hero-svg-block" attributes={attributes} />
			</div>
		</>
	);
}
