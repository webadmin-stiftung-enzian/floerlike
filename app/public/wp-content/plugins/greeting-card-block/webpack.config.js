const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const WooCommerceDependencyExtractionWebpackPlugin = require('@woocommerce/dependency-extraction-webpack-plugin');

// Ersetzt das WP-eigene Extraction-Plugin durch das WooCommerce-Plugin,
// damit @woocommerce/* Imports korrekt externalisiert werden.
const swapExtractionPlugin = (config) => ({
    ...config,
    plugins: [
        ...config.plugins.filter(
            (plugin) => plugin.constructor.name !== 'DependencyExtractionWebpackPlugin'
        ),
        new WooCommerceDependencyExtractionWebpackPlugin(),
    ],
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
        isModuleConfig(config) ? config : swapExtractionPlugin(config)
    )
    : swapExtractionPlugin(defaultConfig);

