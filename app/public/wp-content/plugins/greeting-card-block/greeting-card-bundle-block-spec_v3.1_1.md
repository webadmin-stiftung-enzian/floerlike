# Spezifikation: Grusskarte als optionales Bundle-Item (WooCommerce Product Bundles)

> **Version 3 der Architektur.** Diese Spec ersetzt v2
> (`greeting-card-atc-block-spec.md`). Grund: Die Grusskarte soll **als echtes
> Kind-Produkt in einer Parent-Child-Beziehung** zum Strauss stehen, nicht als
> blosse Meta-Information am Strauss-Produkt (v1/v2). Statt diese Beziehung selbst
> nachzubauen (Cart-Item-Verknüpfung, Stock-Sync, gekoppeltes Entfernen,
> Preisgruppierung — alles fehleranfällig), delegieren wir sie an die offizielle,
> ausgereifte Extension **WooCommerce Product Bundles**. Unser Eigencode
> beschränkt sich auf die **Auswahl-UI** (Karten-Slider + Grusstext) und das
> **Senden der Bundle-Konfiguration** über die Store API.

> **Änderungen in v3.1 (Review-Stand):**
> 1. §2: Versionskorrektur — PB-Daten im `products`-Store-API-Endpoint gibt es
>    seit **8.3.5**, nicht erst 8.5.0.
> 2. §3: Korrektur der Bundled-Item-Einstellungen (**Optional + Min 1 + Max 1**;
>    „Optional + Min 0" lässt das Plugin nicht zu) und **neu: Min/Max Bundle
>    Size** zur serverseitigen Erzwingung von „höchstens eine Karte".
> 3. §6/§7: Frontend von **React-Mount auf die Interactivity API** umgestellt.
>    `render.php` liefert das komplette Markup, `view.js` einen iAPI-Store; der
>    Add-to-Cart läuft als `fetch` gegen die Store API mit anschliessendem
>    `receiveCart`-Sync des Mini-Carts. React/Data-Store nur noch als Fallback
>    (§7.6).
> 4. §9/§10: Versionshinweise zur PB↔Add-Ons-Integration; Hinweis, dass „Form
>    Location" in Block Themes nicht unterstützt wird.
> 5. **§10 grundlegend korrigiert:** Der native Add-to-Cart-Block wird **nicht
>    entfernt** (sonst verlieren alle Nicht-Bundle-Produkte ihren
>    Kaufen-Button), sondern per `render_block`-Filter nur auf
>    Grusskarten-Bundles unterdrückt. Neu: gemeinsames Zuständigkeits-Prädikat
>    `gcb_is_greeting_card_bundle()` für `render.php` und Filter (§10.1),
>    Koexistenz-Matrix (§10.4).
> 6. §11/§12: Neue Testfälle (Server-Validierung Max Bundle Size,
>    Koexistenz-Matrix) und aktualisierte Verifikationspunkte.
>
> **Änderungen nach v3.1.1 (Praxis-Anpassungen, siehe `SETUP.md` für die
> vollständige, aktuell gültige Setup-Anleitung):**
> 1. **Neu: „Weg 2"** für Sträusse mit eigenen Grössen-/Farbvarianten. Da ein
>    Produkt nicht gleichzeitig „Variable" und „Bundle" sein kann, hüllt in
>    diesem Fall ein zusätzlicher Bundle-Container den variablen Strauss als
>    Pflicht-Bundled-Item ein. Der Block ermittelt dieses Pflicht-Item
>    automatisch (`gcb_get_variable_main_item()`, kein Admin-Feld nötig) und
>    ergänzt eine Attribut-/Variantenauswahl samt eigener, reaktiver
>    Preisanzeige (der native Preis-Block reagiert nicht auf unsere Auswahl).
> 2. **Bundle wird nur bei gewählter Karte verwendet.** Ein Zwischenstand hatte
>    versucht, das Bundle-Container-Item über Product Bundles' internes
>    „Faked Parent Item"-Feature komplett unsichtbar zu machen — das blendet
>    der Cart-Block in der Praxis aber nicht zuverlässig aus (verworfen).
>    Stattdessen kauft der Block ohne gewählte Karte die Strauss-Variante
>    **direkt**, ganz ohne Bundle-Beteiligung (kein Container im Cart
>    sichtbar). Nur bei gewählter Karte läuft der Request über das Bundle,
>    inklusive der dann fachlich korrekten Eltern-Kind-Anzeige.
> 3. **Grusstext erscheint an der Grusskarten-Position**, nicht am
>    Bundle-Container: ein zusätzlicher `woocommerce_bundled_item_cart_data`-
>    Filter kopiert den Wert vom Container auf das tatsächliche
>    Grusskarten-Cart-Item; Anzeige und Bestell-Persistenz berücksichtigen nur
>    noch diese Position.
> 4. **§3 Punkt 6 (Min/Max Bundle Size) für „Weg 1" korrigiert:** Min leer/0,
>    Max = 1 (nicht Min 1/Max 2 wie ursprünglich in dieser Spec) — geprüft
>    gegen den Quellcode der installierten Product-Bundles-Version
>    (`WC_PB_MMI_Cart`): die Grösse zählt nur die Summe der Bundled-Item-
>    Mengen, ein „Min = 1" würde die Karte fälschlich verpflichtend machen.
>    Für „Weg 2" gilt weiterhin Min = 1/Max = 2, weil dort ein Pflicht-Item
>    existiert, das selbst zur Summe zählt.

---

## 0. Für wen ist dieses Dokument?

Zwei Zielgruppen:

- **KI-Agenten**, die das Plugin implementieren. Für sie: abarbeitbare Schritte mit
  „Fertig, wenn:"-Akzeptanzkriterien.
- **Menschliche Entwickler:innen**, die verstehen wollen *warum*. Für sie:
  „Hintergrund"-Kästen mit Begründungen.

> **⚠️ Wichtiger Ehrlichkeits-Hinweis vorab:** Product Bundles ist eine
> **kostenpflichtige** Extension. Diese Spec setzt voraus, dass sie lizenziert und
> installiert ist. Einige Details der Store-API-`configuration`-Payload und die
> Frage, ob für die **Grusstext-Freitexteingabe** zusätzlich die Extension
> **Product Add-Ons** nötig ist, sind in Abschnitt 12 als **zu verifizieren**
> markiert. Diese Punkte müssen an einer echten Installation geprüft werden, bevor
> die Implementierung als gesichert gilt.

---

## 1. Kernidee in vier Sätzen

1. Der **Blumenstrauss** wird als **Product Bundle** (Parent) angelegt; die
   möglichen **Grusskarten** sind **optionale Bundled Items** (Kinder) darin.
2. Auf der Produktseite ersetzt unser **eigener Block** die Standard-Bundle-Form
   durch eine hübschere Auswahl-UI (Checkbox → Swiper-Slider → Grusstext).
3. Beim Klick auf „In den Warenkorb" sendet der Block die **Bundle-Konfiguration**
   (welche Karte gewählt, welcher Grusstext) über die **Store API** an
   `cart/add-item`.
4. Product Bundles legt daraufhin **automatisch** ein Container-Cart-Item (Strauss)
   und ein verknüpftes Kind-Cart-Item (Karte) an — mit nativer Beziehung, nativem
   Stock, nativer Preis- und Steuerbehandlung.

> **Hintergrund — warum das den ganzen Workaround-Apparat auflöst:**
> In v1/v2 mussten Stock, Preisaddition, Anzeige und Persistenz der Karte alle
> **manuell** über Hooks nachgebaut werden, weil die Karte kein echtes Cart-Item
> war. Bei Product Bundles wird die gesamte Bestandsverwaltung an den
> WooCommerce-Core weitergereicht, und das Hinzufügen gebündelter Produkte umgeht
> **keine** Core-Hooks. Damit entfallen: das manuelle Stock-Management (v2 §10.6),
> die manuelle Preisaddition (v2 §10.4), die Session-Meta-Konstruktion (v1) und
> die 15-Token-Truncation-Sorge für den Preis. Der Grusstext bleibt der einzige
> Teil, der eigene Behandlung braucht.

---

## 2. Voraussetzungen & Versionen (verifiziert)

| Komponente | Mindestversion | Grund |
|---|---|---|
| WooCommerce | 8.2+ | Product-Bundles-Grundvoraussetzung |
| **Product Bundles** | **8.3.0+** | Erst ab hier: Konfiguration gebündelter Items beim Add-to-Cart **und** Update-Cart-Item über die **Store API** |
| Product Bundles | **8.3.5+ empfohlen** | Seit 8.3.5 liefert der `products`-Store-API-Endpoint PB-spezifische Daten (u.a. die `bundle_item_id`) in `extensions` mit — nützlich als Gegenprobe zur serverseitigen Ermittlung in `render.php` (§6). *Korrektur ggü. v3: Diese Fähigkeit kam mit 8.3.5, nicht 8.5.0; 8.5.0 brachte Frontend-Templates/Accessibility.* |
| PHP | 8.1+ | Projektvorgabe (PB selbst nur 7.4+) |
| WordPress | 6.2+ | Product-Bundles-Grundvoraussetzung |
| **Product Add-Ons** | **ggf. nötig** | **⚠️ zu verifizieren** — für die Grusstext-Freitexteingabe pro Bundle-Item (siehe §12) |

> **Hintergrund:** Vor Product Bundles 8.3.0 gab es **keinen** Weg, ein Bundle mit
> gewählter Konfiguration über die Store API (also aus dem Blocks-Kontext) in den
> Warenkorb zu legen. Genau dieser fehlende Weg war der tiefere Grund, warum v1
> auf den `extensionCartUpdate`-Umweg auswich. Mit 8.3.0+ existiert der offizielle
> Pfad — deshalb ist B1 überhaupt erst sauber möglich.

---

## 3. Konfiguration im Shop (kein Code — Aufgabe für Redakteur:in / Setup)

Diese Schritte passieren **im WooCommerce-Admin**, nicht im Code. Sie sind
Voraussetzung dafür, dass der Block etwas zum Konfigurieren hat.

1. Grusskarten als **Simple Products** anlegen (Kategorie-Slug `grusskarte`,
   Produktbild = Motiv, Preis je Karte). Optional: Katalog-Sichtbarkeit auf
   **„Verborgen"** setzen, damit sie nicht einzeln im Shop erscheinen, aber im
   Bundle wählbar bleiben.
2. Den **Blumenstrauss** als Produkttyp **„Product Bundle"** anlegen (oder ein
   bestehendes Strauss-Produkt in ein Bundle umwandeln).
