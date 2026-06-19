# WordPress- & WooCommerce-Block-Entwicklung: Grundlagen

Eine Anleitung für Einsteiger – vom ersten Block bis zur gespeicherten Bestelldaten.

---

## Bevor du anfängst: Was wollen wir eigentlich bauen?

Stell dir vor, du willst im WooCommerce-Checkout eine eigene Checkbox einbauen – z.B. „Ich möchte den Newsletter abonnieren". Der Kunde hakt sie an, klickt auf „Bestellen", und danach soll auf der Danke-Seite erscheinen, ob er sich angemeldet hat.

Das klingt simpel. Aber WooCommerce Blocks sind kein klassisches PHP-Template mehr – sie sind eine React-App. Deswegen braucht man mehr als einen PHP-Hook. Dieses Dokument erklärt Schritt für Schritt, wie das zusammenhängt.

---

## 1. Schnell-Orientierung: Was ist wo zuständig?

Bevor man in Details geht, hilft diese Übersicht, den Überblick zu behalten:

| Ebene | Was es ist | Werkzeug | Wann nötig |
|---|---|---|---|
| **WP-Block** | Ein Editor-Block (normales Gutenberg) | `registerBlockType`, `block.json` | Immer – das Fundament |
| **WooCommerce-Block** | Cart/Checkout sind selbst Blöcke aus vielen inneren Blöcken | Dieselbe Block-API | Zum Verstehen, wo man andocken kann |
| **Checkout-Erweiterung** | Eigener Block wird in Cart/Checkout eingefügt | `registerCheckoutBlock` + `parent` | Für eigene UI-Elemente im Checkout |
| **Slot/Fill** | Inhalt an vordefinierte Plätze einschieben, ohne eigenen Block | `ExperimentalOrderMeta` + `registerPlugin` | Für Anzeige-Elemente ohne Editor-Platzierung |

**Der wichtigste mentale Sprung:** Cart und Checkout sind keine PHP-Templates mehr. Sie sind React-Block-Bäume. Erweitern heißt: entweder einen eigenen Block in diesen Baum hängen oder einen vordefinierten Einschub (Slot) füllen.

---

## 2. Empfohlene Reihenfolge zum Lernen

Wer neu einsteigt, sollte diese Reihenfolge einhalten – jede Stufe baut auf der vorherigen auf:

1. **WP-Block-Basis**: `block.json`, `edit`, `save` an einem einfachen Block ohne WooCommerce verstehen
2. **Checkout als Block-Baum begreifen**: Im Block-Editor den Checkout aufklappen und die Inner-Blocks inspizieren – das macht `parent` greifbar
3. **Mechanismus A nachbauen**: Newsletter-Block isoliert – `registerBlockType` (Editor) + `registerCheckoutBlock` (Frontend) + `parent`
4. **`setExtensionData` + Schema** verstehen – der Kern jeder echten Checkout-Erweiterung
5. **Slot/Fill** als Alternative kennenlernen (`ExperimentalOrderMeta`)
6. **PHP-Integration** zuletzt – sie ist der Klebstoff für Scripts und Server-Daten

---

## 3. Was ist ein WordPress-Block überhaupt?

Ein Block besteht aus drei Dateien, die zusammenarbeiten:

### 3.1 `block.json` – das Manifest

Das ist die Steuerzentrale. WordPress liest von hier: Name, Kategorie, welche Einstellungen der Block hat, und wo er erscheinen darf.

```json
{
  "apiVersion": 3,
  "name": "mein-plugin/newsletter-checkbox",
  "title": "Newsletter Subscription",
  "category": "woocommerce",
  "parent": [ "woocommerce/checkout-contact-information-block" ],
  "attributes": {
    "text": { "type": "string", "default": "Newsletter abonnieren" }
  },
  "textdomain": "mein-plugin"
}
```

Zwei Felder sind besonders wichtig:
- **`parent`** – legt fest, in welchem übergeordneten Block dieser Block erscheinen darf. Ohne das kann der Block nirgendwo platziert werden.
- **`attributes`** – die Einstellungen, die der Shop-Betreiber im Editor vornehmen kann (z.B. Beschriftungstext der Checkbox).

### 3.2 `edit.js` – die Editor-Ansicht

Diese Datei beschreibt, was der **Shop-Betreiber** im Gutenberg-Editor sieht, wenn er den Block auswählt. Der Kunde sieht diese Ansicht nie.

```jsx
import { useBlockProps, RichText } from '@wordpress/block-editor';

export const Edit = ( { attributes, setAttributes } ) => {
    const blockProps = useBlockProps();
    const { text } = attributes;

    return (
        <div { ...blockProps }>
            {/* Betreiber kann den Beschriftungstext direkt im Editor ändern */}
            <RichText
                value={ text }
                onChange={ ( val ) => setAttributes( { text: val } ) }
                placeholder="Newsletter-Text eingeben…"
            />
        </div>
    );
};

// Checkout-Blöcke sind dynamisch – kein statisches HTML speichern
export const Save = () => null;
```

