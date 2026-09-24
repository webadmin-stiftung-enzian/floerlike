<?php

/**
 * WooCommerce-Integration für den Grusskarten-Block.
 *
 * Seit v4.0 ist der Strauss ein ganz normales VARIABLES Produkt, die
 * Grusskarten hängen als "Bundle-sells" (Tab "Linked Products") daran. Der
 * frühere Umweg über ein Produkt vom Typ "Bundle" mit eingehülltem Strauss
 * entfällt damit komplett — pro Strauss gibt es wieder genau ein Produkt.
 *
 * Product Bundles wird nur noch als Admin-Oberfläche für die Kartenliste
 * genutzt (Meta `_wc_pb_bundle_sell_ids`). Seine eigene Bundle-Sells-Logik
 * greift hier bewusst NICHT: sie läuft nur über die klassische Add-to-Cart-Form
 * (`WC_PB_BS_Cart::bundle_sells_add_to_cart()` verlangt `$_REQUEST['add-to-cart']`)
 * und erzeugt im Warenkorb ohnehin keine echte Eltern-Kind-Beziehung, sondern
 * nur eine Rabatt-Zuordnung.
 *
 * Strauss und Karte sind deshalb zwei normale Warenkorb-Positionen, die über
 * eine im Browser erzeugte Gruppen-ID (`_gcb_group`) zusammengehalten werden.
 * Der Warenkorb-Schlüssel der Elternposition wird nie übertragen, sondern bei
 * Bedarf serverseitig aus der Gruppe aufgelöst — er ändert sich, sobald sich
 * die Menge ändert.
 *
 * @package GreetingCardBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

/**
 * 0. Kartenliste eines Produkts: die unter "Bundle-sells" verknüpften
 * Grusskarten.
 *
 * Quelle ist `WC_PB_BS_Product::get_bundle_sell_ids()`, das die Liste bereits
 * auf unterstützte Produkttypen (simple/subscription) eingrenzt. Ist Product
 * Bundles nicht aktiv, wird die Meta direkt gelesen: die Liste ist dann zwar
 * im Admin nicht mehr pflegbar, bestehende Produkte funktionieren im Frontend
 * aber unverändert weiter.
 *
 * @param WC_Product|int|null $product
 * @return int[] Produkt-IDs kaufbarer Grusskarten.
 */
function gcb_get_card_ids($product)
{
    if (! $product instanceof WC_Product) {
        $product = $product ? wc_get_product($product) : null;
    }

    if (! $product instanceof WC_Product) {
        return [];
    }

    if (class_exists('WC_PB_BS_Product')) {
        $ids = WC_PB_BS_Product::get_bundle_sell_ids($product);
    } else {
        $ids = $product->get_meta('_wc_pb_bundle_sell_ids', true);
    }

    if (empty($ids) || ! is_array($ids)) {
        return [];
    }

    $card_ids = [];
    foreach (array_map('absint', $ids) as $card_id) {
        $card = $card_id ? wc_get_product($card_id) : null;
        // Nicht kaufbare Karten (entwurf, gelöscht, ausverkauft) gar nicht erst
        // anbieten — sonst scheitert erst der Add-to-Cart-Request.
        if ($card && $card->is_purchasable() && $card->is_in_stock()) {
            $card_ids[] = $card->get_id();
        }
    }

    return $card_ids;
}

/**
 * 0b. Zuständigkeits-Prädikat: übernimmt unser Block den Warenkorb-Button
 * dieses Produkts?
 *
 * Ja für alle einfachen und variablen Produkte — unabhängig davon, ob Karten
 * verknüpft sind. Ohne Karten zeigt der Block einfach keine Kartenauswahl,
 * das Produkt bleibt aber kaufbar. Bundle-, Grouped- und External-Produkte
 * brauchen eigene Formulare (Konfiguration, Einzelmengen, Fremd-Link), die
 * der Block nicht nachbaut; dort bleibt die native Form zuständig.
 *
 * Gemeinsam genutzt von render.php (Selbst-Unterdrückung auf allen anderen
 * Produkten) und der Koexistenz-Weiche unten (Unterdrückung der nativen
 * Add-to-Cart-Form nur auf genau den Produkten, für die unser Block zuständig
 * ist). Beide Seiten MÜSSEN dieselbe Bedingung verwenden – sonst driften sie
 * auseinander und ein Produkt zeigt am Ende zwei oder null Add-to-Cart-Buttons.
 *
 * @param WC_Product|int|null $product
 * @return bool
 */
function gcb_handles_product($product)
{
    if (! $product instanceof WC_Product) {
        $product = $product ? wc_get_product($product) : null;
    }

    return $product instanceof WC_Product && $product->is_type(['simple', 'variable']);
}