3. Unter **Product Data → Bundled Products** jede Grusskarte als **Bundled Item**
   hinzufügen.
4. Für jedes Karten-Bundled-Item in den **Basic Settings**:
   - **Optional** aktivieren (Kunde *kann*, *muss* aber keine Karte wählen).
   - **Priced Individually** aktivieren (Kartenpreis erscheint separat und fliesst
     korrekt in Preis/Steuer ein).
   - **Min Quantity 1, Max Quantity 1** (wenn gewählt, dann genau eine Karte).
     > **⚠️ Korrektur ggü. v3:** „Optional + Min Quantity 0" ist **nicht
     > kombinierbar** — das Plugin verhindert seit Version 6.17.0, dass die
     > Optional-Checkbox bei Min Quantity 0 aktiviert wird. „Nicht gewählt" wird
     > allein durch **Optional** abgebildet, nicht durch Menge 0.
5. **Item Grouping** des Bundles auf **„Grouped"** setzen (Strauss als Parent,
   Karte eingerückt darunter — genau die Parent-Child-Optik, die gewünscht ist).
6. **Min Bundle Size = 1** und **Max Bundle Size = 2** setzen (Tab „Bundled
   Products", oberhalb der Item-Liste). Der Strauss belegt als Pflicht-Item mit
   fixer Menge 1 einen Slot — es bleibt also serverseitig erzwungen **höchstens
   eine** Karte übrig, egal wie viele Karten-Items im Bundle stecken.

> **Hintergrund — was diese Einstellungen bewirken:**
> „Optional" bildet exakt das „Zusatzangebot"-Verhalten ab: Die Karte ist
> ein Kind, aber kein Pflicht-Kind. „Priced Individually" sorgt dafür, dass jeder
> gebündelte Artikel seine eigene Steuerklasse behält und der Preis sauber
> getrennt ausgewiesen wird. „Grouped" erzeugt die eingerückte Parent-Child-
> Darstellung in Warenkorb, Bestellung und E-Mail — ohne Eigencode.
>
> **Warum Min/Max Bundle Size sicherheitsrelevant ist (neu in v3.1):** Ohne
> Punkt 6 akzeptiert die Store API klaglos eine Konfiguration mit **allen**
> Karten gleichzeitig — unsere UI erzwingt die Einzelauswahl nur clientseitig,
> ein manipulierter Request umgeht sie. Max Bundle Size verlagert die Regel
> „höchstens eine Karte" in die native PB-Validierung (Produktseite **und**
> Store API), inklusive Fehlermeldung. Kein Eigencode nötig.