### 3.3 `save` – warum hier `null`?

Bei normalen WordPress-Blöcken speichert `save` HTML in der Datenbank. Beim WooCommerce-Checkout-Block funktioniert das anders: Das Frontend wird als **lebende React-App** gerendert, nicht aus gespeichertem HTML. Deshalb gibt `save` immer `null` zurück. Die eigentliche Kunden-Ansicht kommt aus `block.js` (siehe Kapitel 5).

---

## 4. Die Struktur eines Checkout-Erweiterungs-Plugins

Ein Plugin, das den WooCommerce Checkout erweitert, hat immer diese Grundstruktur:

```
mein-plugin/
├── mein-plugin.php                        ← Haupt-Plugin-Datei
├── mein-plugin-blocks-integration.php    ← Lädt Scripts, liefert Daten an JS
└── src/js/
    ├── index.js                           ← Slot/Fill & Filter (optional)
    └── checkout-newsletter-block/
        ├── block.json                     ← Manifest
        ├── index.js                       ← Editor-Registrierung
        ├── edit.js                        ← Editor-Ansicht
        ├── block.js                       ← Kunden-Ansicht (Frontend)
        └── frontend.js                    ← Frontend-Registrierung
```

Das Beispiel-Plugin von WooCommerce zeigt bewusst alle Mechanismen gleichzeitig:
1. Eigener Block (Newsletter-Checkbox)
2. Slot/Fill (Inhalte an vordefinierten Plätzen einschieben)
3. Checkout-Filter (Texte/Preise verändern)
4. Additional Checkout Fields (einfache Felder per PHP)

---

## 5. Mechanismus A: Eigener Block im Checkout

Das ist der Hauptweg, um ein eigenes UI-Element (Checkbox, Texteingabe, Auswahl) in den Checkout einzubauen.

> **In einem Satz:** Man registriert denselben Block zweimal – einmal für den Editor und einmal für das Frontend des Shops.

### 5.1 Editor-Registrierung – `registerBlockType`

Macht den Block im Gutenberg-Editor sichtbar und platzierbar.

```jsx
// src/js/checkout-newsletter-block/index.js
import { registerBlockType } from '@wordpress/blocks';
import { Edit, Save } from './edit';
import metadata from './block.json';

registerBlockType( metadata, {
    edit: Edit,
    save: Save,
} );
```

### 5.2 Frontend-Registrierung – `registerCheckoutBlock`

Sagt WooCommerce: „Wenn dieser Block im Checkout auftaucht, zeige dem Kunden diese Komponente." Ohne diesen Schritt rendert der Block im Shop gar nichts.

```jsx
// src/js/checkout-newsletter-block/frontend.js
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import Block from './block';
import metadata from './block.json';

registerCheckoutBlock( {
    metadata,    // block.json – bringt Name und Attribute mit
    component: Block,
} );
```

### 5.3 Wo landet der Block? – `parent` in `block.json`

Der `parent`-Wert bestimmt, in welchem Bereich des Checkouts der Block platziert werden kann. Nur existierende Parent-Blöcke funktionieren – ein falscher Name führt dazu, dass der Block im Editor nie erscheint.

**Die wichtigsten Checkout-Bereiche:**

| Parent-Block | Position im Checkout |
|---|---|
| `woocommerce/checkout-contact-information-block` | Kontaktdaten (oben) |
| `woocommerce/checkout-shipping-address-block` | Lieferadresse |
| `woocommerce/checkout-billing-address-block` | Rechnungsadresse |
| `woocommerce/checkout-shipping-methods-block` | Versandarten |
| `woocommerce/checkout-payment-block` | Zahlung |
| `woocommerce/checkout-additional-information-block` | Zusätzliche Infos (gut für Newsletter/Grußkarte) |
| `woocommerce/checkout-order-note-block` | Bestellnotiz |

### 5.4 Die Kunden-Ansicht – `block.js`

Diese Datei ist das Herzstück: Hier passiert die Logik, die der Kunde beim Checkout erlebt.

```jsx
// src/js/checkout-newsletter-block/block.js
import { useState } from '@wordpress/element';
import { CheckboxControl } from '@woocommerce/blocks-checkout';

const Block = ( { attributes, checkoutExtensionData } ) => {
    const { text } = attributes; // kommt aus dem Editor (block.json)
    const [ checked, setChecked ] = useState( false );
    const { setExtensionData } = checkoutExtensionData;

    const handleChange = ( newValue ) => {
        setChecked( newValue );
        // Wert in den Checkout-State schreiben → landet später in der Bestellung
        setExtensionData( 'mein-plugin', 'newsletter_optin', newValue );
    };

    return (
        <CheckboxControl
            id="newsletter-optin"
            checked={ checked }
            label={ text }
            onChange={ handleChange }
        />
    );
};

export default Block;
```

