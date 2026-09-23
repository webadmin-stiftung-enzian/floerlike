# Setup-Checkliste: Grusskarte zu einem Produkt

Diese Schritte passieren **im WooCommerce-Admin**, nicht im Code. Ohne sie
rendert der Block still gar nichts (`render.php` bricht ab, wenn dem Produkt
keine Grusskarten zugeordnet sind).

Seit v0.3.0 braucht es **kein Produkt vom Typ „Bundle“ mehr**. Der Strauss ist
ein ganz normales (variables oder einfaches) Produkt, die Karten hängen über
das Feld **Bundle-sells** daran. Pro Strauss gibt es damit wieder genau ein
Produkt statt zweier.

WooCommerce Product Bundles wird nur noch für dieses **Admin-Feld** gebraucht.
Seine eigene Warenkorb-Logik kommt bewusst nicht zum Einsatz: sie funktioniert
nur über die klassische Add-to-Cart-Form und erzeugt im Warenkorb keine echte
Eltern-Kind-Beziehung. Beides übernimmt dieses Plugin selbst.

## Schritte

1. **Grusskarten als Simple Products anlegen.** Produktbild = Kartenmotiv,
   Preis setzen. Katalog-Sichtbarkeit optional auf „Verborgen“.
   Die frühere Pflicht-Kategorie `grusskarte` wird nicht mehr ausgewertet —
   massgeblich ist allein die Verknüpfung aus Schritt 3.

2. **Strauss als normales Produkt anlegen.** Hat er Grössen oder Farben, ist er
   ein **variables Produkt** mit Attributen und Variationen wie gewohnt. Der
   Preis pro Variante wird direkt dort gepflegt.

3. **Karten verknüpfen:** Produktdaten → **Linked Products** → **Bundle-sells**.
   Dort die gewünschten Karten eintragen (nur einfache Produkte möglich).
   - **Bundle-sells title:** Beschriftung der Checkbox auf der Produktseite,
     z. B. „Grusskarten“. Bleibt das Feld leer, steht dort „Möchten Sie eine
     Grusskarte hinzufügen?“.
   - **Bundle-sells discount:** leer lassen. Der Rabattweg von Product Bundles
     wird nicht verwendet.

4. **Block im Single-Product-Template platzieren** (Site Editor → Templates →
   Single Product). Der Block heisst **„Grusskarte + Produkt in den Warenkorb“**.

   Wichtig: Der **native** Add-to-Cart-Block bleibt im Template stehen. Er wird
   pro Produkt automatisch unterdrückt, sobald unser Block zuständig ist (siehe
   `gcb_is_card_parent()` in `includes/class-integration.php`). Würde man ihn
   entfernen, verlören alle anderen Produkte ihren Kaufen-Button, weil dasselbe
   Template für den ganzen Shop gilt.

5. **Testen:**
   - Strauss ohne Karte kaufen: eine Position im Warenkorb.
   - Strauss mit Karte kaufen: zwei Positionen, die Karte eingerückt darunter,
     mit dem Grusstext als Zusatzinformation.
   - Menge des Straussens ändern: die Karte zieht nach.
   - Strauss entfernen: die Karte verschwindet mit.

## Wie die Verbindung technisch entsteht

Der Block schickt beide Positionen in **einem** Request an
`/wc/store/v1/batch` und gibt beiden dieselbe, im Browser erzeugte Gruppen-ID
mit (`gcb_group`). Serverseitig landet sie als `_gcb_group` in den
`cart_item_data`; `_gcb_role` unterscheidet Produkt und Karte.

Alles Weitere leitet sich daraus ab:

| Aufgabe | Ort |
|---|---|
| Daten annehmen, Grusstext prüfen und kürzen | `woocommerce_store_api_add_to_cart_data` |
| Karte mitentfernen / wiederherstellen | `woocommerce_cart_item_removed`, `..._restored` |
| Menge angleichen, verwaiste Karten aufräumen | `woocommerce_before_calculate_totals` |
| Mengenauswahl der Karte sperren | `woocommerce_store_api_product_quantity_editable` |
| Einrückung im Warenkorb-Block | `includes/class-store-api.php` + `assets/js/checkout-blocks.js` |
| Grusstext in der Bestellung | `woocommerce_checkout_create_order_line_item` |

Der Warenkorb-Schlüssel der Elternposition wird nie übertragen, sondern bei
Bedarf serverseitig aus der Gruppe aufgelöst (`gcb_find_parent_key()`).

## Ohne Product Bundles

Ist die Extension nicht aktiv, liest das Plugin die gespeicherte Kartenliste
direkt aus der Produkt-Meta `_wc_pb_bundle_sell_ids`. Bestehende Produkte
funktionieren im Frontend also weiter, nur bearbeiten lässt sich die Liste im
Admin dann nicht mehr. Ein Hinweis im Plugins-Bildschirm weist darauf hin.