**Fertig, wenn:** Man kann den Strauss **über die native Bundle-Form** (noch ohne
unseren Block) in den Warenkorb legen, wahlweise mit oder ohne Karte, und sieht im
Cart-Block den Strauss als Parent mit eingerückter Karte darunter. Der Versuch,
**zwei** Karten gleichzeitig zu wählen, wird von der nativen Form mit einer
Validierungsmeldung abgewiesen.

---

## 4. Was unser Plugin überhaupt noch tut

Weil Product Bundles die Datenhaltung, Beziehung, Preis und Stock übernimmt,
schrumpft unser Plugin auf **zwei** Aufgaben:

1. **Präsentation:** Eine schönere Auswahl-UI als die Standard-Bundle-Form
   (Checkbox „Grusskarte hinzufügen?" → Swiper-Slider mit Kartenmotiven →
   Grusstext-Feld mit Zeichenzähler + Validierung).
2. **Transport:** Die getroffene Auswahl als **Bundle-Konfiguration** über die
   Store API senden (`cart/add-item` mit `configuration`-Payload).

> **Hintergrund — bewusst *kein* Ersatz der Bundle-Logik.** Wir bauen keine
> zweite Add-to-Cart-Mechanik neben Product Bundles, sondern **füttern dessen
> Store-API-Endpoint** mit einer Konfiguration. Alles, was danach passiert
> (Container + Child anlegen, Stock, Preis, Order-Meta), macht Product Bundles.

---

## 5. Projektstruktur

```
greeting-card-bundle-block/
├── src/
│   └── greeting-card-bundle/
│       ├── block.json          ← greeting-card-bundle-block/greeting-card-bundle,
│       │                          "render": "file:./render.php",
│       │                          "viewScriptModule": "file:./view.js",
│       │                          "supports": { "interactivity": true }
│       ├── index.js            ← registerBlockType (Editor-Registrierung)
│       ├── edit.js             ← Editor-Vorschau (statisch)
│       ├── render.php          ← komplettes UI-Markup mit iAPI-Direktiven + State
│       ├── view.js             ← Interactivity-API-Store: Actions, Validierung,
│       │                          Store-API-Fetch, Mini-Cart-Sync
│       ├── style.scss / editor.scss
├── build/
├── includes/
│   └── class-integration.php   ← Zuständigkeits-Prädikat + render_block-Weiche (§10),
│                                  Grusstext-Persistenz (falls nötig, §9), Admin-Hinweise
├── greeting-card-bundle-block.php
├── package.json
└── (kein Custom-Webpack nötig — wp-scripts mit Module-Support)
```

> **Hintergrund:** Deutlich schlanker als v1/v2. Kein `woocommerce-hooks.php` mit
> Preis-/Stock-/Session-Logik mehr — diese Verantwortung liegt bei Product Bundles.
> `class-integration.php` existiert nur noch für den Grusstext (den PB nicht von
> sich aus kennt) und optionale Admin-Hinweise.
>
> **Änderung v3.1 — kein `frontend.js`/React-Mount mehr:** Die UI wird
> vollständig serverseitig gerendert (`render.php`) und über die **Interactivity
> API** (`view.js` als Script Module) interaktiv gemacht. Das entspricht dem
> bestehenden v2-Blockcode (der bereits `data-wp-interactive` nutzte), vermeidet
> ein React-Frontend-Bundle samt Mount-/Hydration-Flackern und folgt der
> Richtung, in die WooCommerce seine eigenen Produktseiten-Blöcke migriert
> (z.B. der blockifizierte Add-to-Cart-Block). Begründung im Detail: §7.

---

## 6. Server-Rendering (`render.php`)

Aufgaben:

1. Bundle-Produkt-ID aus dem `postId`-Context ermitteln; sicherstellen, dass es ein
   Bundle ist (`$product->is_type('bundle')`).
2. Die **Bundled Items** des Bundles ermitteln, die zur Kategorie `grusskarte`
   gehören, samt ihrer **`bundle_item_id`** (nicht nur der Produkt-ID!).
3. Globalen **iAPI-State** (`wp_interactivity_state`) mit Bundle-ID, Kartenliste,
   Store-API-Nonce und UI-Anfangszustand befüllen.
4. Das **komplette UI-Markup** mit Interactivity-Direktiven rendern (Checkbox →
   Slider → Textfeld → Fehlerbanner → Add-to-Cart-Button). *Kein Mount-Punkt,
   keine React-App (Änderung v3.1).*