**Die drei wichtigsten Patterns in `block.js`:**
- **`checkoutExtensionData.setExtensionData(namespace, key, value)`** – schreibt Daten in den Checkout-State. Sie landen beim Absenden in der Bestellung.
- **`wc/store/validation`** – Datastore für Validierung. Mit `setValidationErrors` kann man den „Bestellen"-Button sperren.
- **`useSelect` / `useDispatch`** aus `@wordpress/data` – Lesen aus und Schreiben in WooCommerce-Datastores (Redux-artiges State-Management).

---

## 6. Mechanismus B: Slot/Fill

> **In einem Satz:** Man füllt einen vom WooCommerce-Team vordefinierten Platzhalter mit eigenem Inhalt – ohne dass der Betreiber etwas im Editor platzieren muss.

**Wann nutzen?** Für Anzeige-Elemente, die automatisch erscheinen sollen (kein Nutzer-Input nötig). Für Eingabe-Elemente ist Mechanismus A (eigener Block) besser.

```jsx
// src/js/index.js
import { registerPlugin } from '@wordpress/plugins';
import { ExperimentalOrderMeta } from '@woocommerce/blocks-checkout';
import { getSetting } from '@woocommerce/settings';

const MeinInhalt = () => {
    const daten = getSetting( 'mein-plugin_data' ); // Daten vom PHP-Server
    return <p>{ daten['beispiel-text'] }</p>;
};

registerPlugin( 'mein-plugin', {
    render: () => (
        <ExperimentalOrderMeta>
            <MeinInhalt />
        </ExperimentalOrderMeta>
    ),
    scope: 'woocommerce-checkout', // nur im Checkout laden
} );
```

**Verfügbare Slots:**

| Komponente | Position |
|---|---|
| `ExperimentalOrderMeta` | Unter der Bestellübersicht (Cart & Checkout) |
| `ExperimentalOrderShippingPackages` | Bei den Versandpaketen |
| `ExperimentalDiscountsMeta` | Beim Gutschein-/Rabattbereich |

### Block vs. Slot/Fill – wann was?

| | Eigener Block | Slot/Fill |
|---|---|---|
| Position | Frei wählbar über `parent` | An vordefinierten Slots |
| Betreiber muss platzieren? | Ja, im Block-Editor | Nein, erscheint automatisch |
| Konfigurierbar? | Ja (Editor-UI) | Nein |
| Gut für | UI mit Eingabe (Checkbox, Select) | Automatische Anzeige-Elemente |

---

## 7. Mechanismus C: Checkout-Filter

> **In einem Satz:** Vorhandene Werte im Checkout (Produktnamen, Preise, Labels) abfangen und verändern – ohne eigenes UI.

```jsx
import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

// Produktname im Checkout anpassen
registerCheckoutFilters( 'mein-plugin', {
    itemName: ( name ) => `${ name } ✓`,
} );
```

> **Hinweis zur API-Stabilität:** Ältere Dokumentation verwendet `__experimentalRegisterCheckoutFilters`. Die stabile aktuelle API heißt `registerCheckoutFilters` (ohne `__experimental`-Präfix).

Filterbare Werte: `itemName`, `subtotalPriceFormat`, `cartItemPrice`, `coupons` u.a.

**Payment-Method-Callbacks** ermöglichen das dynamische Ein-/Ausblenden von Zahlungsarten:

```jsx
registerPaymentMethodExtensionCallbacks( 'mein-plugin', {
    cod: ( arg ) => arg.billingData.city !== 'Berlin', // Nachnahme außerhalb Berlins
} );
```

---

## 8. Mechanismus D: Additional Checkout Fields (nur PHP)

> **In einem Satz:** Für einfache Standard-Felder (Checkbox, Text, Select) gibt es eine rein serverseitige PHP-API – kein React, kein Build-Schritt nötig.

```php
add_action( 'woocommerce_init', function () {
    if ( ! function_exists( 'woocommerce_register_additional_checkout_field' ) ) {
        return;
    }

    woocommerce_register_additional_checkout_field( array(
        'id'       => 'mein-plugin/liefer-hinweis',
        'label'    => 'Hinweis für die Lieferung',
        'location' => 'order',   // contact | address | order
        'type'     => 'text',    // text | checkbox | select
    ) );
} );
```

Diese Felder erscheinen automatisch an der richtigen Stelle und werden automatisch in der Bestellung gespeichert.

**Sanitierung und Validierung per PHP:**