/**
 * 0b'. Hat dieses Produkt verknüpfte Karten? Steuert nur, ob der Block die
 * Kartenauswahl zeigt — nicht, ob er überhaupt rendert (siehe 0b).
 *
 * @param WC_Product|int|null $product
 * @return bool
 */
function gcb_is_card_parent($product)
{
    return ! empty(gcb_get_card_ids($product));
}

/**
 * 0c. Überschrift der Kartenauswahl — im Admin unter "Bundle-sells title"
 * gepflegt, mit eigenem Standardtext als Rückfall.
 *
 * @param WC_Product|int|null $product
 * @return string
 */
function gcb_get_cards_title($product)
{
    if (! $product instanceof WC_Product) {
        $product = $product ? wc_get_product($product) : null;
    }

    $title = $product instanceof WC_Product
        ? trim((string) $product->get_meta('_wc_pb_bundle_sells_title', true))
        : '';

    return '' !== $title
        ? $title
        : __('Möchten Sie eine Grusskarte hinzufügen?', 'greeting-card-block');
}

/**
 * 1. Gruppen-ID, Rolle und Grusstext aus dem add-item-Request einsammeln.
 *
 * WICHTIG: Der Store-API-`add-item`-Request akzeptiert beliebige zusätzliche
 * JSON-Felder über das deklarierte args-Schema hinaus – WooCommerce Product
 * Bundles nutzt genau dasselbe Muster für sein eigenes
 * `bundle_configuration`-Feld (siehe
 * WC_PB_Cart::handle_store_api_add_to_cart_request(), welches denselben Filter
 * nutzt).
 *
 * Gelesen wird aus JSON- UND Body-Params: bei einem einzelnen Request landen
 * die Felder in den JSON-Params, innerhalb eines `/wc/store/v1/batch`-Requests
 * dagegen in den Body-Params — WP_REST_Server::serve_batch_request_v1() baut
 * jede Teil-Anfrage per set_body_params() zusammen, dort liefert
 * get_json_params() nichts.
 *
 * Der Merge auf `cart_item_data` (statt Ersetzen des ganzen Arrays) sorgt
 * dafür, dass dieser Filter unabhängig von fremden Filtern auf demselben Hook
 * koexistiert – unabhängig von der Aufruf-Reihenfolge.
 */
add_filter('woocommerce_store_api_add_to_cart_data', function ($data, $request) {
    $params = $request->get_json_params();

    if (! is_array($params) || empty($params)) {
        $params = $request->get_body_params();
    }

    if (! is_array($params)) {
        return $data;
    }

    $group = isset($params['gcb_group']) ? sanitize_key($params['gcb_group']) : '';
    $role  = isset($params['gcb_role']) && 'card' === $params['gcb_role'] ? 'card' : 'parent';

    if ('' === $group) {
        return $data;
    }

    $data['cart_item_data']['_gcb_group'] = $group;
    $data['cart_item_data']['_gcb_role']  = $role;

    if ('card' === $role && isset($params['greeting_card_text'])) {
        $text = mb_substr(sanitize_textarea_field($params['greeting_card_text']), 0, 300);

        if ('' !== $text) {
            $data['cart_item_data']['_greeting_card_text'] = $text;
        }
    }

    return $data;
}, 10, 2);

/**
 * 1b. Warenkorb-Schlüssel der Elternposition einer Gruppe.
 *
 * Bewusst jedes Mal neu aufgelöst statt in `cart_item_data` abgelegt: der
 * Schlüssel ergibt sich aus Produkt-ID, Variation und Item-Daten und ändert
 * sich damit nicht, wohl aber kann die Position entfernt und neu angelegt
 * werden. Die Gruppen-ID ist die stabile Grösse.
 *
 * @param string  $group Gruppen-ID.
 * @param WC_Cart $cart  Warenkorb (Standard: der aktuelle).
 * @return string Leerstring, wenn die Elternposition nicht (mehr) existiert.
 */
function gcb_find_parent_key($group, $cart = null)
{
    if ('' === $group) {
        return '';
    }

    $cart = $cart instanceof WC_Cart ? $cart : WC()->cart;

    if (! $cart instanceof WC_Cart) {
        return '';
    }

    foreach ($cart->cart_contents as $key => $cart_item) {
        if (
            ! empty($cart_item['_gcb_group'])
            && $cart_item['_gcb_group'] === $group
            && 'parent' === ($cart_item['_gcb_role'] ?? 'parent')
        ) {
            return $key;
        }
    }

    return '';
}

/**
 * 1c. Kartenpositionen einer Gruppe.
 *
 * @param string  $group Gruppen-ID.
 * @param WC_Cart $cart  Warenkorb (Standard: der aktuelle).
 * @return string[] Warenkorb-Schlüssel.
 */
