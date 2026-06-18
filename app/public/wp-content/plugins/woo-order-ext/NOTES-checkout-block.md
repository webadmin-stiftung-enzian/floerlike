# Übergabe-Notizen: Greeting-Card Custom Block im WooCommerce Block-Checkout

Ziel: Den Custom Block `woo-order-ext/checkout-greeting-card` ans **Ende des
Checkouts** bringen. Vorerst soll er nur ein `<div>`-Platzhalter ausgeben
(Grußkarten-Logik kommt später). Newsletter-Opt-in läuft separat über die
Additional Checkout Fields API (PHP-only) und ist nicht Teil dieser Aufgabe.

## Projektkontext

- WordPress-Plugin "Woo Order Ext", erweitert den WooCommerce Blocks-Checkout
- Build via `@wordpress/scripts` (Webpack) mit **manuellen Entry-Points**
- Build-Output liegt unter `build/`, die kopierten `block.json` unter
  `build/js/<block-ordner>/block.json`
- `blocks-manifest.php` wird erzeugt (Build läuft mit `--blocks-manifest`)

## Verifiziertes Build-Layout

Im `build/`-Ordner liegen u.a. (Namen exakt so):

```
woo-order-ext-checkout-greeting-card-block.js
woo-order-ext-checkout-greeting-card-block.asset.php
woo-order-ext-checkout-greeting-card-block-frontend.js
woo-order-ext-checkout-greeting-card-block-frontend.asset.php
woo-order-ext-checkout-newsletter-subscription-block-frontend.js
woo-order-ext-checkout-newsletter-subscription-block-frontend.asset.php
build/js/checkout-add-greetincard-block/block.json
build/js/checkout-newsletter-subscription-block/block.json
```

Wichtig: Die `.asset.php`-Dateien heißen **identisch zum jeweiligen Bundle**.

## Die 3 Kernfehler, die den Block verhindern

1. **Falscher `parent`** in der Greeting-Card `block.json`
   (`checkout-additional-delivery-block` existiert nicht als Einhängepunkt).
2. **`registerCheckoutBlock` fehlt** in der `frontend.js` → im Frontend rendert
   nichts.
3. **Falsche `.asset.php`-Pfade in der PHP** → Code fällt in den Fallback mit
   leeren `dependencies`, dadurch lädt das Frontend-Script ohne
   `wc-blocks-checkout` und `registerCheckoutBlock` ist undefined.

## Fix 1 — src/js/checkout-add-greetincard-block/block.json

`parent`-Zeile ändern auf:

```json
"parent": [ "woocommerce/checkout-additional-information-block" ],
```

## Fix 2 — src/js/checkout-add-greetincard-block/frontend.js

Kompletter Inhalt (ruft registerCheckoutBlock auf):

```javascript
import { registerCheckoutBlock } from '@woocommerce/blocks-checkout';
import metadata from './block.json';

const Block = () => {
	return (
		<div className="wp-block-woo-order-ext-checkout-greeting-card">
			Greeting Card Block – Frontend Platzhalter
		</div>
	);
};

registerCheckoutBlock( {
	metadata,
	component: Block,
} );
```

## Fix 3 — src/js/checkout-add-greetincard-block/edit.js

```javascript
import { useBlockProps } from '@wordpress/block-editor';

export const Edit = () => {
	const blockProps = useBlockProps();
	return (
		<div { ...blockProps }>
			Greeting Card Block – Editor Platzhalter
		</div>
	);
};

export const Save = () => {
	return null; // dynamischer Block, Frontend rendert via registerCheckoutBlock
};
```

Die zugehörige `index.js` registriert nur den Block-Type:

```javascript
import { registerBlockType } from '@wordpress/blocks';
import { Edit, Save } from './edit';
import metadata from './block.json';

registerBlockType( metadata, {
	edit: Edit,
	save: Save,
} );
```

## Fix 4 — woo-order-ext-blocks-integration.php

Falsche `.asset.php`-Pfade korrigieren.

In `register_greeting_card_block_frontend_scripts()`:

```php
$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-greeting-card-block-frontend.asset.php';
```
(vorher fälschlich: `greeting-card-block-frontend.asset.php`)

In `register_newsletter_block_frontend_scripts()`:

```php
$script_asset_path = dirname(__FILE__) . '/build/woo-order-ext-checkout-newsletter-subscription-block-frontend.asset.php';
```
(vorher fälschlich: `newsletter-block-frontend.asset.php`)

Kleiner Zusatz (unkritisch): In den Editor-Script-Methoden wird im Fallback
`$this->get_file_version($script_asset_path)` statt `$script_path` übergeben.
Bei Gelegenheit auf `$script_path` korrigieren.

## Nicht ändern

- Wurzel-`src/index.js`: Greeting-Card NICHT zusätzlich importieren. Der Block
  hat eigene Webpack-Entry-Points und wird über PHP geladen. Ein Import hier
  würde ihn doppelt registrieren.

## Danach

```bash
npm run build
```

Dann Checkout-Seite im Block-Editor öffnen. Der Block sollte im Bereich
"Additional information" (Default = letzter Schritt) erscheinen. Falls nicht
automatisch platziert: einmal per List-View dorthin ziehen.

Optional für automatische, feste Platzierung: in der `block.json` das `lock`-
Attribut mit `"remove": false, "move": false` nutzen.

## Nächster Schritt (späterer Chat)

Sobald der `<div>` steht: Grußkarten-Auswahl + Grußtext-Eingabe im Block
implementieren, Wert über die Store API / `extensionCartUpdate` speichern.