```php
<?php
$product_id = absint($block->context['postId'] ?? get_the_ID());
$bundle     = wc_get_product($product_id);

// Gemeinsames Zuständigkeits-Prädikat (§10.1) statt blossem is_type('bundle'):
// unser Block rendert NUR auf Grusskarten-Bundles — auf allen anderen
// Produkten (inkl. fremder Bundles) bleibt die native Form zuständig.
if (! gcb_is_greeting_card_bundle($bundle)) {
    return;
}

$cards = [];
foreach ($bundle->get_bundled_items() as $bundled_item) {
    $cp = $bundled_item->get_product();
    if (! $cp || ! has_term('grusskarte', 'product_cat', $cp->get_id())) {
        continue;
    }
    $cards[] = [
        'bundleItemId' => $bundled_item->get_id(), // WICHTIG für die configuration-Payload
        'productId'    => $cp->get_id(),
        'name'         => $cp->get_name(),
        // get_price() auf dem Bundled Item (nicht dem Produkt!) berücksichtigt
        // einen allfälligen "% Discount" aus den Item-Einstellungen:
        'price'        => $bundled_item->get_price(),
        'image'        => wp_get_attachment_image_url($cp->get_image_id(), 'woocommerce_thumbnail')
                          ?: wc_placeholder_img_src(),
    ];
}

wp_interactivity_state('greeting-card-bundle', [
    'bundleId'        => $product_id,
    'cards'           => $cards,
    'nonce'           => wp_create_nonce('wc_store_api'), // für den Nonce-Header (§7.3)
    'wantsCard'       => false,
    'selectedItemId'  => 0,
    'text'            => '',
    'quantity'        => 1,
    'submitAttempted' => false,
    'isAdding'        => false,
]);
?>
<div <?php echo get_block_wrapper_attributes(); ?> data-wp-interactive="greeting-card-bundle">
  <!-- Markup wie im v2-Block, mit iAPI-Direktiven statt React:
       - Checkbox:   data-wp-on--change="actions.toggleWantsCard"
       - Slider:     foreach ($cards) — pro Karte ein <button> mit
                     data-wp-context='{"bundleItemId": …}',
                     data-wp-on--click="actions.selectCard",
                     data-wp-bind--aria-pressed="state.isCardPressed"
       - Textarea:   data-wp-on--input="actions.updateText"
       - Fehler:     data-wp-bind--hidden="!state.showCardError" / showTextError
       - Button:     data-wp-on--click="actions.addToCart",
                     data-wp-bind--disabled="state.isAdding"
       Hinweis: data-wp-class--… für Zustandsklassen verwenden, NICHT
       data-wp-bind--class (überschreibt die Wrapper-Klassen komplett). -->
</div>
```

> **Hintergrund — warum serverseitiges Markup statt Mount-Punkt:** Die Karten
> stehen zur Renderzeit fest; es gibt keinen Grund, sie clientseitig aus JSON
> aufzubauen. Server-Markup bedeutet: kein Layout-Sprung beim Laden, Bilder
> nativ lazy-loadbar, UI auch ohne JS sichtbar (wenn auch nicht interaktiv),
> und die Direktiven dokumentieren den Zustandsfluss direkt im Template.

> **⚠️ Zu verifizieren:** Die genauen Methodennamen der PB-Objekte
> (`get_bundled_items()`, `$bundled_item->get_id()`, `->get_product()`) gegen die
> installierte Product-Bundles-Version prüfen. Sie stammen aus der
> `WC_Bundled_Item`-/`WC_Product_Bundle`-Klasse laut PB-Doku, aber Signaturen
> können versionsabhängig abweichen. Verifikation: `var_dump` in `render.php` oder
> die PB-Klassenreferenz der installierten Version.

> **Hintergrund — warum die `bundle_item_id` zentral ist:** Product Bundles
> identifiziert ein gebündeltes Item **nicht** über die Produkt-ID, sondern über
> die `bundle_item_id` (ein Item kann mehrfach oder in mehreren Bundles vorkommen).
> Die `configuration`-Payload beim Add-to-Cart wird nach `bundle_item_id`
> indiziert. Deshalb muss `render.php` genau diese ID an das Frontend geben.
> PB 8.3.5+ liefert sie auch über den `products`-Store-API-Endpoint in
> `extensions` — als Alternative/Gegenprobe.

**Fertig, wenn:** Im Quelltext der Produktseite steht das vollständige UI-Markup
mit `data-wp-interactive`, und der von WordPress serialisierte iAPI-State
(`wp-interactivity-data`-Script) enthält je eine `bundleItemId` pro Grusskarte
sowie die Store-API-Nonce.

---

## 7. Frontend (`view.js`) — Interactivity API

**Änderung v3.1: keine React-App.** Zustände und Validierung wie in v2 (Checkbox,
Karte, Text, Submit-Versuch) — der v2-Block nutzte bereits `data-wp-interactive`
und wird hier weiterentwickelt statt verworfen. Der **Add-to-Cart-Aufruf** sendet
die **Bundle-Konfiguration** als `fetch` an die Store API und synchronisiert
anschliessend die Woo-Blocks (Mini-Cart) über deren Data Store.

> **Hintergrund — warum iAPI statt React:** Das einzige Argument für React war
> der Dispatch über den `wc/store/cart`-Data-Store (`addItemToCart`), der den
> Mini-Cart automatisch aktualisiert. Aber (a) ist unbelegt, ob `addItemToCart`
> die Bundle-`configuration` überhaupt durchreicht (die Action war historisch
> auf `(productId, quantity)` ausgelegt), und (b) lässt sich der Data Store auch
> aus einer iAPI-Action heraus synchronisieren: Die `add-item`-Antwort enthält
> den kompletten Warenkorb, den man per `receiveCart` in den Store zurückspielt
> (§7.3). Damit entfällt der Grund für ein React-Bundle, den Mount-Punkt und
> das Hydration-Flackern. Bonus: konsistent mit der Richtung von WooCommerce
> selbst (blockifizierter Add-to-Cart-Block läuft über die iAPI).

### 7.1 Store & abgeleiteter State

```js
import { store, getContext } from '@wordpress/interactivity';

const { state } = store('greeting-card-bundle', {
  state: {
    // abgeleitete Werte als Getter — ersetzen die React-Ableitungen aus v3:
    get cardMissing()   { return state.wantsCard && ! state.selectedItemId; },
    get textMissing()   { return state.wantsCard && state.text.trim() === ''; },
    get isValid()       { return ! state.cardMissing && ! state.textMissing; },
    get showCardError() { return state.submitAttempted && state.cardMissing; },
    get showTextError() { return state.submitAttempted && state.textMissing; },
    get isCardPressed() {
      // im Kontext des jeweiligen Karten-Buttons ausgewertet:
      return getContext().bundleItemId === state.selectedItemId;
    },
    get charCounter()   { return `Zeichen verbleibend: ${300 - state.text.length}`; },
  },
  actions: {
    toggleWantsCard(e) { state.wantsCard = e.target.checked; },
    selectCard()       { state.selectedItemId = getContext().bundleItemId; },
    updateText(e)      { state.text = e.target.value; },
    // addToCart: siehe 7.3
  },
  callbacks: {
    // initSwiper: siehe 7.4
  },
});
```