```php
// Wert bereinigen bevor er gespeichert wird
add_action( 'woocommerce_sanitize_additional_field',
    function ( $value, $key ) {
        if ( 'mein-plugin/liefer-hinweis' === $key ) {
            return sanitize_text_field( $value );
        }
        return $value;
    }, 10, 2
);

// Bestellung ablehnen bei ungültigem Wert
add_action( 'woocommerce_blocks_validate_location_order_fields',
    function ( \WP_Error $errors, $fields ) {
        if ( isset( $fields['mein-plugin/liefer-hinweis'] )
            && strlen( $fields['mein-plugin/liefer-hinweis'] ) > 100 ) {
            $errors->add( 'zu_lang', 'Bitte kürzer als 100 Zeichen.' );
        }
    }, 10, 2
);
```

> **Entscheidungshilfe:** Für einfache Felder → PHP-API. Für komplexes UI mit Vorschau, Abhängigkeiten, eigener Logik → eigener Block (Mechanismus A).

---

## 9. Die PHP-Integrationsklasse: Wie alles zusammenkommt

Die Integrationsklasse ist der Klebstoff zwischen PHP und dem JavaScript-Frontend. Sie teilt WooCommerce mit, welche Scripts geladen werden sollen und welche Daten vom Server ins JS übertragen werden.

```php
// mein-plugin-blocks-integration.php
use Automattic\WooCommerce\Blocks\Integrations\IntegrationInterface;

class MeinPlugin_Blocks_Integration implements IntegrationInterface {

    public function get_name() {
        return 'mein-plugin'; // muss eindeutig und konsistent sein
    }

    public function initialize() {
        // Scripts registrieren (siehe unten)
        $this->register_frontend_script();
        $this->register_editor_script();
    }

    // Welche Scripts sollen Kunden im Shop sehen?
    public function get_script_handles() {
        return array( 'mein-plugin-newsletter-block-frontend' );
    }

    // Welche Scripts sollen im Gutenberg-Editor geladen werden?
    public function get_editor_script_handles() {
        return array( 'mein-plugin-newsletter-block-editor' );
    }

    // PHP-Daten an den JS-Block übergeben
    public function get_script_data() {
        return array(
            'optInDefaultText' => __( 'Ja, ich möchte den Newsletter.', 'mein-plugin' ),
        );
    }

    private function register_frontend_script() {
        $script_path  = '/build/mein-plugin-newsletter-block-frontend.js';
        $asset_path   = dirname( __FILE__ ) . '/build/mein-plugin-newsletter-block-frontend.asset.php';
        $script_asset = file_exists( $asset_path ) ? require $asset_path : array( 'dependencies' => array(), 'version' => '1.0' );

        wp_register_script(
            'mein-plugin-newsletter-block-frontend',
            plugins_url( $script_path, __FILE__ ),
            $script_asset['dependencies'],
            $script_asset['version'],
            true
        );
    }

    // register_editor_script analog aufgebaut
}
```

**Registrierung der Integrationsklasse:**

```php
// mein-plugin.php
add_action( 'woocommerce_blocks_loaded', function () {
    require_once __DIR__ . '/mein-plugin-blocks-integration.php';

    // Im Warenkorb-Block registrieren
    add_action( 'woocommerce_blocks_cart_block_registration',
        fn( $registry ) => $registry->register( new MeinPlugin_Blocks_Integration() )
    );

    // Im Checkout-Block registrieren
    add_action( 'woocommerce_blocks_checkout_block_registration',
        fn( $registry ) => $registry->register( new MeinPlugin_Blocks_Integration() )
    );
} );
```

**Die Server→Client-Datenbrücke:**
- PHP: `get_script_data()` gibt ein Array zurück
- JS: `getSetting( 'mein-plugin_data' )` liest es aus (Schlüssel = `<get_name()>_data`)

---

## 10. Der Build-Prozess

WooCommerce-Blöcke brauchen einen Build-Schritt, weil JSX und moderne JS-Syntax vom Browser nicht direkt verstanden werden.

- `src/` enthält den lesbaren Quellcode (JSX, SCSS)
- `npm run build` erzeugt `build/` mit:
  - kompiliertem JS
  - einer `*.asset.php` pro Datei (enthält Dependencies und Version)
  - kompiliertem CSS

Das `@woocommerce/dependency-extraction-webpack-plugin` sorgt dafür, dass `@wordpress/*`- und `@woocommerce/*`-Pakete **nicht** ins Bundle gepackt werden, sondern als WordPress-Dependencies referenziert werden. Deshalb stehen sie korrekt in der `.asset.php`.

