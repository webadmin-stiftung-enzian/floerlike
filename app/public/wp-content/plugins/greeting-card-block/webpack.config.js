const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const WooCommerceDependencyExtractionWebpackPlugin = require('@woocommerce/dependency-extraction-webpack-plugin');

// Ersetzt das WP-eigene Extraction-Plugin durch das WooCommerce-Plugin,
// damit @woocommerce/* Imports korrekt externalisiert werden.
//
// WICHTIG: Das WooCommerce-Plugin (v2.x) bündelt intern eine ältere Version von
// @wordpress/dependency-extraction-webpack-plugin (v3.3.0), die `react/jsx-runtime`
// NICHT kennt. Dadurch wird die automatische JSX-Runtime ins Bundle gepackt statt
// als `react-jsx-runtime` (window.ReactJSXRuntime) ausgelagert. Folge: Der Editor
// erhält eine ZWEITE React-Element-Factory → React-Fehler #31 ("object with keys
// {$$typeof,...}") und der Block crasht im FSE-Editor. Wir reichen das Mapping
// daher über requestToExternal/requestToHandle nach; alles andere kaskadiert
// weiterhin zu den WooCommerce-/WP-Defaults (undefined zurückgeben).
const REACT_JSX_RUNTIME_REQUESTS = ['react/jsx-runtime', 'react/jsx-dev-runtime'];

const swapExtractionPlugin = (config) => ({
    ...config,
    plugins: [
        ...config.plugins.filter(
            (plugin) => plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
        ),
        new WooCommerceDependencyExtractionWebpackPlugin({
            requestToExternal(request) {
                if (REACT_JSX_RUNTIME_REQUESTS.includes(request)) {
                    return 'ReactJSXRuntime';
                }
                // undefined → Kaskade zu WooCommerce-/WP-Defaults.
            },
            requestToHandle(request) {
                if (REACT_JSX_RUNTIME_REQUESTS.includes(request)) {
                    return 'react-jsx-runtime';
                }
                // undefined → Kaskade zu WooCommerce-/WP-Defaults.
            },
        }),
    ],
});

// Mit --experimental-modules schreiben Script- und Modul-Config in dasselbe
// build/-Verzeichnis. Wenn beide `output.clean` aktiv haben, löscht der
// MultiCompiler bei parallelen Läufen die Assets der jeweils anderen Config
// (Race-Condition) – z. B. verschwindet view.js. Daher `output.clean`
// deaktivieren; das Verzeichnis wird stattdessen im npm-Script einmalig vor
// dem Build geleert.
const disableClean = (config) => ({
    ...config,
    output: { ...config.output, clean: false },
});

// Mit --experimental-modules ist defaultConfig ein Array [scriptConfig, moduleConfig].
// WICHTIG: Das WooCommerce-Extraction-Plugin NUR auf die Script-Config anwenden
// (für cart-sync.js / @woocommerce/*). Die Module-Config (view.js) MUSS das
// original modulfähige DependencyExtractionWebpackPlugin behalten, da dieses
// `@wordpress/interactivity` als Modul-ID ausgibt – das WooCommerce-Plugin würde
// stattdessen den klassischen Script-Handle `wp-interactivity` erzeugen, den die
// Script-Module-Import-Map nicht auflösen kann.
const isModuleConfig = (config) =>
    Boolean(config.experiments && config.experiments.outputModule);

module.exports = Array.isArray(defaultConfig)
    ? defaultConfig.map((config) =>
        disableClean(isModuleConfig(config) ? config : swapExtractionPlugin(config))
    )
    : disableClean(swapExtractionPlugin(defaultConfig));

