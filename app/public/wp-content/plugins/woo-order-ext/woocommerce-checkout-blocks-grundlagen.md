# WordPress- & WooCommerce-Block-Entwicklung verstehen

Eine strukturierte Grundlage zu Block-Entwicklung, Block-Erweiterung und Slot/Fill – mit dem offiziellen Beispiel `extend-cart-checkout-block` als roter Faden.

---

## 1. Die vier Ebenen auf einen Blick

Du verwechselst (verständlicherweise) vier Dinge, die zwar zusammenhängen, aber unterschiedliche Werkzeuge brauchen. Halte diese Trennung im Kopf:

| Ebene | Was es ist | Werkzeug / API | Wann du es brauchst |
|---|---|---|---|
| **1. WP-Block (Gutenberg)** | Ein normaler Editor-Block (Block.json, `edit`, `save`) | `@wordpress/blocks`, `registerBlockType` | Du baust irgendeinen Block für den Editor |
| **2. WooCommerce-Block** | Cart/Checkout sind selbst Blöcke, aufgebaut aus vielen Inner-Blocks | dieselbe Block-API + WooCommerce-Datastores | Du verstehst, *wo* du andocken kannst |
| **3. Checkout-Block-Erweiterung** | Du fügst einen eigenen Inner-Block in Cart/Checkout ein | `registerCheckoutBlock` + `parent` in block.json | Du willst ein neues UI-Element an fester Stelle (z.B. Newsletter-Checkbox) |
| **4. Slot/Fill** | Du renderst Inhalt an vordefinierten „Einschüben", ohne eigenen Block | `ExperimentalOrderMeta` & Co. via `registerPlugin` | Du willst flexibel Inhalt einschieben, ohne dass der Shop-Betreiber einen Block platzieren muss |

Der entscheidende mentale Sprung: **Cart und Checkout sind keine PHP-Templates mehr.** Sie sind React-Block-Bäume. Erweitern heißt deshalb: entweder einen Block in den Baum hängen (Ebene 3) oder einen vordefinierten Einschub füllen (Ebene 4).

---

## 2. Grundlage: Was ist ein WordPress-Block überhaupt?

Ein Block besteht aus drei Teilen, die du im Newsletter-Beispiel alle wiederfindest:

### 2.1 `block.json` – das Manifest
Die Single Source of Truth. WordPress liest hier Name, Kategorie, Attribute, Scripts und Eltern-Beziehung.

```json
{
  "apiVersion": 3,
  "name": "my-plugin/checkout-newsletter-subscription",
  "title": "Newsletter Subscription!",
  "category": "woocommerce",
  "parent": [ "woocommerce/checkout-contact-information-block" ],
  "attributes": {
    "text": { "type": "string", "source": "html", "default": "" }
  },
  "textdomain": "my-plugin"
}
```

Zwei Felder sind hier zentral:
- **`parent`** – sagt: „Dieser Block darf *nur* innerhalb dieses Eltern-Blocks existieren." Das ist der Schlüssel, um deinen Block im Checkout zu verankern.
- **`attributes`** – die persistenten Daten des Blocks (was der Shop-Betreiber im Editor einstellt, z.B. der Begrüßungstext).

### 2.2 `edit` – wie der Block im Editor aussieht
React-Komponente. Hier nutzt der Shop-Betreiber `RichText`, `InspectorControls` etc. Das ist **nicht** die Kunden-Ansicht.

```jsx
export const Edit = ( { attributes, setAttributes } ) => {
  const { text } = attributes;
  const blockProps = useBlockProps();
  return (
    <div { ...blockProps }>
      <InspectorControls>…</InspectorControls>
      <CheckboxControl id="newsletter-text" checked={ false } disabled={ true } />
      <RichText value={ text } onChange={ ( v ) => setAttributes( { text: v } ) } />
    </div>
  );
};
```

### 2.3 `save` – was in die Datenbank gespeichert wird
Bei **statischen** Blöcken erzeugt `save` das HTML, das gespeichert und ausgeliefert wird. Bei **dynamischen** Blöcken übernimmt PHP (`render.php`) das Rendern (das kennst du schon aus deiner React-im-Frontend-Recherche).

> **Wichtige Besonderheit beim Checkout:** Der Block wird im Frontend *nicht* über `save` gerendert, sondern über eine eigene React-Komponente, die du via `registerCheckoutBlock` registrierst (siehe Abschnitt 4). `save` liefert hier nur den editierbaren Text als Platzhalter.

---

## 3. Die Anatomie des Beispiel-Plugins

Das offizielle Beispiel ist ein **Scaffold-Template** (deshalb die `.mustache`-Endungen und `{{slug}}`-Platzhalter). Beim Generieren wird `{{slug}}` durch deinen Plugin-Namen ersetzt. Struktur:

```
extend-cart-checkout-block/
├── $slug.php                         ← Haupt-Plugin-Datei (Einsprungpunkt)
├── $slug-blocks-integration.php      ← Integration-Klasse (lädt Scripts, liefert Server-Daten)
└── src/js/
    ├── index.js                      ← Slot/Fill-Registrierung (Ebene 4)
    ├── filters.js                    ← Checkout-Filter & Payment-Callbacks
    ├── ExampleComponent.js           ← Inhalt für den Slot
    └── checkout-newsletter-subscription-block/
        ├── block.json                ← Manifest des eigenen Blocks (Ebene 3)
        ├── index.js                  ← registerBlockType (Editor-Seite)
        ├── edit.js                   ← Editor-Ansicht (edit + save)
        ├── block.js                  ← Frontend-Komponente (Kunden-Ansicht)
        └── frontend.js               ← registerCheckoutBlock (Frontend-Registrierung)
```

Das Beispiel demonstriert bewusst **alle vier Erweiterungsmechanismen gleichzeitig**:
1. Einen eigenen Block (Newsletter-Checkbox)
2. Slot/Fill (`ExampleComponent` via `ExperimentalOrderMeta`)
3. Checkout-Filter (Produktnamen anpassen)
4. Additional Checkout Fields (serverseitig via PHP)