Der Anfangszustand (`bundleId`, `cards`, `nonce`, UI-Flags) kommt aus
`wp_interactivity_state()` in `render.php` (§6) und wird von der iAPI automatisch
mit diesem Store zusammengeführt.

### 7.2 Validierung (UX-Ebene)

Identisch zu v2/v3, nur als Getter statt React-Ableitungen (siehe 7.1):
Fehlerbanner erscheinen erst nach dem ersten Submit-Versuch
(`submitAttempted`), nie beim blossen Ausfüllen.

### 7.3 Add-to-Cart mit Bundle-Konfiguration (fetch + Mini-Cart-Sync)

```js
// in actions:
async addToCart() {
  state.submitAttempted = true;
  if (! state.isValid) return;

  state.isAdding = true;
  try {
    // Bundle-Konfiguration: indiziert nach bundle_item_id
    const configuration = {};
    if (state.wantsCard && state.selectedItemId) {
      const card = state.cards.find((c) => c.bundleItemId === state.selectedItemId);
      configuration[card.bundleItemId] = {
        product_id: card.productId,
        quantity:   1,
        optional_selected: true,
        // Grusstext: Übertragungsweg ⚠️ zu verifizieren (§12)
        // ggf. über Product-Add-Ons-Feld statt hier
      };
    }

    const response = await fetch('/wc/store/v1/cart/add-item', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Nonce':        state.nonce, // aus render.php (§6)
      },
      body: JSON.stringify({
        id:       state.bundleId,
        quantity: state.quantity,
        // ⚠️ Einbettung zu verifizieren: Top-Level 'configuration' vs.
        // 'extensions'-Namespace — exakt aus dem Netzwerk-Tab übernehmen (§12.1)
        configuration,
      }),
    });

    if (! response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Add to cart failed');
    }

    // Die add-item-Antwort IST der komplette Warenkorb. Damit Mini-Cart /
    // Cart-Block (React-basiert, eigener Data Store) den neuen Stand anzeigen,
    // spielen wir ihn in deren Store zurück:
    const cart = await response.json();
    window.wp?.data?.dispatch('wc/store/cart')?.receiveCart(cart);
  } catch (err) {
    console.error(err); // Fehler-Notice anzeigen
  } finally {
    state.isAdding = false;
  }
}
```

> **Hinweise zum Sync:**
> - `receiveCart` greift nur, wenn der `wc/store/cart`-Data-Store auf der Seite
>   registriert ist — das ist er, sobald ein Mini-Cart-/Cart-Block gerendert
>   wird. Ist keiner vorhanden, gibt es nichts zu synchronisieren; das Optional
>   Chaining lässt den Aufruf dann stumm ins Leere laufen.
> - Falls das Theme den Mini-Cart erst lazy lädt, als Absicherung zusätzlich
>   das Event `wc-blocks_added_to_cart` auf `document.body` dispatchen — darauf
>   hört der Mini-Cart und refresht sich selbst. **⚠️ Eventname beim Test
>   gegenprüfen.**

> **⚠️ Der wichtigste Verifikationspunkt der ganzen Spec:** Die **exakte Struktur**
> der Konfigurations-Payload für den Store-API-`add-item`-Request von Product
> Bundles 8.3.0+ ist aus der öffentlichen Doku **nicht vollständig gesichert**. Es
> ist unklar, ob die Konfiguration als Top-Level-`configuration`-Feld, innerhalb
> von `extensions`, oder unter einem PB-spezifischen Namespace erwartet wird, und
> wie „optionales Item nicht gewählt" genau signalisiert wird.
>
> **So verifizierst du es zuverlässig (empfohlener erster Schritt):**
> 1. Lege den Strauss testweise über die **native** Bundle-Form (mit gewählter
>    Karte) in den Warenkorb.
> 2. Beobachte im **Netzwerk-Tab** den `POST /wc/store/v1/cart/add-item`-Request
>    und **kopiere dessen Payload-Struktur exakt**.
> 3. Baue `view.js` so, dass es **genau diese Struktur** reproduziert.
>
> Damit liest du das korrekte Format direkt aus der laufenden Installation ab,
> statt es zu raten. Siehe auch die PB-REST-API-Referenz in §13.

### 7.4 Swiper-Slider

Wie v2: `loop: false`, Initialisierung über `data-wp-init="callbacks.initSwiper"`,
die Slides kommen bereits serverseitig gerendert aus `render.php` (§6),
`aria-pressed` markiert die Auswahl (`state.isCardPressed`), Klick setzt
`selectedItemId` über den Karten-Kontext (`data-wp-context`).

### 7.5 Koexistenz mit der nativen Bundle-Form

Damit auf der Produktseite **nicht** zusätzlich die native Bundle-Add-to-Cart-Form
erscheint (Doppelung), unterdrückt ein `render_block`-Filter die native Form
auf Grusskarten-Bundles — auf allen anderen Produkten bleibt sie unangetastet
(vollständige Weiche inkl. Matrix: §10).

### 7.6 Fallback-Option: React + `wc/store/cart`-Dispatch

Nur falls die Verifikation (§12) ergibt, dass `addItemToCart` aus
`@woocommerce/block-data` die Bundle-`configuration` **sauber durchreicht**, ist
der v3-Weg (React-App + Data-Store-Dispatch) eine gleichwertige Alternative —
dann übernimmt der Store den Mini-Cart-Sync selbst. In allen anderen Fällen
bleibt es beim `fetch` aus 7.3, und dann gibt es keinen Grund für React.

**Fertig, wenn:**
- Auswahl einer Karte + Text + Klick legt Strauss **und** Karte als Parent-Child
  in den Warenkorb (im Netzwerk-Tab: ein `add-item`-Request mit Konfiguration).
- Klick ohne Karte (Checkbox aus) legt nur den Strauss in den Warenkorb.
- Checkbox an, aber Karte/Text fehlt → kein Add-to-Cart, Fehlerbanner.

---

## 8. Anzeige in Warenkorb, Checkout, Bestellung, E-Mail

**Weitgehend nativ durch Product Bundles.** Bei „Grouped"-Item-Grouping erscheint
der Strauss als Parent, die Karte eingerückt darunter — in Cart-Block, Mini-Cart,
Checkout, Bestellung und E-Mail. Preis und Steuer der Karte laufen nativ.

