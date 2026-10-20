# Spezifikation v4: Grusskarten-Kauf als Multi-Block-Plugin

**Status:** umgesetzt in Plugin 0.4.0 (Rahmenblock nach dem Vorbild der Abfrage-Schleife, Stufen 1–9 auf dem Branch `feature/multi-block`). Getroffene Entscheidungen in [Kapitel 14](#14-entscheidungen).
**Ausgangsstand:** Plugin 0.3.0 mit einem einzigen Block `greeting-card-block/greeting-card-bundle` (siehe [ARCHITEKTUR.md](ARCHITEKTUR.md)).

---

## 1. Ziel und Empfehlung

### Ziel

Der heutige Block erledigt fünf Aufgaben auf einmal und lässt sich im Site Editor nur als Ganzes verschieben. Künftig ist jede Aufgabe ein eigener Block, und alle zusammen stecken in einem **Rahmenblock „Grusskarten-Kauf“**, der sich verhält wie die Abfrage-Schleife von WordPress:

- **Einfügen** des Rahmens legt automatisch alle nötigen Blöcke an.
- Innerhalb des Rahmens lassen sie sich **frei umsortieren**, und **beliebige Standard-Blöcke** – auch Gruppen und Spalten – dürfen dazwischen stehen. Der Rahmen wird damit zum frei gestaltbaren Kaufbereich, in den auch z. B. der Preis-Block passt.
- Fehlt ein **wesentlicher Block** (z. B. versehentlich gelöscht), werden die betroffenen Blöcke im Editor **ausgegraut** und ein Hinweis bietet „Wiederherstellen“ an. Auf der Seite verhalten sich die Blöcke dann sicher (Kapitel 5).

| # | Block | Aufgabe |
|---|---|---|
| R | **Grusskarten-Kauf** (Rahmen) | Hält den Satz zusammen, prüft Vollständigkeit |
| 1 | **Variantenauswahl** | Grösse o. Ä. wählen; der Preis-Block springt mit |
| 2 | **Grusskarte hinzufügen** | Checkbox „Möchten Sie eine Grusskarte hinzufügen?“ |
| 3 | **Grusskarten-Auswahl** | Slider mit den Karten, einstellbar wie viele gleichzeitig sichtbar |
| 4 | **Grusstext** | Textfeld für die Nachricht |
| 5 | **In den Warenkorb** | Knopf, prüft alles und legt Produkt (+ Karte) in den Warenkorb |

### Warum alle fünf in den Rahmen gehören

Die Grusskarte funktioniert nur zusammen mit **unserem** Warenkorb-Knopf: Der Knopf von WooCommerce schickt weder die Gruppen-ID noch den Grusstext mit – die Karte hinge nicht am Strauss und hätte keinen Text. Bei variablen Produkten braucht unser Knopf ausserdem **unsere** Variantenauswahl. Ein vollständiger Satz besteht also aus allen fünf Blöcken.

### Empfehlung: ja, umsetzen

**Dafür spricht:**
- Bequemes Einfügen wie bei der Abfrage-Schleife; trotzdem freie Gestaltung im Rahmen.
- **Zuverlässige Vollständigkeitsprüfung:** Der Rahmen kennt seine Innenblöcke direkt – im Editor wie auf dem Server. Kein Durchsuchen von Templates nötig, keine Unsicherheit durch Template-Parts.
- Kleinere, verständlichere Dateien; eigene Einstellungen pro Block.

**Was es kostet:**
- Mehr Editor-JavaScript im Rahmen (Vollständigkeit beobachten, Ausgrauen, Wiederherstellen).
- Die fünf Blöcke lassen sich **nur innerhalb** des Rahmens einsetzen. Das ist gewollt – ausserhalb könnten sie nicht zusammenarbeiten.

Die Warenkorb-Logik (Gruppen-ID, Mitentfernen, Mengenangleichung, Store-API-Erweiterung, Warenkorb-Darstellung) bleibt **unverändert**.

**Vor dem Start:** den aktuellen Stand committen, Umbau auf eigenem Branch.

---

## 2. Grundprinzip: Rahmen mit Innenblöcken

### 2.1 Vorbild Abfrage-Schleife

Die Abfrage-Schleife (`core/query`) ist ein Rahmenblock mit **Innenblöcken**. Beim Einfügen legt er eine **Vorlage** an (`InnerBlocks` mit `template`). Seine Innenblöcke (z. B. Beitragsvorlage, Seitenzahlen) dürfen laut ihrer `block.json` nur unterhalb des Rahmens stehen. Genau dieses Muster übernehmen wir.

### 2.2 `ancestor` statt `parent`

Damit die fünf Blöcke auch **in Gruppen und Spalten innerhalb** des Rahmens stehen dürfen, bekommen sie in ihrer `block.json`:

```json
"ancestor": [ "greeting-card-block/card-purchase" ]
```

`ancestor` erlaubt einen Block an **jeder Stelle unterhalb** des Rahmens (WordPress-Core, `class-wp-block-type.php`: „available only inside the specified block types at any position of the ancestor's block subtree“). `parent` würde nur direkte Kinder erlauben – Gruppen dazwischen wären dann unmöglich.

### 2.3 Gemeinsamer Zustand

Alle Blöcke tragen `data-wp-interactive="greeting-card-bundle"` und teilen sich damit **einen** Interactivity-Store – unabhängig davon, wie tief sie in Gruppen verschachtelt sind. Klickt man in Block 1 auf „mittel“, sieht Block 5 die Änderung sofort. Details in Kapitel 4.

---

## 3. Die Blöcke im Überblick

### 3.1 Rahmen `greeting-card-block/card-purchase` — „Grusskarten-Kauf“

| Eigenschaft | Wert |
|---|---|
| Innenblöcke | **beliebige Blöcke erlaubt** (kein `allowedBlocks`), inkl. Gruppen, Spalten, WooCommerce-Blöcke |
| Vorlage beim Einfügen | 1 Variantenauswahl, 2 Grusskarte hinzufügen, 3 Grusskarten-Auswahl, 4 Grusstext, 5 In den Warenkorb |
| `templateLock` | `false` – frei umsortieren, einfügen, löschen |
| `supports.multiple` | `false` – höchstens ein Rahmen pro Seite |
| `usesContext` | `["postId"]` – das Produkt der Seite |
| Ausgabe | ein Wrapper-`div` um den Inhalt, oder **nichts** (Kapitel 5) |

### 3.2 Die fünf Innenblöcke

Gemeinsam für alle:
- `"ancestor": [ "greeting-card-block/card-purchase" ]`
- `"usesContext": ["postId"]`
- `"supports": { "multiple": false, "interactivity": true, "html": false }`
- Rendern nichts, wenn das Produkt weder einfach noch variabel ist (`gcb_handles_product()`, unverändert).

| Block-Name | Titel | wesentlich für |
|---|---|---|
| `greeting-card-block/variant-selector` | Variantenauswahl | Kauf **variabler** Produkte |
| `greeting-card-block/card-toggle` | Grusskarte hinzufügen | Kartenfunktion |
| `greeting-card-block/card-picker` | Grusskarten-Auswahl | Kartenfunktion |
| `greeting-card-block/card-message` | Grusstext | Kartenfunktion |
| `greeting-card-block/add-to-cart` | In den Warenkorb | **jeden** Kauf |

Alle in einer eigenen Kategorie **„Grusskarte & Kauf“**.

---

## 4. Gemeinsamer Zustand

### 4.1 Auf dem Server: einmal vorbereiten, von allen nutzen

Eine gemeinsame Funktion in `includes/class-state.php`:

```php
gcb_prepare_state( WC_Product $product ): array
```

- Wird von **jedem** Block-`render.php` aufgerufen; arbeitet nur beim ersten Aufruf pro Produkt (statischer Zwischenspeicher).
- Ruft `wp_interactivity_state('greeting-card-bundle', …)` mit allen Daten **und** den PHP-Closures (`isOptionSelected`, `isOptionAvailable` …) auf.
- Lädt die Varianten für den nativen Preis-Block (`wc_interactivity_api_load_variations`, wie heute).

### 4.2 Vollständigkeit wird **vor** den Innenblöcken geprüft

WordPress rendert erst die Innenblöcke und danach den Rahmen. Damit die Innenblöcke trotzdem wissen, ob der Satz vollständig ist, prüft der Rahmen das **vorher**:

- Filter `render_block_data` (läuft, bevor ein Block samt Innenblöcken gerendert wird; WordPress-Core `class-wp-block.php` / `blocks.php`).
- Trifft er auf `greeting-card-block/card-purchase`, durchsucht er dessen **Innenblock-Baum rekursiv** (auch in Gruppen) nach den fünf Blocknamen.
- Ergebnis: `gcb_set_purchase_status( [ 'canPurchase' => bool, 'cardsEnabled' => bool, 'missing' => [...] ] )` – ein statischer Wert für die Innenblöcke und zusätzlich im Interactivity-State.

### 4.3 Im Browser: ein gemeinsames Store-Modul

- **`src/shared/store.js`** – gemeinsame Getter (`matchedVariation`, `variationMissing`, `cardMissing`, `textMissing`, `isValid` …) und die Validierungsregeln. Als **eigenes Skriptmodul** registriert (`wp_register_script_module( 'greeting-card-block/store', … )`).
- **Jede `view.js`** enthält nur, was ihr Block braucht (Swiper nur in der Kartenauswahl).
- Einbindung über `block.json`, geprüft in WordPress-Core (`register_block_script_module_id()`: Angabe ohne `file:` = ID eines registrierten Moduls):

```json
"viewScriptModule": [ "greeting-card-block/store", "file:./view.js" ]
```

### 4.4 Wer liest und schreibt was

| State | geschrieben von | gelesen von |
|---|---|---|
| `productId`, `nonce`, `batchUrl` | Server | 5 |
| `variationSelector` | Server | 1, 5 |
| `selectedAttributes` | 1 | 1, 5, Preis-Block (über `syncNativePrice`) |
| `cards` | Server | 3 |
| `cardsEnabled`, `canPurchase` | Server (Rahmen, 4.2) | 2, 3, 4, 5 |
| `wantsCard` | 2 | 3, 4, 5 |
| `selectedCardId` | 3 | 3, 5 |
| `text` | 4 | 4, 5 |
| `settings.message.maxLength` | Server (aus Block 4) | 4, 5 |
| `submitAttempted`, `isAdding`, `errorMessage` | 5 | 1, 3, 4, 5 |

---

## 5. Vollständigkeit und Verhalten

### 5.1 Was „vollständig“ heisst

| Funktion | braucht |
|---|---|
| **Kauf überhaupt** (`canPurchase`) | Block 5; bei variablen Produkten zusätzlich Block 1 |
| **Grusskarte** (`cardsEnabled`) | `canPurchase` **und** Blöcke 2, 3, 4 **und** das Produkt hat verknüpfte Karten |

Der Rahmen prüft das für **das konkrete Produkt**: Fehlt Block 1, ist das für einfache Produkte egal, für variable nicht. (Im Editor gilt Block 1 trotzdem als wesentlich, weil dasselbe Template für alle Produkte gilt.)

### 5.2 Verhalten auf der Seite

| Situation | Verhalten |
|---|---|
| **alles vollständig** | wie heute. Kartenauswahl und Grusstext erscheinen, wenn die Checkbox angehakt ist. |
| **Karte gewünscht, keine Karte gewählt** | kein Kauf, Fehler „Bitte wählen Sie eine Grusskarte aus.“ |
| **Karte gewünscht, Grusstext leer** | **kein Kauf**, Fehler „Bitte geben Sie einen Grusstext ein.“ Der Grusstext ist immer Pflicht, sobald eine Karte gewünscht ist. |
| **Block 2, 3 oder 4 fehlt** | Kartenfunktion aus: die übrigen Kartenblöcke rendern nichts. Kauf **ohne** Karte bleibt möglich. |
| **Block 5 fehlt** (oder Block 1 bei variablem Produkt) | Der Rahmen rendert **nichts**, und die native WooCommerce-Form wird **nicht** unterdrückt (Kapitel 8). Das Produkt bleibt kaufbar, nur ohne Karte. |

Kund:innen sehen nie ausgegraute, unbedienbare Elemente – auf der Seite fehlt Unvollständiges einfach. Für Redakteur:innen (`edit_theme_options`) zeigt der Rahmen auf der Seite zusätzlich einen dezenten Hinweis, z. B. „Grusskarten sind aus: Block ‚Grusstext‘ fehlt.“

### 5.3 Verhalten im Editor

- Der Rahmen beobachtet seinen Innenblock-Baum (`useSelect` → alle Nachfahren, rekursiv) und ermittelt fehlende Blöcke nach 5.1.
- Fehlt etwas:
  - **Hinweisleiste** oben im Rahmen: „Grusskarten sind deaktiviert: ‚Grusstext‘ fehlt.“ bzw. „Kaufen nicht möglich: ‚In den Warenkorb‘ fehlt.“
  - Knopf **„Wiederherstellen“** fügt die fehlenden Blöcke am Ende des Rahmens wieder ein (`insertBlocks`).
  - Die **betroffenen** Blöcke werden ausgegraut (Klasse am Rahmen, z. B. `is-cards-disabled` / `is-purchase-disabled`, dazu Editor-CSS mit reduzierter Deckkraft). Sie bleiben auswählbar, verschiebbar und löschbar – ausgegraut heisst „wirkt gerade nicht“, nicht „gesperrt“.
- Beim Einfügen eines Innenblocks ausserhalb des Rahmens greift `ancestor`: Der Editor bietet ihn dort gar nicht erst an.

### 5.4 Fehlermeldungen beim Kaufen

Jeder Block zeigt **seine eigenen** Fehler direkt bei sich:

| Block | Meldung | wann |
|---|---|---|
| 1 | „Bitte wählen Sie eine Option.“ | nach Klick auf (5), Auswahl unvollständig |
| 1 | „Diese Auswahl ist leider nicht verfügbar.“ | sofort, wenn ausverkauft/ungültig |
| 3 | „Bitte wählen Sie eine Grusskarte aus.“ | nach Klick auf (5) |
| 4 | „Bitte geben Sie einen Grusstext ein.“ | nach Klick auf (5), wenn eine Karte gewünscht ist |
| 5 | Fehler vom Server (z. B. ausverkauft) | nach dem Request |

Neu: Nach einem Klick auf (5) mit Fehlern scrollt die Seite zum **ersten** Block mit Fehler und setzt den Fokus dorthin – bei frei angeordneten Blöcken sieht man die Meldung sonst womöglich nicht.

---

## 6. Die Blöcke im Einzelnen

Einstellungen = Felder in der rechten Seitenleiste des Editors (`InspectorControls`), gespeichert als Block-Attribute.

### 6.1 Variantenauswahl — `variant-selector`

Je Attribut eine Knopfgruppe (Radio + `label.button.outline`), wie heute; unter dem Wert optional die Variantenbeschreibung.

| Einstellung | Typ | Standard |
|---|---|---|
| Beschreibung in den Knöpfen anzeigen | Schalter | an |
| Eigene Preiszeile anzeigen | Schalter | aus (nur nötig, falls der native Preis-Block fehlt) |

**Verantwortlich für:** `selectedAttributes`, Vorauswahl der Standardwerte, `syncNativePrice`.

### 6.2 Grusskarte hinzufügen — `card-toggle`

| Einstellung | Typ | Standard |
|---|---|---|
| Beschriftung | Text | leer → „Bundle-sells title“ des Produkts → „Möchten Sie eine Grusskarte hinzufügen?“ |

**Verantwortlich für:** `wantsCard`. **Rendert nichts**, wenn `cardsEnabled` falsch ist.

### 6.3 Grusskarten-Auswahl — `card-picker`

Slider mit Theme-Klasse `.slider` (main.css „SLIDER“), Karten als `label.button.outline.tile` mit Radio.

| Einstellung | Typ | Standard |
|---|---|---|
| Sichtbare Karten gleichzeitig (Desktop) | Zahl 1–6 | 1 |
| Sichtbare Karten gleichzeitig (Mobil, < 600px) | Zahl 1–3 | 1 |
| Preis anzeigen | Schalter | an |
| Pfeile anzeigen / Punkte anzeigen | Schalter | an / aus |

Die Werte gehen als Swiper-Optionen (`slidesPerView`, `breakpoints`) in den Context des Blocks. Angeboten werden immer **alle** verknüpften Karten.

**Sichtbar:** wenn `cardsEnabled` und `wantsCard`. **Verantwortlich für:** `selectedCardId`.

### 6.4 Grusstext — `card-message`

| Einstellung | Typ | Standard |
|---|---|---|
| Beschriftung | Text | „Nachricht auf der Grusskarte:“ |
| Platzhalter | Text | leer |
| Höchstlänge | Zahl 1–300 | 300 |

Immer Pflicht, sobald eine Karte gewünscht ist – keine Einstellung dafür. Die Höchstlänge gilt im Browser **und** auf dem Server; der Server kürzt weiterhin hart auf 300 (`class-integration.php`), die Einstellung kann nur **kürzer** machen.

**Sichtbar:** wenn `cardsEnabled` und `wantsCard`. **Verantwortlich für:** `text`.

### 6.5 In den Warenkorb — `add-to-cart`

| Einstellung | Typ | Standard |
|---|---|---|
| Beschriftung | Text | „In den Warenkorb“ |
| Stil | Auswahl `solid` / `outline` | `outline` |
| Warenkorb-Symbol anzeigen | Schalter | an (CSS-Maske, Farbe = Schriftfarbe) |

Zeigt bei nicht kaufbaren Produkten den Lagerhinweis statt des Knopfs. **Verantwortlich für:** `submitAttempted`, `isAdding`, `errorMessage`, den Batch-Request (unverändert), `receiveCart`.

---

## 7. Der bisherige Block wird direkt ersetzt

Der heutige Block `greeting-card-block/greeting-card-bundle` entfällt, kein Übergangsblock.

**Konsequenz:** Er steht heute im Single-Product-Template (im Site Editor gespeichert). Sobald das Plugin ohne ihn ausgeliefert ist, zeigt das Template dort „Dieser Block wird nicht unterstützt“, und auf der Seite erscheint **nichts**. Weil die native Form nur bei vollständigem Rahmen unterdrückt wird (Kapitel 8), fällt die Seite dann auf die WooCommerce-Form zurück – kaufbar, aber ohne Karte.

**Reihenfolge:**
1. Neue Blöcke bauen; der alte bleibt im Code, bis das Template umgestellt ist.
2. Im Site Editor den alten Block durch den Rahmen „Grusskarten-Kauf“ ersetzen und speichern.
3. Erst dann den alten Block aus dem Plugin löschen.

---

## 8. Native WooCommerce-Form: wann unterdrücken?

Die native Form wird unterdrückt, wenn
1. das Produkt einfach oder variabel ist **und**
2. auf der Seite ein Rahmen „Grusskarten-Kauf“ steht, der für dieses Produkt **kaufen kann** (`canPurchase`, 5.1).

Die Form kann im Template **vor** unserem Rahmen gerendert werden. Deshalb wird nicht auf den Rahmen gewartet, sondern vorab geprüft: `$_wp_current_template_content` (WordPress-Core, `block-template.php`) und – für Blöcke im Seiteninhalt – `post_content` werden mit `parse_blocks()` gelesen, Template-Parts aufgelöst, und auf den Rahmen-Baum wird dieselbe Prüfung wie in 4.2 angewandt (eine gemeinsame Funktion).

Im Zweifel – Rahmen nicht gefunden – wird **nicht** unterdrückt: lieber zwei Kaufen-Knöpfe als keiner.

---

## 9. Dateistruktur und Build

Struktur nach der offiziellen Anleitung „How to build a multi-block plugin“ (developer.wordpress.org/news, 09/2024): alle Blöcke unter `src/blocks/`, `wp-scripts` bildet sie 1:1 nach `build/blocks/` ab.

```
greeting-card-block/
├── greeting-card-block.php            ← registriert Store-Modul + Blöcke + Kategorie
├── includes/
│   ├── class-state.php                ← NEU: gcb_prepare_state(), Closures
│   ├── class-purchase-status.php      ← NEU: Vollständigkeit (Baum-Prüfung, render_block_data, Template-Suche für Kap. 8)
│   ├── class-integration.php          ← Warenkorb-Logik (unverändert) + neue Weiche (Kap. 8)
│   ├── class-store-api.php            ← unverändert
│   └── class-checkout-blocks-integration.php ← unverändert
├── src/
│   ├── shared/
│   │   └── store.js                   ← NEU: gemeinsamer Store (eigenes Skriptmodul, kein Block)
│   └── blocks/
│       ├── card-purchase/     { block.json, index.js, edit.js, render.php, editor.scss }  ← Rahmen
│       ├── variant-selector/  { block.json, index.js, edit.js, render.php, view.js, style.scss }
│       ├── card-toggle/       { … }
│       ├── card-picker/       { …, Swiper nur hier }
│       ├── card-message/      { … }
│       └── add-to-cart/       { … }
└── webpack.config.js                  ← NEU: zusätzlicher Einstieg für shared/store.js
```

Die Darstellung bleibt Aufgabe des Themes (`.button`, `.slider` in `main.css`); die Blöcke bringen nur Anordnung und die schlichte Ersatz-Optik mit (wie heute).

### 9.1 Registrierung

Wie heute über das Manifest (WordPress 6.8), ein Aufruf für alle Blöcke:

```php
wp_register_block_types_from_metadata_collection(
	__DIR__ . '/build/blocks',
	__DIR__ . '/build/blocks-manifest.php'
);
```

Geprüft: Das Manifest benennt jeden Block nach seinem **Ordnernamen** (`build-blocks-manifest.js`), WordPress setzt den Pfad als `<Basisordner>/<Ordnername>` zusammen (`class-wp-block-metadata-registry.php`). Basisordner muss deshalb `build/blocks` sein.

### 9.2 Build – bewusst anders als in der Anleitung

Die Anleitung ersetzt die Einstiegspunkte durch zwei Sammeldateien und löscht die `view.js` der Blöcke. **Das dürfen wir nicht übernehmen:** Damit fallen die Skriptmodule weg, auf denen die Interactivity API beruht – die Anleitung räumt das in den Kommentaren selbst ein.

Stattdessen wird die Standard-Konfiguration nur **ergänzt**. Mit `--experimental-modules` exportiert `@wordpress/scripts` `[ scriptConfig, moduleConfig ]`; in die zweite kommt der gemeinsame Store dazu, alle Block-Einstiege bleiben:

```js
const [ scriptConfig, moduleConfig ] = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = [
	scriptConfig,
	{
		...moduleConfig,
		entry: async () => ( {
			...( await resolveEntry( moduleConfig.entry ) ), // view.js aller Blöcke
			'shared/store': path.resolve( __dirname, 'src/shared/store.js' ),
		} ),
	},
];
```

(`resolveEntry` löst den Eintrag auf, egal ob `wp-scripts` ihn als Objekt oder Funktion liefert – bei der Umsetzung gegen die installierte Version prüfen.) Die Befehle in `package.json` bleiben wie heute.

---

## 10. Im Editor

- **Rahmen:** zeigt seine Innenblöcke ganz normal (wie eine Gruppe), dazu die Hinweisleiste aus 5.3, wenn etwas fehlt.
- **Innenblöcke:** jeder ein Platzhalter mit Titel und kurzer Erklärung („Hier erscheint die Grössenwahl des Produkts“). Eine echte Vorschau gibt es nicht, weil die Inhalte vom jeweiligen Produkt abhängen.
- **Einstellungen** aus Kapitel 6 in der Seitenleiste.
- Eigene Symbole je Block, abgeleitet vom heutigen Blumen-Symbol.

---

## 11. Umsetzungsreihenfolge

Jede Stufe ist für sich lauffähig und testbar.

1. **Gemeinsamer State** (`class-state.php`, `shared/store.js`, Build). Der bisherige Block nutzt ihn bereits – von aussen ändert sich nichts.
2. **Rahmen** mit Vorlage und Vollständigkeitsprüfung (`class-purchase-status.php`, `render_block_data`).
3. **Die fünf Innenblöcke**, Markup aus dem bisherigen Block auf sie verteilt. Der alte Block bleibt vorerst im Code.
4. **Regeln** aus Kapitel 5 auf der Seite, Fehlerführung (Scroll zum ersten Fehler).
5. **Editor-Verhalten** des Rahmens: Ausgrauen, Hinweis, Wiederherstellen.
6. **Einstellungen** je Block.
7. **Neue Weiche** für die native Form.
8. **Template umstellen** im Site Editor, dann den alten Block löschen.
9. **Tests**, Doku (ARCHITEKTUR.md, SETUP.md).

---

## 12. Testplan

Automatisiert mit Puppeteer gegen die lokale Seite (wie bisher), dazu Sichtprüfung im Editor.

**Auf der Seite:**

| # | Inhalt des Rahmens | erwartet |
|---|---|---|
| T1 | vollständig | Verhalten wie heute |
| T2 | vollständig, Karte gewählt, Grusstext leer | kein Kauf, Fehler am Grusstext-Block, Scroll dorthin |
| T3 | vollständig, Blöcke in Gruppen/Spalten verschachtelt, umsortiert | funktioniert unverändert |
| T4 | Grusstext-Block fehlt | keine Kartenoptionen, Kauf ohne Karte möglich, Hinweis nur für Redakteur:innen |
| T5 | Checkbox-Block fehlt | wie T4 |
| T6 | Warenkorb-Knopf fehlt | Rahmen rendert nichts, native WooCommerce-Form erscheint |
| T7 | Variantenauswahl fehlt, variables Produkt | wie T6 |
| T8 | Variantenauswahl fehlt, einfaches Produkt | Kauf normal möglich |
| T9 | kein Rahmen im Template | native WooCommerce-Form |

**Je Fall:** Preis-Block springt mit, Fehlermeldungen am richtigen Block, Warenkorb enthält richtige Variante/Karte/Text, keine Konsolenfehler.

**Im Editor:**
- Rahmen einfügen → alle fünf Blöcke sind da.
- Grusstext löschen → Kartenblöcke ausgegraut, Hinweis, „Wiederherstellen“ setzt ihn wieder ein.
- Warenkorb-Knopf löschen → alle Blöcke ausgegraut, passender Hinweis.
- Innenblock ausserhalb des Rahmens einfügen → nicht angeboten.
- Gruppe, Spalten, Absatz, Preis-Block in den Rahmen setzen → möglich.

**Einstellungen:** sichtbare Karten 1/3, Mobil-Breakpoint, Höchstlänge 100 (Browser **und** Server).

---

## 13. Risiken

| Risiko | Gegenmassnahme |
|---|---|
| Zusammenführen mehrerer `store()`-Aufrufe verhält sich anders als erwartet | Stufe 1 zuerst und isoliert testen |
| Server- und Browser-Logik der abgeleiteten Werte laufen auseinander | Regeln einmal in Kapitel 5 festgelegt; Tests prüfen den Zustand nach dem Laden (Server) und nach Klicks (Browser) |
| Vollständigkeitsprüfung im Editor und auf dem Server weichen voneinander ab | eine gemeinsame Liste der wesentlichen Blöcke (5.1), in PHP und JS aus derselben Quelle (JSON-Datei im Plugin) |
| Template-Suche für Kapitel 8 findet den Rahmen nicht | im Zweifel native Form **nicht** unterdrücken |
| Experimentelle WooCommerce-Schnittstelle für den Preis ändert sich | unverändert abgesichert, eigene Preiszeile als Rückfall in Block 1 |

---

## 14. Entscheidungen

| # | Frage | Entscheidung | Wirkt sich aus in |
|---|---|---|---|
| 14.1 | „Anzahl gezeigter Grusskarten“ | Wie viele Karten der Slider **gleichzeitig** zeigt. Keine Begrenzung der Gesamtzahl. | 6.3 |
| 14.2 | Kartenauswahl ohne Checkbox-Block | **Keine Grusskarten**, wenn der Checkbox-Block fehlt. | 5.2 |
| 14.3 | Grusstext | Ohne Grusstext **kein Kauf**, sobald eine Karte gewünscht ist. Immer Pflicht. | 5.2, 6.4 |
| 14.4 | Bisheriger Block | **Direkt ersetzen**, kein Übergangsblock. | 7 |
| 14.5 | Namensraum des Stores | `greeting-card-bundle` **bleibt**. | 2.3, 4 |
| 14.6 | Aufbau | **Rahmenblock nach Vorbild der Abfrage-Schleife**; Einfügen legt alle Blöcke an; fehlende Blöcke werden im Editor ausgegraut. | 1, 2, 5.3 |
| 14.7 | Umfang des Satzes | **Alle fünf Blöcke**, inklusive Warenkorb-Knopf und Variantenauswahl – der Knopf von WooCommerce kann die Karte nicht korrekt mitnehmen. | 1, 5.1 |
| 14.8 | Andere Blöcke im Rahmen | **Beliebige** Standard-Blöcke erlaubt, inklusive Gruppen. | 2.2, 3.1 |
