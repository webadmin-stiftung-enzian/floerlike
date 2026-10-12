/**
 * Build-Konfiguration: die Standard-Konfiguration von @wordpress/scripts,
 * ergänzt um EINEN zusätzlichen Einstieg -- den gemeinsamen Store
 * (src/shared/store.js), den alle Blöcke als Skriptmodul einbinden.
 *
 * Bewusst nur ergänzt, nicht ersetzt: Die Block-Einstiege (view.js usw.)
 * findet wp-scripts weiterhin selbst über die block.json-Dateien. Die Anleitung
 * "How to build a multi-block plugin" (developer.wordpress.org/news, 09/2024)
 * ersetzt die Einstiege durch Sammeldateien -- das würde die Skriptmodule und
 * damit die Interactivity API kaputt machen (siehe Spezifikation v4, 9.2).
 *
 * Mit --experimental-modules exportiert wp-scripts zwei Konfigurationen:
 * [ für klassische Skripte, für Skriptmodule ]. Der Store ist ein Modul und
 * gehört in die zweite.
 */
const path = require( 'path' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

// Ohne --experimental-modules gibt es nur eine Konfiguration und keine Module --
// dann unverändert durchreichen.
if ( ! Array.isArray( defaultConfig ) ) {
	module.exports = defaultConfig;
} else {
	const [ scriptConfig, moduleConfig ] = defaultConfig;

	// wp-scripts liefert die Einstiege als Funktion (sie werden bei jedem Build
	// frisch aus den block.json-Dateien ermittelt) -- diese Funktion beibehalten
	// und nur um den Store ergänzen.
	const resolveEntries = () =>
		typeof moduleConfig.entry === 'function'
			? moduleConfig.entry()
			: moduleConfig.entry;

	module.exports = [
		scriptConfig,
		{
			...moduleConfig,
			entry: () => ( {
				...resolveEntries(),
				'shared/store': path.resolve(
					__dirname,
					'src/shared/store.js'
				),
			} ),
		},
	];
}
