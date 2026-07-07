<?php

/**
 * WooCommerce-Integration für den Grusskarten-Bundle-Block.
 *
 * Seit v3.1 ist der Strauss ein echtes WooCommerce-"Product Bundle", die
 * Grusskarten sind optionale Bundled Items darin (siehe
 * greeting-card-bundle-block-spec_v3.1.md, §1–§4). Parent-Child-Beziehung,
 * Stock, Preis/Steuer, Mengen-Sync und kaskadiertes Entfernen laufen komplett
 * nativ über WooCommerce Product Bundles – dafür ist hier kein Code mehr
 * nötig (ersetzt den gesamten Hook-Apparat von v2, siehe git-history von
 * `woocommerce-hooks.php`).
 *
 * Übrig bleibt nur der Grusstext (Freitext), den Product Bundles von sich aus
 * nicht kennt: Weg B aus §9 der Spec (eigenes cart_item_data), weil Product
 * Add-Ons in dieser Installation nicht aktiv ist (Weg A entfällt).
 *
 * Zusätzlich: die Koexistenz-Weiche mit der nativen Add-to-Cart-Form (§10 der
 * v3.1.1-Spec) – der native Block bleibt im Template, wird aber pro Produkt
 * per render_block-Filter unterdrückt, wenn unser eigener Block zuständig ist.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * 0. Zuständigkeits-Prädikat: ist dieses Produkt ein Grusskarten-Bundle?
 *
 * Gemeinsam genutzt von render.php (Selbst-Unterdrückung auf allen anderen
 * Produkten) und dem render_block-Filter unten (Unterdrückung der nativen
 * Add-to-Cart-Form nur auf genau den Produkten, für die unser Block
 * zuständig ist). Beide Seiten MÜSSEN dieselbe Bedingung verwenden – sonst
 * driften sie auseinander und ein Produkt zeigt am Ende zwei oder null
 * Add-to-Cart-Buttons.
 */
function gcb_is_greeting_card_bundle($product)
{
    if (! $product || ! $product->is_type('bundle')) {
        return false;
    }

    foreach ($product->get_bundled_items() as $bundled_item) {
        $cp = $bundled_item->get_product();
        if ($cp && has_term('grusskarte', 'product_cat', $cp->get_id())) {
            return true;
        }
    }

    return false;
}

/**
 * 0b. Findet das "Hauptprodukt" innerhalb eines Grusskarten-Bundles — den
 * Pflicht-Bundled-Item, der KEINE Grusskarte ist (z. B. ein variabler
 * Strauss, der als Bundled Item eingehüllt wurde, siehe SETUP.md "Weg 2").
 *
 * Nur relevant, wenn dieses Pflicht-Item ein VARIABLES Produkt ist — dann
 * muss unser Block zusätzlich zur Kartenauswahl eine Variantenauswahl
 * (Grösse/Farbe) anbieten und deren `variation_id`/`attributes` mit in die
 * Store-API-`bundle_configuration` aufnehmen. Ein einfaches (simple) Pflicht-
 * Item braucht dagegen keine Auswahl-UI — Product Bundles fügt es ohnehin
 * automatisch mit seinen Standardwerten hinzu.
 *
 * Bewusst OHNE eigenes Admin-Feld ("Hauptprodukt markieren") ermittelt: Ein
 * Pflicht-Item, das keine Grusskarte ist, kann in diesem Bundle nur das
 * eingehüllte Hauptprodukt sein. Erwartet wird genau eines pro Bundle; sind
 * es mehrere, wird das erste zurückgegeben (Konfigurationsfehler in
 * "Bundled Products" andernfalls).
 *
 * @param WC_Product_Bundle $product
 * @return WC_Bundled_Item|null
 */
function gcb_get_variable_main_item($product)
{
    if (! $product || ! $product->is_type('bundle')) {
        return null;
    }

    foreach ($product->get_bundled_items() as $bundled_item) {
        if ($bundled_item->is_optional()) {
            continue;
        }

        $cp = $bundled_item->get_product();
        if (! $cp || has_term('grusskarte', 'product_cat', $cp->get_id())) {
            continue;
        }

        if ($cp->is_type('variable')) {
            return $bundled_item;
        }
    }

    return null;
}