> **Wichtig:** Die `.asset.php` muss denselben Namen wie die zugehörige `.js`-Datei haben:
> ```
> build/mein-plugin-newsletter-block-frontend.js
> build/mein-plugin-newsletter-block-frontend.asset.php  ← gleicher Name, andere Endung
> ```

---

## 11. Spickzettel: Welcher Mechanismus wofür?

| Ziel | Lösung |
|---|---|
| Eingabe-UI im Checkout (Checkbox, Select) | Eigener Block – `registerCheckoutBlock` + `parent` |
| Einfaches Feld ohne eigenes UI | Additional Checkout Field (PHP, `woocommerce_register_additional_checkout_field`) |
| Automatische Anzeige ohne Betreiber-Platzierung | Slot/Fill (`ExperimentalOrderMeta` + `registerPlugin`) |
| Texte/Preise/Labels anpassen | Checkout-Filter (`registerCheckoutFilters`) |
| Zahlungsarten ein-/ausblenden | `registerPaymentMethodExtensionCallbacks` |
| PHP-Daten ins JS | `get_script_data()` (PHP) ↔ `getSetting()` (JS) |
| Kundeneingabe in die Bestellung | `setExtensionData()` (JS) ↔ `woocommerce_store_api_checkout_update_order_from_request` (PHP) |

**Wichtige Imports:**

| Import | Paket |
|---|---|
| `registerBlockType` | `@wordpress/blocks` |
| `registerCheckoutBlock` | `@woocommerce/blocks-checkout` |
| `registerCheckoutFilters` | `@woocommerce/blocks-checkout` |
| `registerPlugin` | `@wordpress/plugins` |
| `ExperimentalOrderMeta` | `@woocommerce/blocks-checkout` |
| `getSetting` | `@woocommerce/settings` |
| `useSelect`, `useDispatch` | `@wordpress/data` |
| `IntegrationInterface` | `Automattic\WooCommerce\Blocks\Integrations` (PHP) |

---

## 12. Praxis: Zwei eigene Blöcke parallel im Checkout

Sobald man mehrere eigene Blöcke (z.B. Newsletter-Checkbox **und** Grußkarte) gleichzeitig betreibt, gibt es spezifische Fallstricke.

### 12.1 Jeder Block braucht zwei Registrierungen

| Registrierung | Wo | Aufgabe |
|---|---|---|
| `register_block_type_from_metadata()` | `init`-Hook in der Haupt-PHP-Datei | Block im Editor bekannt machen |
| Integration-Klasse | `woocommerce_blocks_loaded` | Frontend- und Editor-Scripts laden |

Fehlt ein Block in nur einer dieser Registrierungen, lädt er entweder nur im Editor oder nur im Frontend – klassisches Symptom: „im Editor sichtbar, beim Kunden unsichtbar".

### 12.2 `.asset.php`-Pfade müssen exakt stimmen

Der häufigste Fehler: Der Pfad zur `.asset.php` in `wp_register_script` zeigt auf eine nicht existierende Datei. Dann greift der Fallback mit leeren `dependencies`, `wc-blocks-checkout` fehlt als Abhängigkeit, und `registerCheckoutBlock` ist `undefined` → der Block rendert still nichts.

Verifizierte Namenskonvention:
```
build/woo-order-ext-checkout-greeting-card-block-frontend.js
build/woo-order-ext-checkout-greeting-card-block-frontend.asset.php
```
Name der `.asset.php` = exakt gleich wie die `.js`-Datei.

### 12.3 `parent` muss ein existierender Block sein

Ein falscher oder nicht existierender Parent-Block-Name führt dazu, dass der Block im Editor nirgendwo andockbar ist. Verifiziert funktioniert für eigene Zusatz-Blöcke:

```json
"parent": [ "woocommerce/checkout-additional-information-block" ]
```

### 12.4 `save` gibt `null` zurück – immer

```javascript
export const Save = () => null;
```

Gibt `save` Markup zurück, entstehen Block-Validierungsfehler im Editor.

### 12.5 Keinen Block in der Wurzel-`src/index.js` importieren

