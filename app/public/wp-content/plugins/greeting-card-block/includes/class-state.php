<?php

/**
 * Gemeinsamer Zustand aller Grusskarten-Blöcke.
 *
 * Bereitet die Daten eines Produkts auf (Varianten, Karten, Vorauswahl …) und
 * legt sie als Interactivity-State im Namensraum "greeting-card-bundle" ab.
 * Jeder Block ruft gcb_prepare_state() auf; gerechnet wird nur beim ersten
 * Aufruf pro Produkt und Seitenaufruf. Fünf Blöcke = einmal rechnen.
 *
 * Gegenstück im Browser: src/shared/store.js (Getter und Validierung).
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * Daten eines Produkts für die Grusskarten-Blöcke vorbereiten und in den
 * Interactivity-State legen.
 *
 * @param WC_Product $product Einfaches oder variables Produkt.
 * @return array{
 *     productId: int,
 *     cards: array,
 *     variationSelector: array|null,
 *     selectedAttributes: array,
 *     nativePriceSync: bool,
 *     isAvailable: bool
 * }
 */
function gcb_prepare_state(WC_Product $product)
{
    static $prepared = [];

    $product_id = $product->get_id();

    if (isset($prepared[$product_id])) {
        return $prepared[$product_id];
    }

    $cards              = gcb_build_cards($product);
    $variation_selector = gcb_build_variation_selector($product);
    $selected           = gcb_build_selected_attributes($product, $variation_selector);
    $native_price_sync  = gcb_load_native_price_variations($product, $variation_selector);

    // Ist überhaupt etwas kaufbar? Die native Form blendet sich bei
    // ausverkauften oder nicht kaufbaren Produkten selbst aus; da unsere Blöcke
    // sie ersetzen, müssen sie das nachbilden -- sonst gäbe es einen Knopf,
    // dessen Request garantiert scheitert.
    if ($variation_selector) {
        $is_available = (bool) array_filter(
            $variation_selector['variations'],
            static function ($variation) {
                return $variation['inStock'] && $variation['purchasable'];
            }
        );
    } else {
        $is_available = $product->is_purchasable() && $product->is_in_stock();
    }

    wp_interactivity_state('greeting-card-bundle', [
        'productId'          => $product_id,
        'cards'              => $cards,
        'nonce'              => wp_create_nonce('wc_store_api'),
        // rest_url() statt hartkodiertem Pfad: funktioniert auch bei
        // Unterverzeichnis-Installationen oder abweichender REST-API-Basis.
        'batchUrl'           => rest_url('wc/store/v1/batch'),
        'wantsCard'          => false,
        'selectedCardId'     => 0,
        'text'               => '',
        // Höchstlänge des Grusstexts. Der Server kürzt unabhängig davon hart
        // auf 300 (class-integration.php); einstellbar wird sie in Stufe 6.
        'maxLength'          => 300,
        'quantity'           => 1,
        'submitAttempted'    => false,
        'isAdding'           => false,
        'errorMessage'       => '',
        'variationSelector'  => $variation_selector,
        'selectedAttributes' => $selected,
        'nativePriceSync'    => $native_price_sync,

        // Serverseitige Gegenstücke zu den gleichnamigen Gettern in
        // src/shared/store.js.
        //
        // Ohne sie wären diese Werte beim Rendern auf dem Server undefiniert:
        // "!state.isOptionAvailable" ergäbe true, und jeder Knopf käme
        // ausgegraut und gesperrt beim Browser an, bis das Skript geladen ist.
        // WordPress wertet Closures im State beim Rendern aus und überlässt sie
        // danach den JS-Gettern (derivedStateClosures) -- dasselbe Muster wie
        // WooCommerces ProductsStore. Die Logik muss mit store.js übereinstimmen.
        'isOptionSelected'   => static function () {
            $context = wp_interactivity_get_context();
            $state   = wp_interactivity_state('greeting-card-bundle');

            return ($state['selectedAttributes'][$context['attributeName']] ?? '') === ($context['value'] ?? null);
        },
        'isOptionAvailable'  => static function () {
            $context   = wp_interactivity_get_context();
            $state     = wp_interactivity_state('greeting-card-bundle');
            $candidate = array_merge(
                $state['selectedAttributes'] ?? [],
                [$context['attributeName'] => $context['value']]
            );

            foreach ($state['variationSelector']['variations'] ?? [] as $variation) {
                if (! $variation['inStock'] || ! $variation['purchasable']) {
                    continue;
                }

                $matches = true;
                foreach ($variation['attributes'] as $name => $value) {
                    $wanted = $candidate[$name] ?? '';
                    if ('' !== $value && '' !== $wanted && $wanted !== $value) {
                        $matches = false;
                        break;
                    }
                }

                if ($matches) {
                    return true;
                }
            }

            return false;
        },
    ]);

    $prepared[$product_id] = [
        'productId'          => $product_id,
        'cards'              => $cards,
        'variationSelector'  => $variation_selector,
        'selectedAttributes' => $selected,
        'nativePriceSync'    => $native_price_sync,
        'isAvailable'        => $is_available,
    ];

    return $prepared[$product_id];
}