/**
 * 0c. (Verworfen) Ein zusätzlicher "Item Grouping"-Modus auf Basis von
 * Product Bundles' "faked_parent_item"-Feature sollte das Bundle-Container-
 * Item im Cart komplett verstecken und das Hauptprodukt (Strauss) an dessen
 * Stelle als Parent-Zeile zeigen. In der Praxis blendet der Cart-Block das
 * Container-Item damit aber nicht zuverlässig aus (getestet: Container bleibt
 * als eigene, sichtbare Zeile bestehen) — das Feature war laut Plugin-Code nie
 * als reguläre, first-class Option vorgesehen.
 *
 * Stattdessen wird das Bundle jetzt nur noch verwendet, wenn tatsächlich eine
 * Karte gewählt wird (siehe view.js addToCart()) — dann ist eine sichtbare
 * Eltern-Kind-Beziehung im Warenkorb inhaltlich korrekt, mit ganz normalem
 * "Grouped"-Modus. Wird keine Karte gewählt, umgeht der Block das Bundle
 * komplett und kauft die Strauss-Variante direkt — dann taucht das
 * Bundle-Produkt im Warenkorb gar nicht erst auf. Siehe SETUP.md "Weg 2".
 */

/**
 * 1. Grusstext aus dem add-item-Request einsammeln und am Bundle-Container
 * (dem Strauss-Cart-Item selbst) ablegen.
 *
 * WICHTIG: Der Store-API-`add-item`-Request akzeptiert beliebige zusätzliche
 * JSON-Felder über den deklarierten args-Schema hinaus – WooCommerce Product
 * Bundles selbst nutzt genau dasselbe Muster für sein eigenes
 * `bundle_configuration`-Feld (siehe
 * WC_PB_Cart::handle_store_api_add_to_cart_request(), welches denselben
 * Filter nutzt). Deshalb per get_json_params() lesen statt per
 * $request->get_param(), das nur deklarierte Felder liefert.
 *
 * Der Merge auf `cart_item_data` (statt Ersetzen des ganzen Arrays) sorgt
 * dafür, dass dieser Filter unabhängig von Product Bundles eigenem Filter auf
 * denselben Hook koexistiert – unabhängig von der Aufruf-Reihenfolge.
 */
add_filter('woocommerce_store_api_add_to_cart_data', function ($data, $request) {
    $params = $request->get_json_params();
    $text   = isset($params['greeting_card_text'])
        ? mb_substr(sanitize_textarea_field($params['greeting_card_text']), 0, 300)
        : '';

    if ('' !== $text) {
        $data['cart_item_data']['_greeting_card_text'] = $text;
    }

    return $data;
}, 10, 2);

/**
 * 1b. Grusstext vom Bundle-Container auf die tatsächliche Grusskarten-Position
 * kopieren, sobald Product Bundles das Kind-Cart-Item für die gewählte Karte
 * anlegt. Der Container bleibt technisch weiterhin Träger des Werts (er ist
 * beim Einsammeln in Punkt 1 die einzige greifbare Stelle), Anzeige (Punkt 2)
 * und Bestell-Persistenz (Punkt 3) berücksichtigen aber nur noch die Karten-
 * Position, damit der Grusstext für Kund:innen dort steht, wo er hingehört.
 *
 * `woocommerce_bundled_item_cart_data` feuert einmal pro tatsächlich zum
 * Warenkorb hinzugefügtem Bundled Item (siehe WC_PB_Cart::bundle_add_to_cart())
 * und liefert `$cart_item_data` des Containers als zweites Argument mit.
 */
add_filter('woocommerce_bundled_item_cart_data', function ($bundled_item_cart_data, $cart_item_data) {
    if (empty($cart_item_data['_greeting_card_text']) || empty($bundled_item_cart_data['bundled_item_id'])) {
        return $bundled_item_cart_data;
    }

    $bundled_item = wc_pb_get_bundled_item($bundled_item_cart_data['bundled_item_id']);
    $cp           = $bundled_item ? $bundled_item->get_product() : null;

    if ($cp && has_term('grusskarte', 'product_cat', $cp->get_id())) {
        $bundled_item_cart_data['_greeting_card_text'] = $cart_item_data['_greeting_card_text'];
    }

    return $bundled_item_cart_data;
}, 10, 2);

/**
 * 2. Grusstext im Warenkorb anzeigen — nur an der Grusskarten-Position, nicht
 * am Bundle-Container (dort liegt der Wert zwar auch noch, siehe 1b, soll aber
 * nicht doppelt angezeigt werden).
 */
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (empty($cart_item['_greeting_card_text']) || wc_pb_is_bundle_container_cart_item($cart_item)) {
        return $item_data;
    }

    $item_data[] = [
        'key'   => __('Grusstext', 'greeting-card-block'),
        'value' => esc_html($cart_item['_greeting_card_text']),
    ];

    return $item_data;
}, 10, 2);