---

## 4. Mechanismus A: Eigener Block im Checkout (`registerCheckoutBlock`)

Das ist die Antwort auf deine Kernfrage „Erweiterung via Block". Es braucht **zwei Registrierungen** für ein und denselben Block – das ist der Punkt, der am meisten verwirrt:

### 4.1 Editor-Seite – `registerBlockType` (in `index.js`)
Macht den Block im Block-Editor sichtbar und platzierbar.

```jsx
import { registerBlockType } from '@wordpress/blocks';
import { Edit, Save } from './edit';
import metadata from './block.json';

registerBlockType( metadata, {
  icon: { … },
  edit: Edit,
  save: Save,
} );
```

### 4.2 Frontend-Seite – `registerCheckoutBlock` (in `frontend.js`)
Sagt WooCommerce: „Wenn dieser Block im Checkout-Baum vorkommt, rendere im Frontend *diese* Komponente." Das ist WooCommerce-spezifisch und ersetzt den `save`-Mechanismus.

```jsx
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import Block from './block';
import metadata from './block.json';

registerCheckoutBlock( {
  metadata,
  component: Block,   // ← die Kunden-Ansicht
} );
```

### 4.3 Wo landet der Block? → `parent` entscheidet
In `block.json` steht:
```json
"parent": [ "woocommerce/checkout-contact-information-block" ]
```
Damit ist der Block **fest an die Kontakt-Informationen** des Checkouts gebunden. Genau hier liegt dein Stolperstein aus dem `woo-order-ext`-Projekt: Welcher Parent ist der richtige?

**Die wichtigsten Checkout-Parent-Blöcke:**

| Parent-Block | Position im Checkout |
|---|---|
| `woocommerce/checkout-contact-information-block` | Kontaktdaten (oben) |
| `woocommerce/checkout-shipping-address-block` | Lieferadresse |
| `woocommerce/checkout-billing-address-block` | Rechnungsadresse |
| `woocommerce/checkout-shipping-methods-block` | Versandarten |
| `woocommerce/checkout-payment-block` | Zahlung |
| `woocommerce/checkout-additional-information-block` | Zusätzliche Infos (gut für Grußkarte/Newsletter) |
| `woocommerce/checkout-order-note-block` | Bestellnotiz |

### 4.4 Die Frontend-Komponente (`block.js`) – hier passiert die Logik
Das ist die eigentlich interessante Datei. Sie zeigt drei Kern-Patterns der Checkout-Erweiterung:

```jsx
const Block = ( { children, checkoutExtensionData } ) => {
  const [ checked, setChecked ] = useState( false );
  const { setExtensionData } = checkoutExtensionData;
  const { setValidationErrors, clearValidationError } =
    useDispatch( 'wc/store/validation' );

  useEffect( () => {
    // 1) Daten an WooCommerce übergeben → landen später in der Bestellung
    setExtensionData( 'my-plugin', 'optin', checked );

    // 2) Validierung: Checkout blockieren, solange nicht angehakt
    if ( ! checked ) {
      setValidationErrors( {
        'my-plugin': { message: 'Please tick the box', hidden: false },
      } );
      return;
    }
    clearValidationError( 'my-plugin' );
  }, [ checked, … ] );

  // 3) Validierungsfehler aus dem Store lesen
  const { validationError } = useSelect( ( select ) =>
    ( { validationError: select( 'wc/store/validation' )
        .getValidationError( 'my-plugin' ) } )
  );

  return ( … <CheckboxControl checked={checked} onChange={setChecked} /> … );
};
```

Die drei Patterns, die du immer wieder brauchst:
- **`checkoutExtensionData.setExtensionData(namespace, key, value)`** – schiebt Daten in den Checkout-State. Diese kannst du serverseitig wieder auslesen, wenn die Bestellung abgeschickt wird.
- **`wc/store/validation`** – der zentrale Datastore für Validierung. Mit `setValidationErrors` blockierst du den „Bestellen"-Button.
- **`useSelect` / `useDispatch`** (aus `@wordpress/data`) – Lesen aus / Schreiben in die WooCommerce-Datastores. Das ist Redux-artiges State-Management.

---

## 5. Mechanismus B: Slot/Fill (`registerPlugin` + `ExperimentalOrderMeta`)

Slot/Fill ist das **flexiblere** Gegenstück. Statt einen Block an einer festen Stelle zu platzieren, füllst du einen vom WooCommerce-Team vordefinierten „Einschub" (Slot). Der Shop-Betreiber muss *nichts* im Editor platzieren – dein Inhalt erscheint automatisch.