/**
 * Die unter "Bundle-sells" verknüpften Karten des Produkts.
 *
 * @param WC_Product $product
 * @return array[] Je Karte productId, name, price, image.
 */
function gcb_build_cards(WC_Product $product)
{
    $cards = [];

    foreach (gcb_get_card_ids($product) as $card_id) {
        $card = wc_get_product($card_id);

        $cards[] = [
            'productId' => $card->get_id(),
            'name'      => $card->get_name(),
            'price'     => $card->get_price(),
            'image'     => wp_get_attachment_image_url($card->get_image_id(), 'woocommerce_thumbnail')
                ?: wc_placeholder_img_src(),
        ];
    }

    return $cards;
}

/**
 * Attribute, Werte und Varianten eines variablen Produkts für die
 * Variantenauswahl. Einfache Produkte haben keine: dann null.
 *
 * @param WC_Product $product
 * @return array|null name, attributes (je name, label, options), variations.
 */
function gcb_build_variation_selector(WC_Product $product)
{
    if (! $product->is_type('variable')) {
        return null;
    }

    /** @var WC_Product_Variable $product */
    $variation_attributes = [];
    foreach ($product->get_variation_attributes() as $raw_name => $raw_options) {
        $taxonomy    = wc_variation_attribute_name($raw_name);
        $is_taxonomy = taxonomy_exists($taxonomy);
        $options     = [];

        foreach ($raw_options as $option) {
            if ($is_taxonomy) {
                $term  = get_term_by('slug', $option, $taxonomy);
                $label = $term ? $term->name : $option;
            } else {
                $label = $option;
            }
            $options[] = ['value' => $option, 'label' => $label];
        }

        $variation_attributes[] = [
            // Derselbe Schlüssel, den get_available_variations() nach dem
            // "attribute_"-Präfix verwendet: bei Taxonomie-Attributen ohnehin
            // "pa_…", bei eigenen Attributen aber der bereinigte Name ("Farbe"
            // -> "farbe"). Mit dem Rohnamen fände store.js dort nie eine Variante.
            'name'    => sanitize_title($raw_name),
            'label'   => wc_attribute_label($raw_name, $product),
            'options' => $options,
        ];
    }

    $variations             = [];
    $variation_descriptions = [];
    foreach ($product->get_available_variations() as $variation_data) {
        // WC liefert Attribut-Keys als "attribute_{name}" -- Präfix entfernen,
        // damit sie zu den Keys in $variation_attributes/selectedAttributes passen.
        $variation_attrs = [];
        foreach ($variation_data['attributes'] as $key => $value) {
            $variation_attrs[substr($key, strlen('attribute_'))] = $value;
        }

        // Beschreibung der Variante (Feld "Beschreibung" in den Variationen).
        // WooCommerce liefert sie als HTML ("<p>ca. 35 cm Ø</p>"); im Knopf
        // brauchen wir reinen Text -- ein <p> ist in einem <label> nicht
        // erlaubt. Nur fürs Rendern, nicht im State fürs JavaScript.
        $variation_descriptions[] = [
            'attributes'  => $variation_attrs,
            'description' => trim(wp_strip_all_tags($variation_data['variation_description'] ?? '')),
        ];

        $variations[] = [
            'variationId' => $variation_data['variation_id'],
            'attributes'  => $variation_attrs,
            // Reiner Text (keine Preis-HTML-Spans) fürs data-wp-text der
            // eigenen Preiszeile (Rückfall, siehe nativePriceSync).
            // html_entity_decode ist nötig, weil wc_price() Währungssymbole/
            // -leerzeichen als HTML-Entities ausgibt (z. B. "&#67;&#72;&#70;"
            // für "CHF", "&nbsp;"); data-wp-text setzt textContent und würde
            // diese Entities sonst wörtlich anzeigen.
            'priceText'   => html_entity_decode(
                wp_strip_all_tags($variation_data['price_html']),
                ENT_QUOTES,
                'UTF-8'
            ),
            'inStock'     => (bool) $variation_data['is_in_stock'],
            // Deaktiviert o. Ä.: taucht in der Auswahl auf, lässt sich aber
            // nicht kaufen (der Knopf wird dann gesperrt).
            'purchasable' => (bool) $variation_data['is_purchasable'],
        ];
    }

    // Nur Attributwerte anbieten, zu denen es mindestens eine verfügbare
    // Variante gibt. get_variation_attributes() liefert ALLE Werte, auch solche,
    // deren Variante WooCommerce aus get_available_variations() aussortiert hat
    // (z. B. Variante ohne Preis). Ohne diesen Filter liesse sich z. B. "gross"
    // wählen, obwohl es dazu nichts zu kaufen gibt.
    //
    // Ein leerer Wert auf einer Variante heisst "beliebig" (WooCommerce-
    // Konvention) -- dann bleiben für dieses Attribut alle Werte erlaubt.
    foreach ($variation_attributes as $index => $attribute) {
        $used = array_column(array_column($variations, 'attributes'), $attribute['name']);

        if (in_array('', $used, true)) {
            continue;
        }

        $variation_attributes[$index]['options'] = array_values(array_filter(
            $attribute['options'],
            static function ($option) use ($used) {
                return in_array($option['value'], $used, true);
            }
        ));
    }

    // Beschreibung pro Knopf: die Beschreibung der Variante(n), die genau
    // diesen Wert haben. Bei einem einzigen Attribut (z. B. nur "Grösse")
    // gehört zu jedem Wert genau eine Variante -- eindeutig. Bei mehreren
    // Attributen kann ein Wert zu mehreren Varianten mit unterschiedlichen
    // Beschreibungen gehören; dann bleibt der Knopf ohne Beschreibung, statt
    // eine willkürlich auszuwählen.
    foreach ($variation_attributes as $index => $attribute) {
        foreach ($attribute['options'] as $option_index => $option) {
            $texts = [];
            foreach ($variation_descriptions as $variation) {
                if (($variation['attributes'][$attribute['name']] ?? null) === $option['value']) {
                    $texts[] = $variation['description'];
                }
            }

            $texts = array_unique($texts);
            $variation_attributes[$index]['options'][$option_index]['description'] =
                1 === count($texts) ? reset($texts) : '';
        }
    }

    return [
        'name'       => $product->get_name(),
        'attributes' => $variation_attributes,
        'variations' => $variations,
    ];
}