/**
 * 3. Grusstext dauerhaft in der Bestellung speichern — ebenfalls nur an der
 * Grusskarten-Position (siehe Punkt 2).
 *
 * Die Parent-Child-Verknüpfung selbst schreibt Product Bundles automatisch
 * (WC_PB_Order); hier geht es nur um den Grusstext.
 */
add_action('woocommerce_checkout_create_order_line_item', function ($item, $cart_item_key, $values) {
    if (! empty($values['_greeting_card_text']) && ! wc_pb_is_bundle_container_cart_item($values)) {
        $item->add_meta_data(__('Grusstext', 'greeting-card-block'), $values['_greeting_card_text'], true);
    }
}, 10, 3);

/**
 * 4a. Koexistenz mit der nativen Add-to-Cart-Form — Single-Product-Template
 * OHNE eigenen "Add to Cart with Options"-Block (dieser Shop).
 *
 * Der native Add-to-Cart-Block bleibt im Single-Product-Template stehen –
 * würde man ihn entfernen, verlören ALLE Nicht-Bundle-Produkte (einzelne
 * Grusskarten, sonstiges Sortiment) ihren Kaufen-Button, weil dasselbe
 * Template für den ganzen Shop gilt.
 *
 * In DIESEM Template (siehe Site Editor → "Single Product" → Codeansicht) gibt
 * es gar keinen expliziten `woocommerce/add-to-cart-form`- oder
 * `add-to-cart-with-options`-Block – die klassische Add-to-Cart-Ausgabe wird
 * stattdessen automatisch von WooCommerce um den `core/post-excerpt`-Block
 * herum injiziert (`SingleProductTemplateCompatibility`), über den ganz
 * normalen klassischen Hook `woocommerce_single_product_summary` (Callback
 * `woocommerce_template_single_add_to_cart` an Priorität 30 – siehe
 * `woocommerce_template_single_product_summary()`/`content-single-product.php`
 * und WooCommerce's `SingleProductTemplateCompatibility::set_hook_data()`).
 * Ein `render_block`-Filter auf Blocknamen liefe hier ins Leere.
 *
 * Deshalb klammern wir NUR diesen einen Callback per Output-Buffering ein
 * (Prioritäten 29/31 – knapp davor/danach) und verwerfen seine Ausgabe genau
 * dann, wenn das aktuelle Produkt ein Grusskarten-Bundle ist. Titel, Preis,
 * Bewertung, Kurzbeschreibung, Meta und Sharing (die anderen an denselben Hook
 * gebundenen Callbacks) bleiben unangetastet.
 */
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (gcb_is_greeting_card_bundle($product)) {
        ob_start();
    }
}, 29);

add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (gcb_is_greeting_card_bundle($product)) {
        ob_end_clean();
    }
}, 31);

/**
 * 4b. Dieselbe Koexistenz-Weiche, defensiv auch als render_block-Filter —
 * für den Fall, dass das Single-Product-Template (jetzt oder künftig) einen
 * expliziten `woocommerce/add-to-cart-form`- oder
 * `woocommerce/add-to-cart-with-options`-Block enthält (dann greift 4a nicht,
 * weil dieser Block seine eigene Ausgabe unabhängig vom klassischen Hook
 * erzeugt). Beide Mechanismen zusammen decken beide Template-Varianten ab,
 * ohne sich gegenseitig zu stören.
 */
add_filter('render_block', function ($content, $block) {
    $targets = ['woocommerce/add-to-cart-form', 'woocommerce/add-to-cart-with-options'];
    if (! in_array($block['blockName'] ?? '', $targets, true)) {
        return $content;
    }

    $product = wc_get_product(get_the_ID());

    return gcb_is_greeting_card_bundle($product) ? '' : $content;
}, 10, 2);

/**
 * 5. Admin-Hinweis, falls WooCommerce Product Bundles nicht aktiv ist.
 *
 * Der Block setzt den Produkttyp "Bundle" voraus (siehe render.php); ohne
 * Product Bundles rendert er auf jedem Produkt still gar nichts. Ein Hinweis
 * im Plugins-Bildschirm macht diese Abhängigkeit sichtbar, ohne sie im Code
 * hart zu erzwingen (z. B. per Aktivierungs-Check).
 */
add_action('admin_notices', function () {
    if (class_exists('WC_Product_Bundle')) {
        return;
    }

    if (! current_user_can('activate_plugins')) {
        return;
    }

    printf(
        '<div class="notice notice-warning"><p>%s</p></div>',
        esc_html__('Der Grusskarten-Bundle-Block benötigt die Extension "WooCommerce Product Bundles" (Strauss-Produkt vom Typ "Bundle" mit den Grusskarten als optionale Bundled Items). Siehe SETUP.md im Plugin-Ordner.', 'greeting-card-block')
    );
});