Der **einzige** nicht-native Teil ist der **Grusstext** (Freitext), den Product
Bundles von sich aus nicht kennt.

> **Hintergrund:** Das ist der Kerngewinn gegenüber v1/v2: Die gesamte
> Anzeige-, Preis-, Order- und Stock-Kette für die Karte selbst ist geschenkt.
> Kein `woocommerce_get_item_data`, kein `before_calculate_totals`, kein
> `checkout_create_order_line_item`, kein manuelles Stock-Handling für die Karte.

**Fertig, wenn:** Eine Testbestellung zeigt Strauss + Karte als gruppierte
Parent-Child-Positionen in Admin, E-Mail und Kundenbereich, mit korrektem
Gesamtpreis.

---

## 9. Grusstext — der einzige Eigencode-Teil

Der persönliche Grusstext (max. 300 Zeichen) ist keine Produkt-Eigenschaft, die
Product Bundles kennt. Es gibt zwei mögliche Wege — **welcher gilt, ist in §12 zu
verifizieren**:

**Weg A — Product Add-Ons (bevorzugt, wenn lizenziert).**
Man fügt dem Karten-(oder Bundle-)Produkt ein **Text-Add-On-Feld** „Grusstext"
hinzu. Product Add-Ons ist mit Product Bundles integriert (siehe Changelog-Hinweise
zur PB↔Add-Ons-Integration). Dann läuft der Grusstext **nativ** durch Cart, Order
und E-Mail — kein Eigencode. Unsere UI müsste den Add-On-Wert nur korrekt in die
Store-API-Payload einfügen.

> **Versionshinweise zu Weg A (neu in v3.1):** Product Bundles setzt für die
> Integration **Product Add-Ons ≥ 7.2** voraus (ältere Versionen werden seit
> PB 8.2.0 nicht mehr unterstützt). Zudem wurde erst in **PB 8.5.2** ein
> Kompatibilitätsproblem zwischen **optionalen Bundled Items und Required
> Add-Ons** behoben — genau unsere Konstellation (optionale Karte + Pflicht-
> Grusstext). Für Weg A also beide Plugins aktuell halten und diesen Fall
> explizit testen.

**Weg B — Eigenes Cart-Item-Data am Container (Fallback ohne Add-Ons).**
Wir hängen den Grusstext als zusätzliches `cart_item_data` an das **Container-Item**
(Strauss), analog zu v2 §10.1, aber **nur** für den Text (nicht für Karte/Preis/
Stock — die macht PB):

```php
// Text aus der add-item-extensions-Payload ins Container-cart_item_data schreiben
add_filter('woocommerce_store_api_add_to_cart_data', function ($data, $request) {
    $ext = $request->get_param('extensions');
    $text = $ext['greeting-card-bundle-block']['text'] ?? '';
    if ($text !== '') {
        $data['cart_item_data']['_greeting_card_text'] = sanitize_textarea_field($text);
    }
    return $data;
}, 10, 2);

// Anzeige am Container
add_filter('woocommerce_get_item_data', function ($item_data, $cart_item) {
    if (! empty($cart_item['_greeting_card_text'])) {
        $item_data[] = [
            'key'   => __('Grusstext', 'greeting-card-bundle-block'),
            'value' => $cart_item['_greeting_card_text'],
        ];
    }
    return $item_data;
}, 10, 2);

// In Bestellung übernehmen (am Container-Line-Item)
add_action('woocommerce_checkout_create_order_line_item', function ($item, $key, $values) {
    if (! empty($values['_greeting_card_text'])) {
        $item->add_meta_data('Grusstext', $values['_greeting_card_text'], true);
    }
}, 10, 3);
```

> **⚠️ Zu verifizieren bei Weg B:** Ob sich `woocommerce_store_api_add_to_cart_data`
> **zusätzlich** zur PB-Bundle-Verarbeitung sauber ausführen lässt (beide hängen am
> selben `add-item`-Request), oder ob PB den Request so verarbeitet, dass eigenes
> `cart_item_data` verloren geht. Im Zweifel greift die **15-Token-Truncation** aus
> v1/v2 auch hier für den Text im **Mini-Cart** (bekanntes WooCommerce-Verhalten,
> kein Bug).

**Fertig, wenn:** Der Grusstext erscheint an der Strauss-Position in Warenkorb,
Checkout, Bestellung und E-Mail und ist in der Order dauerhaft gespeichert.

---

## 10. Template-Einbindung — Koexistenz statt Ersetzung

> **⚠️ Grundlegende Korrektur in v3.1:** v3 sah vor, den nativen
> Add-to-Cart-Block im Single-Product-Template zu **entfernen** und durch
> unseren Block zu **ersetzen**. Das ist falsch, denn das Template gilt für
> **alle** Produkte des Shops — Nicht-Bundle-Produkte (einzelne Grusskarten,
> sonstiges Sortiment) hätten danach **keinen Kaufen-Button mehr**. Richtig
> ist: **Beide Blöcke stehen im Template, aber pro Produkt rendert genau
> einer.**

### 10.1 Das Zuständigkeits-Prädikat (gemeinsame Helper-Funktion)

Eine einzige Funktion entscheidet, ob unser Block zuständig ist. Sie wird von
`render.php` **und** vom Filter in 10.3 genutzt — niemals zwei getrennte
Bedingungen pflegen, sonst driften sie auseinander (Folge: Produkte mit zwei
oder null Buttons).

```php
/**
 * Ist dieses Produkt ein Grusskarten-Bundle (= unser Block ist zuständig)?
 */
function gcb_is_greeting_card_bundle( $product ) {
	if ( ! $product || ! $product->is_type( 'bundle' ) ) {
		return false;
	}
	foreach ( $product->get_bundled_items() as $bundled_item ) {
		$cp = $bundled_item->get_product();
		if ( $cp && has_term( 'grusskarte', 'product_cat', $cp->get_id() ) ) {
			return true;
		}
	}
	return false;
}
```

**Wichtig:** `render.php` (§6) verwendet dieses Prädikat statt des blossen
`is_type('bundle')`-Checks — unser Block unterdrückt sich damit selbst auf
allen Produkten, für die er nicht zuständig ist (inkl. fremder Bundles ohne
Grusskarten).