/**
 * Vorauswahl wie in der nativen Form: die im Admin gesetzten Standardwerte
 * ("Standard-Formularwerte" der Variationen), sofern sie noch angeboten
 * werden. Hat ein Attribut nur einen einzigen Wert, gibt es nichts zu wählen --
 * dann wird er ebenfalls vorausgewählt.
 *
 * @param WC_Product $product
 * @param array|null $variation_selector Ergebnis von gcb_build_variation_selector().
 * @return array Attributname => gewählter Wert ('' = nicht gewählt).
 */
function gcb_build_selected_attributes(WC_Product $product, $variation_selector)
{
    if (! $variation_selector) {
        return [];
    }

    /** @var WC_Product_Variable $product */
    $defaults = $product->get_default_attributes();
    $selected = [];

    foreach ($variation_selector['attributes'] as $attribute) {
        $offered = array_column($attribute['options'], 'value');
        $default = $defaults[$attribute['name']] ?? '';

        if ('' !== $default && in_array($default, $offered, true)) {
            $selected[$attribute['name']] = $default;
        } elseif (1 === count($offered)) {
            $selected[$attribute['name']] = $offered[0];
        } else {
            $selected[$attribute['name']] = '';
        }
    }

    return $selected;
}

/**
 * Varianten in den WooCommerce-Store laden, damit der native Preis-Block mit
 * der Auswahl umspringt.
 *
 * Der Block woocommerce/product-price ist bei variablen Produkten mit
 * unterschiedlichen Preisen bereits interaktiv: er zeigt `price_html` von
 * `state.productInContext` aus dem Store `woocommerce/products` -- ist dort
 * `variationId` gesetzt, den Preis dieser Variante, sonst die Preisspanne.
 * WooCommerce legt `productId` im Single-Product-Template selbst an, die
 * Varianten lädt aber nur sein eigener "Add to Cart with Options"-Block, den
 * unsere Blöcke ersetzen. Deshalb laden wir sie mit derselben Funktion nach;
 * das JavaScript setzt dann `variationId` (callbacks.syncNativePrice).
 *
 * ACHTUNG: WooCommerce kennzeichnet diese Schnittstelle ausdrücklich als
 * experimentell (Zustimmungstext ist Pflicht). Fällt die Funktion bei einem
 * Update weg oder lehnt sie den Text ab, liefert diese Funktion false, und es
 * erscheint wieder die eigene Preiszeile. Nach WooCommerce-Updates prüfen, ob
 * der Preis beim Wechsel der Variante noch mitspringt.
 *
 * @param WC_Product $product
 * @param array|null $variation_selector
 * @return bool Ob der native Preis-Block mitspringen kann.
 */
function gcb_load_native_price_variations(WC_Product $product, $variation_selector)
{
    if (! $variation_selector || ! function_exists('wc_interactivity_api_load_variations')) {
        return false;
    }

    try {
        wc_interactivity_api_load_variations(
            'I acknowledge that using experimental APIs means my theme or plugin will inevitably break in the next version of WooCommerce',
            $product->get_id()
        );
        return true;
    } catch (\Throwable $e) {
        return false;
    }
}