**Das Mental Model:**
- **Slot** = ein benannter Platzhalter, den WooCommerce im Checkout-UI bereitstellt (z.B. „unten in der Bestellübersicht").
- **Fill** = dein Inhalt, der in diesen Slot „hineinfließt".

In `index.js` des Beispiels:

```jsx
import { registerPlugin } from '@wordpress/plugins';
import { ExperimentalOrderMeta } from '@woocommerce/blocks-checkout';
import { getSetting } from '@woocommerce/settings';

const exampleDataFromSettings = getSetting( 'my-plugin_data' );

const render = () => (
  <ExperimentalOrderMeta>           {/* ← der Slot (Fill) */}
    <ExampleComponent data={ exampleDataFromSettings } />
  </ExperimentalOrderMeta>
);

registerPlugin( 'my-plugin', {
  render,
  scope: 'woocommerce-checkout',     {/* ← wichtig: bindet an den Checkout */}
} );
```

**Die wichtigsten vordefinierten Slots (Fill-Komponenten):**

| Komponente | Position |
|---|---|
| `ExperimentalOrderMeta` | Unter der Bestellübersicht (Cart & Checkout) |
| `ExperimentalOrderShippingPackages` | Bei den Versandpaketen |
| `ExperimentalDiscountsMeta` | Beim Gutschein-/Rabattbereich |

**`scope`** ist hier entscheidend: `woocommerce-checkout` lädt nur im Checkout, `woocommerce-cart` nur im Warenkorb.

### Block vs. Slot/Fill – wann was?

| | **Eigener Block** | **Slot/Fill** |
|---|---|---|
| Position | Fest (über `parent`), Betreiber kann verschieben | An vordefinierten Slots |
| Platzierung nötig? | Ja, im Block-Editor | Nein, automatisch |
| Konfigurierbar durch Betreiber? | Ja (Editor-UI) | Nein |
| Gut für | UI-Elemente mit Eingabe (Checkbox, Select) | Zusatz-Infos, dynamische Anzeigen |

Für deine **Grußkarten-Auswahl** mit Eingabefeldern ist der eigene Block (Mechanismus A) richtig. Für reine Anzeige-Elemente wäre Slot/Fill schlanker.

---

## 6. Mechanismus C: Checkout-Filter

Filter erlauben es, vorhandene Werte abzufangen und zu verändern – ohne UI. Aus `filters.js`:

```jsx
import { __experimentalRegisterCheckoutFilters } from '@woocommerce/blocks-checkout';

__experimentalRegisterCheckoutFilters( 'my-plugin', {
  itemName: ( name ) => `${name} + extra data!`,
} );
```

> **Achtung – Versionshinweis:** Das Beispiel nutzt noch `__experimentalRegisterCheckoutFilters`. In aktuellen WooCommerce-Versionen heißt die stabile API **`registerCheckoutFilters`** (ohne `__experimental`-Präfix). Das deckt sich mit dem, was du im `woo-order-ext`-Projekt bereits umgestellt hast. Verwende die stabile Variante.

Typische filterbare Werte: `itemName`, `subtotalPriceFormat`, `cartItemPrice`, `coupons` u.a. Filter sind ideal, um Texte/Preise/Labels anzupassen.

### Payment-Method-Callbacks
Im selben File:
```jsx
registerPaymentMethodExtensionCallbacks( 'my-plugin', {
  cod: ( arg ) => arg.billingData.city !== 'Denver',
} );
```
Damit kannst du Zahlungsarten dynamisch ein-/ausblenden (hier: Nachnahme nur außerhalb von „Denver"). Nützlich für regionale Regeln.

---

## 7. Mechanismus D: Additional Checkout Fields (serverseitig, PHP)

Seit neueren WooCommerce-Versionen gibt es eine **rein serverseitige** API für Standard-Felder – du brauchst dafür *kein* JavaScript. Aus `$slug.php`:

```php
add_action( 'woocommerce_init', 'register_custom_checkout_fields' );

function register_custom_checkout_fields() {
  if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
    return;
  }

  woocommerce_register_additional_checkout_field( array(
    'id'       => 'my-plugin/custom-checkbox',
    'label'    => 'Check this box…',
    'location' => 'contact',          // contact | address | order
    'type'     => 'checkbox',          // checkbox | text | select
  ) );
}
```

Dazu gibt es Hooks für **Sanitization** und **Validierung**:

```php
// Sanitize – Wert vor dem Speichern bereinigen
add_action( 'woocommerce_sanitize_additional_field', function ( $value, $key ) {
  if ( 'my-plugin/custom-text-input' === $key ) {
    return strtoupper( $value );
  }
  return $value;
}, 10, 2 );

// Validate – Bestellung ablehnen bei ungültigem Wert
add_action( 'woocommerce_blocks_validate_location_address_fields',
  function ( \WP_Error $errors, $fields ) {
    if ( 'INVALID' === ( $fields['my-plugin/custom-text-input'] ?? '' ) ) {
      $errors->add( 'invalid_text_detected', 'Bitte keinen ungültigen Text.' );
    }
  }, 10, 2 );
```

**Drei mögliche `location`-Werte:** `contact`, `address`, `order`. Diese Felder erscheinen automatisch an passender Stelle und werden automatisch in der Bestellung gespeichert.

> **Entscheidungshilfe:** Für einfache Standardfelder (Checkbox, Text, Select) ist diese PHP-API der **schnellste** Weg – kein React, kein Build. Für komplexes UI (deine Grußkarten-Auswahl mit Vorschau, eigener Logik) brauchst du den eigenen Block (Mechanismus A).

---

## 8. Die PHP-Integration: Wie alles zusammenkommt

Das verbindende Glied ist die **Integration-Klasse**, die `IntegrationInterface` implementiert. Sie macht drei Dinge:

```php
class My_Plugin_Blocks_Integration implements IntegrationInterface {

  public function get_name() { return 'my-plugin'; }

  // 1) Scripts/Styles registrieren
  public function initialize() {
    $this->register_main_integration();
    // … weitere register_*-Methoden
  }

  // 2) Welche Scripts im Frontend / Editor laden?
  public function get_script_handles() {
    return array( 'my-plugin-blocks-integration',
                  'my-plugin-…-block-frontend' );
  }
  public function get_editor_script_handles() { … }

  // 3) Daten vom Server an den Block übergeben (→ getSetting im JS)
  public function get_script_data() {
    return array(
      'example-data'     => 'Daten vom Server',
      'optInDefaultText' => 'Ich möchte Updates erhalten.',
    );
  }
}
```

Registriert wird sie über die Block-Registry-Hooks:

```php
add_action( 'woocommerce_blocks_loaded', function () {
  require_once __DIR__ . '/my-plugin-blocks-integration.php';

  add_action( 'woocommerce_blocks_cart_block_registration',
    fn( $registry ) => $registry->register( new My_Plugin_Blocks_Integration() ) );

  add_action( 'woocommerce_blocks_checkout_block_registration',
    fn( $registry ) => $registry->register( new My_Plugin_Blocks_Integration() ) );
} );
```

**Die Server→Client-Datenbrücke:** Was du in PHP via `get_script_data()` zurückgibst, liest du im JS mit `getSetting( 'my-plugin_data' )`. So kommen z.B. übersetzte Default-Texte oder Konfigurationswerte vom Server in den React-Block.

> **Dein bekannter Stolperstein:** Die `.asset.php`-Pfade. Das Build erzeugt zu jeder JS-Datei eine `*.asset.php` mit den korrekten Dependencies und der Version. Wenn der Pfad in `wp_register_script` nicht exakt auf die gebaute Datei zeigt, fehlen die Dependencies und der Block lädt nicht. Genau diese Pfad-Referenzen musst du sauber halten – das deckt sich mit deinen früheren Debugging-Sessions.

---

## 9. Der Build-Prozess

WooCommerce-Blocks brauchen einen Build-Schritt (`@wordpress/scripts` + `@woocommerce/dependency-extraction-webpack-plugin`):

- `src/` enthält den lesbaren Quellcode (JSX, SCSS).
- `npm run build` (bzw. `start` für Watch-Modus) erzeugt `build/` mit:
  - kompiliertem JS
  - der `*.asset.php` je Eintrag (Dependencies + Version)
  - kompiliertem CSS
- Das `@woocommerce/dependency-extraction-webpack-plugin` sorgt dafür, dass `@wordpress/*`- und `@woocommerce/*`-Imports **nicht** mitgebündelt werden, sondern als WordPress-Dependencies referenziert werden. Deshalb tauchen sie korrekt in der `.asset.php` auf.

---

## 10. Lernpfad – konkrete Reihenfolge für dich

1. **Erst die WP-Block-Basis** verstehen: `block.json`, `edit`, `save` an einem trivialen eigenen Block (ohne WooCommerce). Du kennst das aus deiner React/Block-Theme-Recherche – hier liegt das Fundament.
2. **Dann den Checkout als Block-Baum** begreifen: Im Block-Editor mal den Checkout aufklappen und die Inner-Blocks (`contact-information`, `shipping-address` …) inspizieren. Das macht `parent` greifbar.
3. **Mechanismus A nachbauen:** Den Newsletter-Block isoliert nachvollziehen – `registerBlockType` (Editor) + `registerCheckoutBlock` (Frontend) + `parent`.
4. **`setExtensionData` + Validierung** verstehen – das ist der Kern jeder echten Checkout-Erweiterung.
5. **Slot/Fill** als Alternative ausprobieren (`ExperimentalOrderMeta`).
6. **PHP-Integration** zuletzt – sie ist „nur" der Klebstoff, aber für `.asset.php`-Pfade und Server-Daten essenziell.

---

## 11. Spickzettel: Welcher Mechanismus wofür?

- **Eingabe-UI an fester Checkout-Position** (Grußkarte, Newsletter-Checkbox) → **eigener Block** (`registerCheckoutBlock` + `parent`)
- **Einfaches Standardfeld ohne eigenes UI** → **Additional Checkout Field** (PHP, `woocommerce_register_additional_checkout_field`)
- **Zusatz-Anzeige ohne Betreiber-Platzierung** → **Slot/Fill** (`ExperimentalOrderMeta` + `registerPlugin`)
- **Vorhandene Werte/Texte/Preise verändern** → **Checkout-Filter** (`registerCheckoutFilters`)
- **Zahlungsarten ein-/ausblenden** → **`registerPaymentMethodExtensionCallbacks`**
- **Daten vom Server in den Block** → `get_script_data()` (PHP) ↔ `getSetting()` (JS)
- **Daten aus dem Block in die Bestellung** → `setExtensionData()` (JS) ↔ serverseitiges Auslesen

---

## Wichtige API-Referenzen (Imports)

| Import | Quelle |
|---|---|
| `registerBlockType` | `@wordpress/blocks` |
| `registerCheckoutBlock` | `@woocommerce/blocks-checkout` |
| `registerCheckoutFilters` | `@woocommerce/blocks-checkout` |
| `registerPlugin` | `@wordpress/plugins` |
| `ExperimentalOrderMeta` | `@woocommerce/blocks-checkout` |
| `registerPaymentMethodExtensionCallbacks` | `@woocommerce/blocks-registry` |
| `getSetting` | `@woocommerce/settings` |
| `useSelect`, `useDispatch` | `@wordpress/data` |
| `IntegrationInterface` | `Automattic\WooCommerce\Blocks\Integrations` (PHP) |

---

*Hinweis zu API-Stabilität: Die WooCommerce-Blocks-APIs haben einige Methoden vom `__experimental`-Präfix in stabile Namen überführt (z.B. `registerCheckoutFilters`). Das offizielle Beispiel-Repo hinkt hier teils hinterher. Prüfe bei Problemen die aktuelle Version unter developer.woocommerce.com.*

---

## 12. Praxis-Erkenntnisse: Zwei eigene Blöcke parallel im Checkout (verifiziert)

Dieser Abschnitt hält die konkreten Erkenntnisse aus dem `woo-order-ext`-Projekt fest, nachdem **beide** Blöcke (Newsletter-Subscription **und** Greeting-Card) erfolgreich im Checkout geladen wurden. Es sind die Punkte, an denen das Setup tatsächlich gehakt hat – nicht die Theorie.

### 12.1 Die zwei getrennten Registrierungs-Welten – nicht vermischen

Ein eigener Checkout-Block lädt nur dann zuverlässig, wenn **beide** Registrierungs-Wege sauber parallel laufen – sie machen unterschiedliche Dinge:

| Weg | Datei / Hook | Aufgabe |
|---|---|---|
| **Block-Type-Registrierung** | `woo-order-ext.php`, Hook `init`, `register_block_type_from_metadata()` | Macht den Block dem Editor bekannt (liest die kopierte `block.json` unter `build/js/<ordner>/`) |
| **Integration-Registrierung** | `woo-order-ext-blocks-integration.php` über die Blocks-Registry-Hooks | Lädt die **Frontend-** und **Editor-Scripts** in Cart/Checkout |

Beide Blöcke müssen in **beiden** Welten auftauchen. Konkret heißt das im verifizierten Setup:

- In `init` werden **beide** `register_block_type_from_metadata()`-Aufrufe ausgeführt (Newsletter **und** Greeting-Card).
- In `initialize()` der Integration werden für **jeden** Block die drei `register_*`-Methoden aufgerufen (frontend / editor scripts / editor styles).
- In `get_script_handles()` **und** `get_editor_script_handles()` stehen die Handles **beider** Blöcke plus das Integrations-Bundle.

Fehlt ein Block in nur einer dieser Listen, lädt er entweder nur im Editor oder nur im Frontend – das war eine der Hauptursachen für „erscheint im Editor, rendert aber nicht beim Kunden".

### 12.2 Der `.asset.php`-Pfad ist der häufigste Stolperstein (bestätigt)

Bestätigt sich erneut: Wenn der Pfad in `wp_register_script` nicht **exakt** auf die gebaute `.asset.php` zeigt, fällt der Code in den Fallback mit leeren `dependencies`. Dann lädt das Frontend-Script **ohne** `wc-blocks-checkout`, und `registerCheckoutBlock` ist `undefined` → der Block rendert still nicht.

Verifizierte Namenskonvention im `build/`-Ordner: **Die `.asset.php`-Datei heißt identisch zum jeweiligen JS-Bundle**, z.B.

```
woo-order-ext-checkout-greeting-card-block-frontend.js
woo-order-ext-checkout-greeting-card-block-frontend.asset.php
```

Also nicht abgekürzt (`greeting-card-block-frontend.asset.php` war falsch). Bei zwei Blöcken vervielfacht sich diese Fehlerquelle – jeden der vier Frontend-/Editor-Pfade einzeln gegen den echten Build-Output prüfen.

**Kleiner, schon bekannter Schönheitsfehler:** In einigen Fallback-Zweigen wird `$this->get_file_version($script_asset_path)` statt `$script_path` übergeben. Funktional unkritisch (greift nur, wenn die `.asset.php` fehlt), aber bei Gelegenheit auf `$script_path` korrigieren.

### 12.3 Der richtige `parent` entscheidet über die Position – und über Existenz

Bestätigt: `checkout-additional-delivery-block` existiert **nicht** als Einhängepunkt. Ein nicht existierender Parent lässt den Block im Editor gar nicht erst andockbar werden.

Verifiziert funktioniert für beide Zusatz-Blöcke:

```json
"parent": [ "woocommerce/checkout-additional-information-block" ]
```

Damit landen Newsletter-Checkbox und Greeting-Card im Bereich „Additional information" (per Default der letzte Checkout-Schritt).

### 12.4 `save` muss `null` zurückgeben (dynamischer Block)

Für beide Blöcke gilt: Die Kunden-Ansicht kommt aus der via `registerCheckoutBlock` registrierten Komponente, **nicht** aus `save`. Deshalb:

```javascript
export const Save = () => null;
```

Gibt `save` stattdessen Markup zurück, riskiert man Block-Validierungsfehler im Editor.

### 12.5 Block NICHT zusätzlich in der Wurzel-`src/index.js` importieren

Beide Blöcke haben **eigene Webpack-Entry-Points** und werden über die PHP-Integration geladen. Ein zusätzlicher Import in der Wurzel-`src/index.js` würde sie **doppelt registrieren** (Konsolen-Warnung „Block ... is already registered"). Die Wurzel-`index.js` ist nur für Filter/Slot-Fill-Logik zuständig, nicht für die eigenen Blöcke.

### 12.6 Die Einhäng-Punkte für die Inner-Block-Liste (`editor.js`)

Damit die eigenen Blöcke im Editor als erlaubte Inner-Blocks im jeweiligen Bereich auftauchen, wird der Filter `additionalCartCheckoutInnerBlockTypes` genutzt. Im verifizierten Stand werden dort beide Block-Namen registriert (Greeting-Card gezielt im Additional-Information-Bereich, Newsletter generisch). Wichtig: Die hier verwendeten Block-Namen müssen **exakt** den `name`-Feldern der jeweiligen `block.json` entsprechen (`woo-order-ext/checkout-greeting-card`, `woo-order-ext/checkout-newsletter-subscription`).

### 12.7 Reihenfolge-Checkliste für „beide Blöcke laden zuverlässig"

Wenn ein zweiter eigener Block hinzugefügt wird, diese Punkte der Reihe nach abhaken:

1. Eigener Ordner unter `src/js/<block>/` mit `block.json`, `index.js`, `edit.js`, `frontend.js`, `block.js`.
2. `block.json`: korrekter `name`, korrekter existierender `parent`.
3. Webpack-Entry-Point für `<block>` und `<block>-frontend` ergänzt.
4. `npm run build` → prüfen, dass JS **und** gleichnamige `.asset.php` im `build/` liegen.
5. `init`-Hook: `register_block_type_from_metadata()` für den neuen Block ergänzt.
6. Integration `initialize()`: `register_*_frontend_scripts()` + `register_*_editor_scripts()` (+ Styles) ergänzt, mit **exakten** `.asset.php`-Pfaden.
7. `get_script_handles()` **und** `get_editor_script_handles()`: Handle des neuen Blocks ergänzt.
8. `editor.js`: Block-Name in die Inner-Block-Liste aufgenommen.
9. Editor: Checkout aufklappen, Block im richtigen Bereich sichtbar? Frontend: Block rendert beim Kunden?

Erst wenn alle neun Punkte stimmen, laden zwei (oder mehr) eigene Blöcke parallel zuverlässig.

---

## 13. Datenfluss verstehen: `edit.js` → `block.json` → `block.js`

Dieses Kapitel beantwortet die Frage, die bei eigenen Checkout-Blöcken am meisten Verwirrung stiftet: **Wie kommen Daten, die der Shop-Betreiber im Editor (`edit.js`) einstellt, in die Kundenansicht im Frontend (`block.js`)?** Und warum funktioniert dabei das normale Gutenberg-`save`-Muster *nicht*?

### 13.1 Der mentale Bruch mit dem normalen Gutenberg-Block

Ein **normaler** WordPress-Block kennt zwei Renderings:
- `edit` → wie der Block im Editor aussieht
- `save` → das HTML, das in der DB gespeichert und im Frontend ausgegeben wird

Beim **WooCommerce-Checkout-Block** ist diese Linie durchtrennt. Der Checkout wird im Frontend **nicht** aus gespeichertem HTML gerendert, sondern als **lebende React-App** zur Laufzeit aufgebaut. Deshalb gilt:

- `save` gibt `null` zurück → es wird **kein** statisches Frontend-HTML gespeichert.
- Das Frontend-Rendering übernimmt `block.js`, eingehängt über `registerCheckoutBlock` (in `frontend.js`).

> **Kernsatz:** `edit.js`, die `Save`-Funktion und `block.js` rendern denselben Block, aber in unterschiedlichen Momenten und für unterschiedliche Zielgruppen. `block.json` ist die gemeinsame Klammer, die alle drei verbindet.

### 13.2 Wer läuft wann?

| Datei | Läuft … | Zielgruppe | Aufgabe |
|---|---|---|---|
| `edit.js` | im Block-Editor (Backend) | Shop-Betreiber | Vorschau + Konfiguration des Blocks |
| `Save` (in `edit.js`/`save.js`) | beim Speichern im Editor | – | gibt `null` zurück (dynamischer Block) |
| `block.js` | im echten Checkout (Frontend) | Kunde | Eingabe, Validierung, `setExtensionData` |

`edit.js` sieht nie ein Kunde, `block.js` nie ein Betreiber. Deshalb lebt die Kundenlogik (`useState`, `useEffect`, `setExtensionData`) ausschließlich in `block.js`.

### 13.3 Die Datenbrücke: `attributes` in `block.json`

Damit ein im Editor eingestellter Wert das Frontend erreicht, läuft er **nicht** über `save`, sondern über die **`attributes`** der `block.json`. Der Ablauf:

1. `edit.js` schreibt den Wert via `setAttributes()` in ein Attribut.
2. WordPress persistiert das Attribut (im Block-Markup der Seite).
3. WooCommerce reicht die gespeicherten Attribute beim Frontend-Rendering als **Props** an die `block.js`-Komponente weiter.

**Wichtiger, oft übersehener Punkt:** Bei dynamischen Checkout-Blöcken werden die Attribut-Werte als `data-*`-Attribute an das Block-`<div>` gehängt und von dort an die Frontend-Komponente übergeben – sie kommen **nicht** über ein in `save` gespeichertes HTML. Genau deshalb gibt `save` `null` zurück und trotzdem erreichen die Werte das Frontend.

### 13.4 Durchgehendes Beispiel: Konfigurierbarer Grußkarten-Titel

Ausbaustufe für den `woo-order-ext`-Greeting-Card-Block: Der Shop-Betreiber soll im Editor einen **Standard-Titel** („Schreibe deine Grußkarte") festlegen können, den der Kunde dann im Frontend über dem Eingabefeld sieht.

#### Schritt 1 — Attribut in `block.json` deklarieren

```json
{
  "apiVersion": 3,
  "name": "woo-order-ext/checkout-greeting-card",
  "title": "Greeting Card",
  "category": "woo-order-ext",
  "parent": [ "woocommerce/checkout-additional-information-block" ],
  "attributes": {
    "cardTitle": {
      "type": "string",
      "default": "Schreibe deine Grußkarte"
    }
  },
  "textdomain": "woo-order-ext"
}
```

Das Attribut `cardTitle` ist jetzt die offizielle „Leitung", durch die der Wert vom Editor ins Frontend fließt.

#### Schritt 2 — `edit.js`: Betreiber stellt den Wert ein

`edit.js` bekommt `attributes` und `setAttributes` als Props. Mit `RichText` (oder `TextControl`) lässt sich der Titel direkt im Editor bearbeiten:

```javascript
import { useBlockProps, RichText } from '@wordpress/block-editor';

export const Edit = ( { attributes, setAttributes } ) => {
    const blockProps = useBlockProps();
    const { cardTitle } = attributes;

    return (
        <div { ...blockProps }>
            <RichText
                tagName="h3"
                value={ cardTitle }
                onChange={ ( value ) => setAttributes( { cardTitle: value } ) }
                placeholder="Titel der Grußkarte…"
            />
        </div>
    );
};

// Dynamischer Block → kein statisches HTML speichern
export const Save = () => null;
```

Sobald der Betreiber tippt, schreibt `setAttributes` den Wert ins Attribut `cardTitle`. WordPress speichert ihn.

#### Schritt 3 — `block.js`: Kunde sieht den Wert im Frontend

Die Frontend-Komponente bekommt die gespeicherten `attributes` als Prop. Der Titel wird gelesen, der Rest ist die bekannte Eingabe-/Validierungs-Logik:

```javascript
import { useEffect, useState } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';

const Block = ( { attributes, checkoutExtensionData } ) => {
    const { cardTitle } = attributes;          // ← Wert aus edit.js
    const [ message, setMessage ] = useState( '' );
    const { setExtensionData } = checkoutExtensionData;
    const { setValidationErrors, clearValidationError } =
        useDispatch( 'wc/store/validation' );

    useEffect( () => {
        setExtensionData( 'woo-order-ext', 'greeting', message );
        clearValidationError( 'woo-order-ext-greeting' );
    }, [ message, setExtensionData, clearValidationError ] );

    return (
        <div className="wp-block-woo-order-ext-checkout-greeting-card">
            <h3>{ cardTitle }</h3>
            <textarea
                value={ message }
                onChange={ ( e ) => setMessage( e.target.value ) }
                placeholder="Dein Grußtext…"
            />
        </div>
    );
};

export default Block;
```

#### Schritt 4 — `frontend.js`: die Verdrahtung (unverändert)

```javascript
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';
import Block from './block';

registerCheckoutBlock( { metadata, component: Block } );
```

Hier wird klar, warum `metadata` (= die `block.json`) übergeben wird: Sie bringt die `attributes`-Definition mit, über die WooCommerce weiß, welche Werte es an `block.js` durchreichen muss.

### 13.5 Der Fluss in einem Satz

Betreiber tippt in `edit.js` → `setAttributes` schreibt nach `cardTitle` → `block.json` definiert das Attribut und macht es persistierbar → WooCommerce reicht es als Prop an `block.js` → Kunde sieht den Wert. **`save` ist an diesem Fluss nicht beteiligt** und gibt nur `null` zurück.

### 13.6 Häufige Stolpersteine (verifiziert)

- **Wert ist im Frontend `undefined`:** Das Attribut fehlt in `block.json` oder ist dort anders geschrieben als in `edit.js`/`block.js`. Der Attribut-Name muss an allen drei Stellen identisch sein.
- **„Block validation failed" im Editor:** `Save` gibt Markup statt `null` zurück. Bei dynamischen Blöcken muss `Save` `null` liefern.
- **Editor-Imports im Frontend:** In `block.js` **keine** Komponenten aus `@wordpress/block-editor` oder `@wordpress/blocks` verwenden (z.B. `RichText`, `useBlockProps`). Die gehören nur in `edit.js`. Andernfalls schleppt das Frontend-Bundle unnötig große Editor-Abhängigkeiten mit – und kann brechen.
- **Änderung wirkt nur im Editor, nicht im Frontend:** Klassisches Zeichen dafür, dass der Wert im Frontend hartkodiert ist, statt über das Attribut aus `block.json` gelesen zu werden. In `block.js` konsequent `attributes.<name>` verwenden.

### 13.7 Abgrenzung: `attributes` vs. `setExtensionData`

Die beiden dürfen nicht verwechselt werden – sie laufen in **entgegengesetzte Richtungen**:

| | Richtung | Zweck | Persistenz |
|---|---|---|---|
| `attributes` (block.json) | Betreiber → Block (Editor → Frontend) | **Konfiguration** des Blocks (Titel, Labels, Defaults) | mit der Seite gespeichert |
| `setExtensionData` | Kunde → Server (Frontend → Bestellung) | **Kundeneingabe** in den Checkout-State | mit der Bestellung gespeichert (siehe Kapitel zur serverseitigen Weiterverarbeitung) |

Im Grußkarten-Beispiel: `cardTitle` ist Konfiguration (Attribut), der eingetippte Grußtext ist Kundeneingabe (`setExtensionData`).

---

## 14. Vom Checkout-State in die Bestellung: serverseitige Weiterverarbeitung

Dieses Kapitel schließt den Bogen: In Kapitel 13 hat der Kunde über `setExtensionData` einen Wert (den Grußtext) in den Checkout-State geschrieben. Hier geht es darum, wie dieser Wert **serverseitig** ankommt, in der Bestellung gespeichert wird und schließlich in der **Bestell-E-Mail** landet, die der Kunde bekommt.

### 14.1 Was `setExtensionData` tatsächlich auslöst

`setExtensionData( 'woo-order-ext', 'greeting', value )` legt den Wert im Checkout-Kontext unter deinem Namespace ab. Beim Absenden des Checkouts taucht er automatisch im Store-API-Request unter der Property `extensions` auf:

```
extensions: {
  "woo-order-ext": {
    greeting: "<eingegebener Wert>"
  }
}
```

Du musst dafür auf JS-Seite **nichts** weiter tun, als `setExtensionData` aufzurufen – das macht `block.js` bereits.

> **Wichtige Abgrenzung:** Dieser Weg ist für Daten, die **nur mit der Bestellung gespeichert** werden sollen (kein sofortiges Cart-Update). Soll der Wert dagegen den Warenkorb verändern (Gebühr, Rabatt, Versandarten), brauchst du stattdessen `extensionCartUpdate` – siehe Abschnitt 14.6. Für eine reine Grußkarte (Text, kein Preis-Einfluss) ist der hier beschriebene einfache Weg richtig.

### 14.2 Schritt 1 — Store API erweitern (Schema registrieren)

Damit WooCommerce dein Feld im `extensions`-Objekt überhaupt akzeptiert, registrierst du ein Schema über `woocommerce_store_api_register_endpoint_data` an der `CheckoutSchema`:

```php
add_action('woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_endpoint_data(
        array(
            'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema::IDENTIFIER,
            'namespace'       => 'woo-order-ext',
            'schema_callback' => function () {
                return array(
                    'greeting' => array(
                        'description' => __('Grußkarten-Text', 'woo-order-ext'),
                        'type'        => array('string', 'null'),
                        'context'     => array('view', 'edit'),
                        'optional'    => true,
                    ),
                );
            },
        )
    );
});
```

Der `namespace` muss **exakt** dem ersten Argument von `setExtensionData` entsprechen (`woo-order-ext`), der Schema-Key (`greeting`) dem zweiten.

### 14.3 Schritt 2 — Wert beim Bestellabschluss in die Order-Meta schreiben

Hier ist der zentrale Punkt: Für Blocks-Checkout-Daten greifen die **klassischen** WooCommerce-Hooks nicht. Stattdessen feuert beim Anlegen der Bestellung der Hook `woocommerce_store_api_checkout_update_order_from_request`:

```php
add_action(
    'woocommerce_store_api_checkout_update_order_from_request',
    function (\WC_Order $order, \WP_REST_Request $request) {
        $data = $request['extensions']['woo-order-ext'] ?? array();

        if (! empty($data['greeting'])) {
            $order->update_meta_data(
                '_woo_order_ext_greeting',
                sanitize_text_field($data['greeting'])
            );
        }
    },
    10,
    2
);
```

Der Unterstrich-Präfix (`_`) hält das Feld aus der allgemeinen Custom-Fields-Liste heraus (internes Meta). Den Wert speicherst du erst, validierst ihn aber idealerweise vorher – siehe 14.5.

### 14.4 Schritt 3 — In Bestellübersicht und E-Mail anzeigen

Jetzt das eigentliche Ziel. Es gibt zwei Wege:

#### Weg A — Sichtbares Meta (schnell, automatisch)

Speichert man den Wert unter einem **sichtbaren** Label (ohne führenden Unterstrich), gibt WooCommerce ihn automatisch in Admin, Kundenkonto **und** den E-Mails aus:

```php
$order->update_meta_data(
    __('Grußkarte', 'woo-order-ext'),   // kein Unterstrich → sichtbar
    sanitize_text_field($data['greeting'])
);
```

Das ist der schnellste Weg, aber du hast wenig Kontrolle über Platzierung und Formatierung.

#### Weg B — Internes Meta + gezielter Display-Hook (volle Kontrolle)

Wert intern speichern (Weg aus 14.3) und gezielt ausgeben. Für die **E-Mail**:

```php
add_action(
    'woocommerce_email_order_meta',
    function ($order, $sent_to_admin, $plain_text, $email) {
        $greeting = $order->get_meta('_woo_order_ext_greeting');
        if (! $greeting) {
            return;
        }
        if ($plain_text) {
            echo "\n" . esc_html__('Grußkarte', 'woo-order-ext') . ': '
               . esc_html($greeting) . "\n";
        } else {
            echo '<p><strong>' . esc_html__('Grußkarte', 'woo-order-ext') . ':</strong> '
               . esc_html($greeting) . '</p>';
        }
    },
    10,
    4
);
```

Analoge Hooks für die anderen Ansichten:

| Hook | Ansicht |
|---|---|
| `woocommerce_email_order_meta` | Bestell-E-Mails (Kunde + Admin) |
| `woocommerce_order_details_after_order_table` | Danke-Seite + Konto-Bestelldetails |
| `woocommerce_admin_order_data_after_billing_address` | Admin-Bestelldetails |

### 14.5 Serverseitige Validierung (optional, empfohlen)

Im selben `update_order_from_request`-Hook kannst du den Wert validieren und den Checkout bei Fehler sauber abbrechen, indem du eine `RouteException` wirfst:

```php
if (mb_strlen($data['greeting']) > 200) {
    throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
        'woo_order_ext_greeting_too_long',
        __('Der Grußtext darf höchstens 200 Zeichen haben.', 'woo-order-ext'),
        400
    );
}
```

Die Fehlermeldung erscheint dem Kunden im Checkout, die Bestellung wird nicht angelegt. Validierung gehört **vor** das `update_meta_data`.

### 14.6 Wann stattdessen `extensionCartUpdate`?

Nur wenn der Wert den **Warenkorb selbst** verändern soll (Gebühr, Rabatt, Versand, Steuern). Extensions dürfen den clientseitigen Cart-State nicht direkt setzen – ein fehlerhaftes Update würde den ganzen Block lahmlegen. Stattdessen:

1. Client ruft `extensionCartUpdate( { namespace, data } )` auf → trifft den `cart/extensions`-Endpoint.
2. Eine serverseitig registrierte Callback (über `woocommerce_store_api_register_update_callback`) wird ausgeführt und ändert den Cart (z.B. `WC()->cart->add_fee(...)`).
3. Der aktualisierte Cart kommt zurück, der Block rendert neu.

Würde die Grußkarte z.B. 2 € kosten, bräuchtest du diesen Weg **zusätzlich** zum einfachen Speicher-Pfad. Für reinen Text ist er nicht nötig.

### 14.7 Der vollständige Bogen (Kapitel 12–14)

```
Editor (edit.js)
   └─ setAttributes('cardTitle')        → Konfiguration
        ↓ (block.json attributes)
Frontend (block.js)
   ├─ liest attributes.cardTitle        → zeigt Titel
   └─ setExtensionData('woo-order-ext', 'greeting', wert)   → Kundeneingabe
        ↓ (Store API: extensions)
Server (PHP)
   ├─ Schema registriert das Feld       (woocommerce_store_api_register_endpoint_data)
   ├─ update_order_from_request         → Order-Meta gespeichert (+ Validierung)
   └─ woocommerce_email_order_meta      → erscheint in der Bestell-E-Mail
```

Damit ist der Weg lückenlos: von der Betreiber-Konfiguration im Editor über die Kundeneingabe im Frontend bis in die Bestell-E-Mail, die der Kunde zugeschickt bekommt.

### 14.8 Stolpersteine (verifiziert)

- **Wert kommt serverseitig nie an:** Schema nicht registriert (14.2) oder Namespace/Key stimmt nicht exakt mit `setExtensionData` überein.
- **Klassische Hooks greifen nicht:** `woocommerce_checkout_update_order_meta` o.ä. feuern beim Blocks-Checkout **nicht** zuverlässig. Den Store-API-Hook aus 14.3 verwenden.
- **Wert erscheint nicht in der E-Mail:** Bei Weg B den richtigen E-Mail-Hook (`woocommerce_email_order_meta`) mit 4 Parametern registrieren; bei Weg A sichergehen, dass das Meta-Label **keinen** führenden Unterstrich hat.
- **Kein `sanitize_*`:** Kundeneingaben immer bereinigen (`sanitize_text_field`, `sanitize_textarea_field`) und bei Ausgabe escapen (`esc_html`).