### 10.2 Template im Site Editor

1. Single-Product-Template im Site Editor öffnen.
2. Den nativen Add-to-Cart-Block **stehen lassen** (er versorgt weiterhin alle
   normalen Produkte).
3. Unseren Block „Grusskarte + Bundle in den Warenkorb" **zusätzlich** an der
   gewünschten Stelle einfügen.

### 10.3 Native Form auf Grusskarten-Bundles unterdrücken

Unser Block unterdrückt sich selbst auf Nicht-Zuständigkeit (10.1) — die
Gegenrichtung übernimmt ein `render_block`-Filter in `class-integration.php`,
da der native Block keine Anzeigebedingungen kennt:

```php
add_filter( 'render_block', function ( $content, $block ) {
	$targets = [ 'woocommerce/add-to-cart-form', 'woocommerce/add-to-cart-with-options' ];
	if ( ! in_array( $block['blockName'], $targets, true ) ) {
		return $content;
	}
	$product = wc_get_product( get_the_ID() );
	return gcb_is_greeting_card_bundle( $product ) ? '' : $content;
}, 10, 2 );
```

> **Warum beide Blocknamen:** Je nach WooCommerce-Version und Template-Zustand
> steckt die klassische (`add-to-cart-form`) oder die blockifizierte Variante
> (`add-to-cart-with-options`) im Template. **⚠️ Beim Setup gegen das reale
> Template prüfen** (Site Editor → Codeansicht), welcher Blockname tatsächlich
> verwendet wird.

### 10.4 Resultierende Matrix

| Produkt | Nativer ATC-Block | Unser Block |
|---|---|---|
| Simple / Variable (T-Shirt, einzelne Grusskarte, …) | ✅ rendert | — (Prädikat greift nicht) |
| **Grusskarten-Bundle (Strauss)** | — (Filter 10.3) | ✅ rendert |
| Sonstiges Bundle ohne Grusskarten-Item | ✅ rendert (native PB-Form) | — (Prädikat greift nicht) |

> **Hintergrund:** Product Bundles bringt eine eigene Add-to-Cart-Form mit
> (Auswahl der gebündelten Items). Auf Grusskarten-Bundles **ersetzt unser
> Block deren Darstellung** durch die Slider-UI. Es darf pro Produktseite nur
> **eine** Add-to-Cart-Mechanik aktiv sein — die Matrix oben stellt genau das
> sicher, ohne anderen Produkten den Kaufen-Button zu nehmen.
>
> **Hinweis für Block Themes:** Die PB-Option „Form Location"
> (Advanced Settings) wird in Block Themes **nicht unterstützt** — die native
> Form erscheint dort, wo der Add-to-Cart-with-Options-Block sie rendert. Die
> Weiche findet also ausschliesslich auf Block-Ebene im Single-Product-
> Template statt; „Form Location" spielt in diesem Setup keine Rolle.
>
> **Verworfene Alternative — eigenes Produkt-Template:** Man könnte im Site
> Editor ein zweites Single-Product-Template anlegen und es Strauss-Produkten
> manuell zuweisen. Das skaliert redaktionell schlecht (jeder neue Strauss
> braucht die Zuweisung von Hand); der Filter entscheidet dagegen automatisch
> anhand der Bundle-Zusammensetzung.

**Fertig, wenn:**
- Ein Strauss-Bundle zeigt **nur** unsere Slider-UI und genau einen
  „In den Warenkorb"-Button, der ein korrekt konfiguriertes Bundle hinzufügt.
- Ein normales Produkt (Simple/Variable) zeigt **unverändert** die native
  Add-to-Cart-Form mit genau einem Button.
- Ein Bundle **ohne** Grusskarten-Item zeigt die native PB-Bundle-Form.

---

## 11. Testplan (manuell)

| # | Schritt | Erwartung |
|---|---------|-----------|
| 1 | Native Bundle-Form testen (vor Eigencode) | Strauss + Karte als Parent-Child im Cart |
| 1b | Native Form: **zwei** Karten gleichzeitig wählen | Validierungsfehler (Max Bundle Size 2, §3.6) — auch per manipuliertem `add-item`-Request gegenprüfen |
| 2 | `add-item`-Payload im Netzwerk-Tab ablesen | Konfigurationsstruktur dokumentiert (§7.3) |
| 3 | Block: Strauss ohne Karte | Nur Strauss im Cart |
| 4 | Block: Strauss + Karte + Text | Parent-Child + Grusstext am Parent |
| 5 | Checkbox an, Karte fehlt | Kein Add-to-Cart, Fehlerbanner |
| 6 | Karte im Cart, Strauss entfernen | Karte wird **mit** entfernt (PB nativ) |
| 7 | Menge Strauss ändern | Karten-Menge folgt nativ (PB-Sync) |
| 8 | Bestellung abschliessen | Parent-Child + Grusstext in Admin/E-Mail |
| 9 | Karten-Bestand vor/nach Zahlung | Nativ durch Core reduziert |
| 10 | Bestellung stornieren | Bestand nativ wiederhergestellt |
| 11 | Add-to-Cart über unseren Block bei sichtbarem Mini-Cart | Mini-Cart-Zähler und -Inhalt aktualisieren sich ohne Reload (`receiveCart`-Sync, §7.3) |
| 12 | Normales Produkt (Simple/Variable) aufrufen | Native Add-to-Cart-Form, genau **ein** Button, unser Block rendert nicht (§10.4) |
| 13 | Strauss-Bundle aufrufen | Nur unser Block, genau **ein** Button, native Form weggefiltert (§10.3) |
| 14 | Bundle **ohne** Grusskarten-Item aufrufen (falls vorhanden) | Native PB-Bundle-Form, unser Block rendert nicht (§10.1) |

> **Hinweis:** Tests 6, 7, 9, 10 prüfen genau die Dinge, die in v1/v2 mühsamer
> Eigencode waren und hier **nativ** laufen sollten. Schlägt einer fehl, liegt es
> an der PB-Konfiguration (§3), nicht an unserem Code.

---

## 12. Offene Verifikationspunkte (zusammengefasst)

**Zuerst und am wichtigsten:**

