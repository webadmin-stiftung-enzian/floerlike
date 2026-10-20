/**
 * Build-Konfiguration: die Standard-Konfiguration von @wordpress/scripts,
 * ergänzt um die Einstiege, die nicht zu einer block.json gehören:
 *
 *   editor/product-collection  klassisches Skript für den Editor (Panel
 *                              "Slider" an der Produktsammlung)
 *   slider/view                Skriptmodul für die Seite (Swiper-Start)
 *
 * Wie im Grusskarten-Plugin nur ergänzt, nicht ersetzt: Block-Einstiege
 * (src/blocks/*) findet wp-scripts weiterhin selbst über die block.json.
 * Mit --experimental-modules gibt es zwei Konfigurationen:
 * [ für klassische Skripte, für Skriptmodule ].
 */
const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

const [ scriptConfig, moduleConfig ] = defaultConfig;

const withEntries = ( config, extra ) => ( {
	...config,
	entry: () => ( {
		...( typeof config.entry === 'function'
			? config.entry()
			: config.entry ),
		...extra,
	} ),
} );

module.exports = [
	withEntries( scriptConfig, {
		'editor/product-collection': path.resolve(
			__dirname,
			'src/editor/product-collection.js'
		),
	} ),
	withEntries( moduleConfig, {
		'slider/view': path.resolve( __dirname, 'src/slider/view.js' ),
	} ),
];