Eigene Blöcke haben eigene Webpack-Entry-Points. Ein zusätzlicher Import in `src/index.js` führt zu doppelter Registrierung (Konsolenwarnung: „Block is already registered"). Die `index.js` ist nur für Filter/Slot-Fill.

### 12.6 Inner-Block-Liste im Editor (`editor.js`)

Damit eigene Blöcke im Editor als auswählbare Inner-Blocks erscheinen:

```javascript
import { registerCheckoutFilters } from '@woocommerce/blocks-checkout';

registerCheckoutFilters( 'woo-order-ext', {
    additionalCartCheckoutInnerBlockTypes: ( value, { block } ) => {
        if ( block === 'woocommerce/checkout-additional-information-block' ) {
            return [
                ...value,
                'woo-order-ext/checkout-greeting-card',
                'woo-order-ext/checkout-newsletter-subscription',
            ];
        }
        return value;
    },
} );
```

Die Block-Namen müssen exakt den `name`-Feldern der jeweiligen `block.json` entsprechen.

### 12.7 Checkliste: neuen Block hinzufügen

1. Ordner `src/js/<block>/` mit `block.json`, `index.js`, `edit.js`, `frontend.js`, `block.js`
2. `block.json`: korrekter `name`, existierender `parent`
3. Webpack-Entry-Point für `<block>` und `<block>-frontend` ergänzen
4. `npm run build` → prüfen, dass JS **und** gleichnamige `.asset.php` in `build/` liegen
5. `init`-Hook: `register_block_type_from_metadata()` ergänzen
6. Integration `initialize()`: `register_*_frontend_scripts()` + `register_*_editor_scripts()` mit exakten Pfaden
7. `get_script_handles()` + `get_editor_script_handles()`: Handle ergänzen
8. `editor.js`: Block-Name in Inner-Block-Liste aufnehmen
9. Testen: Block im Editor platzierbar? Rendert er beim Kunden?

---

## 13. Datenfluss: Editor → Block.json → Frontend

> **Die häufigste Verwirrung:** Wie kommen Einstellungen, die der Betreiber im Editor vornimmt, in die Kunden-Ansicht?

### 13.1 Der Unterschied zum normalen WordPress-Block

Ein **normaler** WordPress-Block:
- `edit` → Editor-Ansicht
- `save` → speichert HTML in die Datenbank → erscheint im Frontend

Ein **WooCommerce-Checkout-Block**:
- `edit` → Editor-Ansicht (gleich)
- `save` → gibt `null` zurück (kein gespeichertes HTML)
- `block.js` → rendert die Kunden-Ansicht zur Laufzeit als React-Komponente

### 13.2 Die Datenbrücke: `attributes`

Damit ein im Editor eingestellter Wert das Frontend erreicht:

1. Betreiber ändert Wert im Editor → `setAttributes()` wird aufgerufen
2. WordPress speichert den Wert als `data-*`-Attribut am Block-Element
3. WooCommerce liest das Attribut und reicht es als Prop an `block.js` weiter

```
block.json (attributes) → edit.js (setAttributes) → gespeichert → block.js (attributes-Prop)
```

**`save` ist an diesem Fluss nicht beteiligt.** Deshalb gibt es `null` zurück.

### 13.3 Beispiel: Konfigurierbarer Titel

`block.json`:
```json
"attributes": {
    "cardTitle": {
        "type": "string",
        "default": "Schreibe deine Grußkarte"
    }
}
```

`edit.js` (Betreiber stellt ein):
```javascript
export const Edit = ( { attributes, setAttributes } ) => {
    return (
        <RichText
            value={ attributes.cardTitle }
            onChange={ ( val ) => setAttributes( { cardTitle: val } ) }
        />
    );
};
```

`block.js` (Kunde sieht):
```javascript
const Block = ( { attributes } ) => {
    return <h3>{ attributes.cardTitle }</h3>; // kommt direkt aus dem Editor
};
```

### 13.4 `attributes` vs. `setExtensionData` – nicht verwechseln

| | Richtung | Zweck |
|---|---|---|
| `attributes` (block.json) | Betreiber → Frontend | **Konfiguration** (Labels, Defaults) |
| `setExtensionData` | Kunde → Bestellung | **Kundeneingabe** (Newsletter-Opt-in, Grußtext) |

### 13.5 Häufige Fehler

- **Wert im Frontend `undefined`:** Attribut-Name in `block.json`, `edit.js` und `block.js` stimmt nicht überein
- **„Block validation failed":** `save` gibt Markup statt `null` zurück
- **Editor-Komponenten im Frontend:** `RichText`, `useBlockProps` usw. gehören nur in `edit.js`, nicht in `block.js`

---

## 14. Kundeneingaben in der Bestellung speichern

Dieser Abschnitt erklärt den kompletten Weg von `setExtensionData` im Browser bis zum gespeicherten Order-Meta-Wert auf dem Server.

### 14.1 Was `setExtensionData` auslöst

`setExtensionData( 'mein-plugin', 'newsletter_optin', true )` legt den Wert im Checkout-State ab. Beim Absenden erscheint er automatisch im Store-API-Request:

```json
{
  "extensions": {
    "mein-plugin": {
      "newsletter_optin": true
    }
  }
}
```

Auf JS-Seite ist nichts weiter nötig als dieser Aufruf.

### 14.2 Schritt 1 – Schema registrieren (Pflicht)

Ohne diesen Schritt filtert WooCommerce die Extension-Daten aus dem Request, bevor der PHP-Hook sie sehen kann. `$request->get_param('extensions')` wäre dann leer, egal was das JS sendet.

```php
add_action( 'woocommerce_blocks_loaded', function () {
    woocommerce_store_api_register_endpoint_data( array(
        'endpoint'        => \Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema::IDENTIFIER,
        'namespace'       => 'mein-plugin',   // exakt wie 1. Arg von setExtensionData
        'schema_callback' => function () {
            return array(
                'newsletter_optin' => array(  // exakt wie 2. Arg von setExtensionData
                    'description' => 'Newsletter opt-in',
                    'type'        => 'boolean',
                    'context'     => array( 'view', 'edit' ),
                    'readonly'    => false,
                ),
            );
        },
        'schema_type' => ARRAY_A,
    ) );
} );
```

Mehrere Felder (z.B. `newsletter_optin` und `greeting`) können im selben Schema-Array registriert werden, solange sie denselben Namespace teilen.

### 14.3 Schritt 2 – Wert in Order-Meta speichern

```php
add_action(
    'woocommerce_store_api_checkout_update_order_from_request',
    function ( $order, $request ) {
        $extensions = $request->get_param( 'extensions' );
        $data       = $extensions['mein-plugin'] ?? array();

        if ( isset( $data['newsletter_optin'] ) ) {
            // Boolean als String speichern – PHP false wird in WP-Meta sonst zu ''
            $optin = $data['newsletter_optin'] ? '1' : '0';
            $order->update_meta_data( 'mein_plugin_newsletter_optin', $optin );
            $order->save();
        }
    },
    10,
    2
);
```

> **Wichtig:** `$request['extensions']` funktioniert auch, aber `$request->get_param('extensions')` ist der korrekte REST-API-Weg.

### 14.4 Schritt 3 – Wert anzeigen

**Auf der Danke-Seite und in Bestelldetails:**

```php
add_action(
    'woocommerce_order_details_after_order_table',
    function ( $order ) {
        $val = $order->get_meta( 'mein_plugin_newsletter_optin' );
        if ( $val === '' ) return; // nicht gesetzt

        echo '<p><strong>Newsletter:</strong> ';
        echo $val === '1'
            ? esc_html__( 'Abonniert', 'mein-plugin' )
            : esc_html__( 'Nicht abonniert', 'mein-plugin' );
        echo '</p>';
    }
);
```

**In Bestell-E-Mails:**

```php
add_action(
    'woocommerce_email_order_meta',
    function ( $order, $sent_to_admin, $plain_text, $email ) {
        $val = $order->get_meta( 'mein_plugin_newsletter_optin' );
        if ( $val === '' ) return;

        $label = $val === '1' ? 'Newsletter: Ja' : 'Newsletter: Nein';
        echo $plain_text ? "\n$label\n" : "<p><strong>$label</strong></p>";
    },
    10,
    4
);
```

**Analoge Hooks für weitere Ansichten:**

| Hook | Ansicht |
|---|---|
| `woocommerce_order_details_after_order_table` | Danke-Seite + Konto-Bestelldetails |
| `woocommerce_email_order_meta` | Bestell-E-Mails (Kunde + Admin) |
| `woocommerce_admin_order_data_after_billing_address` | Admin-Bestelldetails |

### 14.5 Serverseitige Validierung

Bestellung ablehnen, wenn ein Wert nicht stimmt – die Fehlermeldung erscheint dem Kunden im Checkout:

```php
add_action(
    'woocommerce_store_api_checkout_update_order_from_request',
    function ( $order, $request ) {
        $data = $request->get_param( 'extensions' )['mein-plugin'] ?? array();

        // Validierung VOR dem Speichern
        if ( isset( $data['greeting'] ) && mb_strlen( $data['greeting'] ) > 200 ) {
            throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException(
                'mein_plugin_greeting_too_long',
                __( 'Grußtext darf höchstens 200 Zeichen haben.', 'mein-plugin' ),
                400
            );
        }

        // Dann speichern
        if ( ! empty( $data['greeting'] ) ) {
            $order->update_meta_data( '_mein_plugin_greeting', sanitize_textarea_field( $data['greeting'] ) );
            $order->save();
        }
    },
    10,
    2
);
```

### 14.6 Wann `extensionCartUpdate` statt `setExtensionData`?

`setExtensionData` speichert Daten nur mit der **Bestellung**. Wenn der Wert stattdessen den **Warenkorb** verändern soll (Gebühr hinzufügen, Versandoptionen ändern), braucht man `extensionCartUpdate`:

1. JS ruft `extensionCartUpdate( { namespace, data } )` auf → trifft `cart/extensions`-Endpoint
2. Eine per `woocommerce_store_api_register_update_callback` registrierte PHP-Funktion ändert den Cart
3. Der aktualisierte Cart kommt zurück, der Block rendert neu

Für reine Text-/Checkbox-Eingaben ohne Preiseinfluss ist `setExtensionData` der richtige Weg.

### 14.7 Der vollständige Datenfluss

```
Editor (edit.js)
   └─ setAttributes('cardTitle')              → Konfiguration durch Betreiber
        ↓ (block.json attributes)
Frontend (block.js)
   ├─ liest attributes.cardTitle             → zeigt Titel an
   └─ setExtensionData('mein-plugin', 'newsletter_optin', true)
        ↓ (Store API Request: extensions)
Server – Schema (woocommerce_blocks_loaded)
   └─ woocommerce_store_api_register_endpoint_data()   ← PFLICHT
        ↓ (Daten passieren den Filter)
Server – Speichern (woocommerce_store_api_checkout_update_order_from_request)
   ├─ $request->get_param('extensions')      ← nicht $_POST
   └─ $order->update_meta_data('...', '1')   ← String statt bool
        ↓
Order-Meta gespeichert
   └─ woocommerce_order_details_after_order_table → Anzeige auf Danke-Seite
```

### 14.8 Stolpersteine

- **Daten kommen nie an:** Schema nicht registriert (14.2) oder Namespace/Key stimmt nicht mit `setExtensionData` überein
- **Falscher Hook:** `woocommerce_store_api_checkout_order_processed` hat kein `$request` – immer `update_order_from_request` verwenden
- **`$_POST` ist leer:** Blocks-Checkout sendet JSON, nicht Formulardaten
- **Wert `false` verschwindet:** PHP `false` in WP-Meta wird zu `''` – immer `'1'`/`'0'` als Strings speichern
- **Kein `sanitize_*`:** Kundeneingaben immer bereinigen und bei Ausgabe mit `esc_html()` escapen

---

## 15. Debugging-Referenz: Extension-Daten (WC 10.8.1)

Dieser Abschnitt ist für den Fall, dass Daten nicht ankommen – als geordnete Checkliste zum Durchgehen.

### 15.1 Schnell-Check: kommen die Daten an?

Debug-Logging temporär einfügen:

```php
add_action(
    'woocommerce_store_api_checkout_update_order_from_request',
    function ( $order, $request ) {
        error_log( '[debug] extensions: ' . print_r( $request->get_param( 'extensions' ), true ) );
    },
    5, 2
);
```

- **Leer / `null`** → Schema nicht registriert (→ 15.3)
- **Namespace fehlt** → Namespace in PHP und JS stimmt nicht überein
- **Feld fehlt** → Key in PHP und JS stimmt nicht überein

Das Log landet unter: `logs/php/error.log` (lokale Entwicklungsumgebung) oder im WordPress-Debug-Log.

### 15.2 `$_POST` ist beim Blocks-Checkout immer leer

**Ursache:** Blocks-Checkout sendet als JSON-Body, nicht als HTML-Formular.

**Fix:** Immer `$request->get_param('extensions')` verwenden, nie `$_POST['extensions']`.

### 15.3 Ohne Schema-Registrierung werden Daten gefiltert

WooCommerce lässt keine unbekannten Extension-Daten durch. Ohne `woocommerce_store_api_register_endpoint_data` ist `extensions` im Hook immer leer, egal was das JS sendet.

Die Registrierung muss innerhalb von `woocommerce_blocks_loaded` stattfinden (nicht auf Top-Level), weil die Store-API-Klassen sonst noch nicht geladen sind.

### 15.4 `woocommerce_store_api_checkout_order_processed` hat kein `$request`

| Hook | Parameter | Für was |
|---|---|---|
| `woocommerce_store_api_checkout_update_order_from_request` | `$order`, `$request` | Extension-Daten lesen und speichern ✓ |
| `woocommerce_store_api_checkout_order_processed` | nur `$order` | Nachverarbeitung nach dem Speichern |

### 15.5 Boolean `false` in WP-Meta wird zu `''`

`$order->update_meta_data('optin', false)` → `$order->get_meta('optin')` gibt `''` zurück.

Das ist ununterscheidbar von „nicht gesetzt". Lösung: `'1'`/`'0'` als Strings speichern.

### 15.6 `woocommerce_order_details_after_order_table` feuert auch in Block-Templates

Mit WooCommerce 10.x und einem Block-Theme (z.B. Twenty Twenty-Five) wird die Danke-Seite über das **Order Confirmation Block-Template** gerendert. Klassische PHP-Hooks wie `woocommerce_thankyou` feuern dort nicht mehr direkt.

`woocommerce_order_details_after_order_table` jedoch schon – er wird explizit in `src/Blocks/BlockTypes/OrderConfirmation/Totals.php` aufgerufen. Dieser Hook funktioniert sicher in klassischen und block-basierten Themes.