1. **Store-API-`configuration`-Payload-Struktur** (§7.3). Verifikationsmethode:
   native Bundle-Form → Netzwerk-Tab → Payload kopieren. **Ohne diesen Schritt
   nicht mit dem Block-Code beginnen.**
2. **Grusstext-Transportweg** (§9): Product Add-Ons (Weg A) oder eigenes
   Container-`cart_item_data` (Weg B)? Hängt davon ab, ob Product Add-Ons lizenziert
   ist und wie es mit der Store-API-Payload interagiert.

**Danach:**

3. **PB-Objekt-Methodennamen** in `render.php` (§6) gegen installierte Version.
4. **Koexistenz** von `woocommerce_store_api_add_to_cart_data` (für den Text) mit
   der PB-Bundle-Verarbeitung am selben Request (§9, Weg B).
5. **`bundle_item_id`-Ermittlung** clientseitig — via `render.php` (§6) oder als
   Gegenprobe via `products`-Store-API-Endpoint `extensions` (**PB 8.3.5+**,
   Korrektur ggü. v3: nicht erst 8.5.0).
6. **Mini-Cart-Sync** (§7.3): funktioniert `receiveCart` mit der
   `add-item`-Antwort in der installierten WooCommerce-Version? Eventname des
   Fallback-Events gegenprüfen.
7. *Nur falls der React-Fallback (§7.6) erwogen wird:* reicht `addItemToCart`
   aus `@woocommerce/block-data` die Bundle-`configuration` an den Request
   durch? Falls nein, bleibt es endgültig beim `fetch`-Weg.
8. **Tatsächlicher Blockname im Single-Product-Template** (§10.3): rendert das
   Theme `woocommerce/add-to-cart-form` oder die blockifizierte Variante
   `woocommerce/add-to-cart-with-options`? Im Site Editor (Codeansicht)
   nachsehen; der Filter deckt vorsorglich beide ab.

> **Empfohlene Reihenfolge für den KI-Agent:** (1) PB im Admin konfigurieren (§3),
> (2) native Payload ablesen (Punkt 1), (3) minimalen Block bauen, der **nur** ein
> Bundle mit fester Karte hinzufügt — ohne UI-Feinschliff, ohne Grusstext —, (4)
> erst wenn Parent-Child sauber im Cart landet, UI (Slider/Validierung) und
> Grusstext ergänzen. So wird nie mehr als ein unsicherer Teil gleichzeitig
> debuggt.

---

## 13. Quellen (verifiziert)

- Product Bundles 8.3.0: Store-API-Support für `cart/add-item` /
  `cart/update-item` / `cart/remove-item` mit Konfiguration gebündelter Items
  (PB-Changelog, 2025.01.14).
- Product Bundles **8.3.5** (2025.04.08): PB-spezifische Daten (u.a.
  `bundle_item_id`) im `products`-Store-API-Endpoint (PB-Changelog; Korrektur
  ggü. v3, die fälschlich 8.5.0 nannte — 8.5.0 betraf Templates/Accessibility).
- Product Bundles 6.17.0: „Optional" bei Min Quantity 0 nicht aktivierbar
  (PB-Changelog) — Grundlage für die §3-Korrektur.
- Product Bundles 8.2.0 / 8.5.2: Add-Ons-Integration erfordert Product Add-Ons
  ≥ 7.2; Fix für optionale Bundled Items mit Required Add-Ons (PB-Changelog) —
  Grundlage für die §9-Hinweise.
- Min/Max Bundle Size als native Mengenvalidierung über alle Bundled Items
  (PB Store Owner's Guide) — Grundlage für §3.6.
- „Form Location" in Block Themes nicht unterstützt (PB-Changelog ab 6.22/6.23).
- Parent-Child-Struktur im Cart/Order, natives Stock-Handling, „Grouped"-Grouping,
  „Optional" + „Priced Individually" (PB Data Structures & Storage, Store Owner's
  Guide).
- PB-Objekt-/Utility-Funktionen (`WC_Bundled_Item`, `WC_Product_Bundle`,
  `wc_pb_get_bundled_cart_items`) (PB Functions Reference).
- Interactivity API: `wp_interactivity_state()`, `store()`, Direktiven,
  `viewScriptModule` (WordPress-Entwicklerdoku).

---

## 14. Migrationsnotiz gegenüber v1/v2

| Aspekt | v1 (Meta + Session) | v2 (Meta + eigener Button) | **v3 (Product Bundles)** |
|---|---|---|---|
| Karte im Cart | Meta am Strauss | Meta am Strauss | **Echtes Kind-Cart-Item** |
| Parent-Child-Beziehung | keine | keine | **Nativ (PB)** |
| Stock der Karte | manuell | manuell | **Nativ (Core)** |
| Preis der Karte | 3 Hooks + Reset | 1 Hook | **Nativ (PB, Priced Individually)** |
| Client→Server | `extensionCartUpdate` | `extensions` im add-item | **Bundle-`configuration` im add-item (`fetch` aus iAPI-Action + `receiveCart`-Sync)** |
| Frontend-Technik | iAPI | iAPI | **iAPI (v3.1; v3 sah React vor — verworfen, §7)** |
| Eigencode-Umfang | hoch | mittel | **Gering (nur UI + Grusstext)** |
| Externe Abhängigkeit | keine | keine | **Product Bundles (kostenpflichtig), ggf. Add-Ons** |
| Gekoppeltes Entfernen/Mengensync | — (nicht vorhanden) | — (nicht vorhanden) | **Nativ (PB)** |

> **Was aus v1/v2 übernommen wurde:** Grusskarten als `grusskarte`-Produkte, die
> Slider-UI-Idee (`loop: false`), die Validierungslogik (Fehler erst nach Submit),
> und die 15-Token-Truncation-Kenntnis (relevant nur noch für den Grusstext im
> Mini-Cart).
>
> **Der konzeptionelle Kern der Änderung:** v1/v2 modellierten die Karte als
> *Eigenschaft des Strausses*. v3 modelliert sie als *eigenes Produkt in
> Beziehung zum Strauss* — was der ursprünglichen fachlichen Absicht
> (Parent-Child, „Zusatzangebot") entspricht und den Grossteil des Eigencodes an
> eine erprobte Extension abgibt.
