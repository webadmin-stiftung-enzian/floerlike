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