function gcb_find_card_keys($group, $cart = null)
{
    if ('' === $group) {
        return [];
    }

    $cart = $cart instanceof WC_Cart ? $cart : WC()->cart;

    if (! $cart instanceof WC_Cart) {
        return [];
    }

    $keys = [];
    foreach ($cart->cart_contents as $key => $cart_item) {
        if (
            ! empty($cart_item['_gcb_group'])
            && $cart_item['_gcb_group'] === $group
            && 'card' === ($cart_item['_gcb_role'] ?? 'parent')
        ) {
            $keys[] = $key;
        }
    }

    return $keys;
}

/**
 * 1d. Karte mitentfernen, wenn der Strauss entfernt wird — und beim
 * Wiederherstellen ebenso zurückholen.
 *
 * `woocommerce_cart_item_removed` feuert auch beim Entfernen über den
 * Cart-Block bzw. die Store API. Das Gegenstück `..._restored` deckt das
 * "Rückgängig"-Verhalten der klassischen Warenkorbseite ab.
 */
add_action('woocommerce_cart_item_removed', function ($removed_key, $cart) {
    $removed = $cart->removed_cart_contents[$removed_key] ?? null;

    if (empty($removed['_gcb_group']) || 'parent' !== ($removed['_gcb_role'] ?? 'parent')) {
        return;
    }

    foreach (gcb_find_card_keys($removed['_gcb_group'], $cart) as $card_key) {
        $cart->remove_cart_item($card_key);
    }
}, 10, 2);

add_action('woocommerce_cart_item_restored', function ($restored_key, $cart) {
    $restored = $cart->cart_contents[$restored_key] ?? null;

    if (empty($restored['_gcb_group']) || 'parent' !== ($restored['_gcb_role'] ?? 'parent')) {
        return;
    }

    foreach ($cart->removed_cart_contents as $removed_key => $removed) {
        if (
            ! empty($removed['_gcb_group'])
            && $removed['_gcb_group'] === $restored['_gcb_group']
            && 'card' === ($removed['_gcb_role'] ?? 'parent')
        ) {
            $cart->restore_cart_item($removed_key);
        }
    }
}, 10, 2);

/**
 * 1e. Verwaiste Karten aufräumen und Mengen angleichen.
 *
 * Läuft bei jeder Preisberechnung, also auch nach Mengenänderungen über den
 * Cart-Block. Zwei Fälle:
 *
 * - Die Elternposition ist weg (z. B. per Session-Wiederherstellung oder durch
 *   fremden Code entfernt): die Karte hat dann keinen Bezug mehr und wird
 *   entfernt.
 * - Die Mengen weichen ab: die Karte folgt dem Strauss (eine Karte pro Strauss).
 *
 * Absichtlich hier und nicht nur in `woocommerce_after_cart_item_quantity_update`:
 * dieser Hook deckt alle Wege ab, über die sich eine Menge ändern kann.
 */
add_action('woocommerce_before_calculate_totals', function ($cart) {
    if (! $cart instanceof WC_Cart || $cart->is_empty()) {
        return;
    }

    foreach ($cart->cart_contents as $key => $cart_item) {
        if (empty($cart_item['_gcb_group']) || 'card' !== ($cart_item['_gcb_role'] ?? 'parent')) {
            continue;
        }

        $parent_key = gcb_find_parent_key($cart_item['_gcb_group'], $cart);

        if ('' === $parent_key) {
            $cart->remove_cart_item($key);
            continue;
        }

        $parent_quantity = (int) $cart->cart_contents[$parent_key]['quantity'];

        if ($parent_quantity > 0 && (int) $cart_item['quantity'] !== $parent_quantity) {
            // refresh_totals = false: wir stecken bereits mitten in der
            // Berechnung, ein erneuter Durchlauf wäre eine Endlosschleife.
            $cart->set_quantity($key, $parent_quantity, false);
        }
    }
}, 5);

/**
 * 1f. Menge der Karte im Cart-Block nicht editierbar machen.
 *
 * Sie folgt ohnehin dem Strauss (1e); ein eigener Mengen-Regler würde nur
 * Erwartungen wecken, die sofort wieder überschrieben werden. Der Filter ist
 * Teil der Store-API-Mengenlogik, das dritte Argument ist das zugehörige
 * Warenkorb-Element (siehe WooCommerce, StoreApi/Utilities/QuantityLimits.php).
 */
add_filter('woocommerce_store_api_product_quantity_editable', function ($editable, $product, $cart_item) {
    if (is_array($cart_item) && 'card' === ($cart_item['_gcb_role'] ?? '')) {
        return false;
    }

    return $editable;
}, 10, 3);

/**
 * 2. Grusstext im Warenkorb anzeigen — er hängt an der Kartenposition selbst,
 * eine Weiche wie früher (Container vs. Kind) braucht es nicht mehr.
 */
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (empty($cart_item['_greeting_card_text'])) {
        return $item_data;
    }

    $item_data[] = [
        'key'   => __('Grusstext', 'greeting-card-block'),
        'value' => esc_html($cart_item['_greeting_card_text']),
    ];

    return $item_data;
}, 10, 2);

/**
 * 3. Grusstext und Gruppenzugehörigkeit dauerhaft in der Bestellung speichern.
 *
 * Die Gruppen-ID wird als verstecktes Meta (führender Unterstrich) abgelegt:
 * sie ist für Kund:innen bedeutungslos, hält aber die Zusammengehörigkeit von
 * Strauss und Karte auch in der Bestellung fest — früher kam diese Verknüpfung
 * von Product Bundles (WC_PB_Order).
 */
add_action('woocommerce_checkout_create_order_line_item', function ($item, $cart_item_key, $values) {
    if (! empty($values['_gcb_group'])) {
        $item->add_meta_data('_gcb_group', $values['_gcb_group'], true);
        $item->add_meta_data('_gcb_role', $values['_gcb_role'] ?? 'parent', true);
    }

    if (! empty($values['_greeting_card_text'])) {
        $item->add_meta_data(__('Grusstext', 'greeting-card-block'), $values['_greeting_card_text'], true);
    }
}, 10, 3);

/**
 * 4a. Koexistenz mit der nativen Add-to-Cart-Form — Single-Product-Template
 * OHNE eigenen "Add to Cart with Options"-Block (dieser Shop).
 *
 * Der native Add-to-Cart-Block bleibt im Single-Product-Template stehen –
 * würde man ihn entfernen, verlören ALLE anderen Produkte (einzelne
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
 * dann, wenn unser Block für das aktuelle Produkt zuständig ist. Titel, Preis,
 * Bewertung, Kurzbeschreibung, Meta und Sharing (die anderen an denselben Hook
 * gebundenen Callbacks) bleiben unangetastet.
 */
add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (gcb_handles_product($product)) {
        ob_start();
    }
}, 29);

add_action('woocommerce_single_product_summary', function () {
    global $product;
    if (gcb_handles_product($product)) {
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

    return gcb_handles_product(get_the_ID()) ? '' : $content;
}, 10, 2);

/**
 * 4c. Product Bundles' eigene Bundle-Sells-Auswahl unterdrücken.
 *
 * WC_PB_BS_Display hängt sich an `woocommerce_before_add_to_cart_form` und
 * blendet die verknüpften Karten als eigene Checkbox-Liste in die native Form
 * ein. Auf unseren Produkten unterdrücken wir die native Form zwar ohnehin
 * (4a/4b), aber falls sie doch einmal durchkommt, gäbe es sonst zwei
 * Kartenauswahlen nebeneinander — eine davon ohne Grusstext und ohne unsere
 * Logik.
 *
 * Das Entfernen läuft an derselben Priorität 5 desselben Hooks, also bevor der
 * Callback von Product Bundles (Standardpriorität 10) an die Reihe kommt.
 */
add_action('woocommerce_before_add_to_cart_form', function () {
    global $product;

    if (class_exists('WC_PB_BS_Display') && gcb_handles_product($product)) {
        remove_action('woocommerce_before_add_to_cart_form', ['WC_PB_BS_Display', 'add_bundle_sells_display_hooks']);
    }
}, 5);

/**
 * 5. Admin-Hinweis, falls WooCommerce Product Bundles nicht aktiv ist.
 *
 * Anders als früher ist die Extension keine harte Voraussetzung mehr: der Block
 * braucht sie nur noch für das Admin-Feld, in dem die Karten pro Produkt
 * verknüpft werden (Tab "Linked Products" → "Bundle-sells"). Bereits
 * gespeicherte Verknüpfungen funktionieren auch ohne sie weiter (siehe die
 * Meta-Rückfallebene in gcb_get_card_ids()).
 */
add_action('admin_notices', function () {
    if (class_exists('WC_PB_BS_Product')) {
        return;
    }

    if (! current_user_can('activate_plugins')) {
        return;
    }

    printf(
        '<div class="notice notice-warning"><p>%s</p></div>',
        esc_html__('Der Grusskarten-Block nutzt das Feld "Bundle-sells" der Extension "WooCommerce Product Bundles", um Grusskarten mit einem Produkt zu verknüpfen. Ohne die Extension lassen sich bestehende Verknüpfungen zwar weiter verkaufen, aber nicht mehr bearbeiten. Siehe SETUP.md im Plugin-Ordner.', 'greeting-card-block')
    );
});
