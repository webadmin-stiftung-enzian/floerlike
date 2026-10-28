# Wie das Grusskarten-Plugin funktioniert

Diese Datei erklärt, **was** das Plugin tut, **wie** die Daten durch das System
fliessen und **warum** es so gebaut ist. Sie setzt kein Vorwissen voraus: Jeder
Fachbegriff wird beim ersten Auftreten erklärt, und am Ende steht ein Glossar.

- Für die **Einrichtung** (Produkte anlegen, Karten verknüpfen, Blöcke ins
  Template setzen) gibt es die kürzere [SETUP.md](SETUP.md).
- Die **Entscheidungen** hinter dem Aufbau mit mehreren Blöcken stehen in der
  [Spezifikation v4](greeting-card-block-spec_v4.md).

---

## Inhalt

1. [Worum geht es?](#1-worum-geht-es)
2. [Grundbegriffe vorab](#2-grundbegriffe-vorab)
3. [Die Blöcke und die Dateien](#3-die-blöcke-und-die-dateien)
4. [Der Weg eines Kaufs – Schritt für Schritt](#4-der-weg-eines-kaufs--schritt-für-schritt)
5. [Die Interactivity API](#5-die-interactivity-api)
6. [Der Rahmen und die Vollständigkeit](#6-der-rahmen-und-die-vollständigkeit)
7. [Im Editor](#7-im-editor)
8. [Die Store API](#8-die-store-api)
9. [Wie Strauss und Karte zusammenbleiben](#9-wie-strauss-und-karte-zusammenbleiben)
10. [Die Darstellung im Warenkorb](#10-die-darstellung-im-warenkorb)
11. [Die Produktseite: wann die WooCommerce-Form verschwindet](#11-die-produktseite-wann-die-woocommerce-form-verschwindet)
12. [Preise und Varianten](#12-preise-und-varianten)
13. [Sicherheit](#13-sicherheit)
14. [Best Practices, die im Code stecken](#14-best-practices-die-im-code-stecken)
15. [Stolperfallen, die wir tatsächlich erlebt haben](#15-stolperfallen-die-wir-tatsächlich-erlebt-haben)
16. [Wartung: was tun, wenn …](#16-wartung-was-tun-wenn-)
17. [Glossar](#17-glossar)

---

## 1. Worum geht es?

Eine Kundin ist auf der Produktseite eines Blumenstrausses. Sie kann:

1. eine **Grösse** wählen (klein / mittel / gross) – falls der Strauss Varianten hat,
2. optional eine **Grusskarte** dazunehmen,
3. die Karte aus einem **Slider** auswählen und
4. einen **Grusstext** schreiben.

Dann klickt sie auf „In den Warenkorb“. Im Warenkorb liegen danach **zwei
Positionen**: der Strauss und – eingerückt darunter – die Karte mit dem Text.
Wird der Strauss entfernt, verschwindet die Karte mit. Ändert sich die Menge
des Strausses, zieht die Karte nach.

WooCommerce kann das nicht von Haus aus. Das Plugin füllt diese Lücke.

**Wie es aufgebaut ist:** Jede dieser Aufgaben ist ein eigener **Block**, und
alle stecken in einem gemeinsamen **Rahmenblock „Grusskarten-Kauf“**. Fügt man
den Rahmen im Editor ein, legt er alle nötigen Blöcke selbst an – so wie die
„Abfrage-Schleife“ von WordPress. Innerhalb des Rahmens lassen sie sich frei
anordnen, und beliebige andere Blöcke dürfen dazwischen stehen.

**Woher die Karten kommen:** Der Strauss ist ein ganz normales einfaches oder
variables Produkt. Welche Grusskarten zu ihm passen, wird im Feld
**„Bundle-sells“** (Tab „Linked Products“) eingetragen.

---

## 2. Grundbegriffe vorab

Diese Begriffe tauchen überall auf. Wenn du sie verstanden hast, verstehst du
den Rest.

### Server und Browser

Eine Webseite entsteht an **zwei Orten**:

- Auf dem **Server** (dort läuft PHP und WordPress). Er baut das HTML zusammen
  und schickt es los.
- Im **Browser** der Kundin (dort läuft JavaScript). Er zeigt das HTML an und
  reagiert auf Klicks.

Fast jede Frage in diesem Plugin lautet am Ende: *Passiert das auf dem Server
oder im Browser – und wie kommen die Daten von einem zum anderen?*

### Block, Rahmen und Innenblöcke

Ein **Block** ist ein Baustein, den man im WordPress-Editor auf eine Seite oder
in ein Template setzt – wie ein Absatz oder ein Bild.

Manche Blöcke enthalten andere Blöcke, z. B. eine Gruppe oder Spalten. Den
äusseren nennt man hier **Rahmen**, die darin **Innenblöcke**. Unser Rahmen
heisst „Grusskarten-Kauf“, seine wichtigsten Innenblöcke sind die fünf
**Kauf-Blöcke** (Kapitel 3).

### Hook (Action und Filter)

WordPress und WooCommerce rufen an vielen Stellen „Haken“ auf, an die man
eigenen Code hängen kann:

- Eine **Action** sagt: „Jetzt passiert gerade X – willst du etwas dazu tun?“
  Beispiel: `woocommerce_cart_item_removed` = „Gerade wurde eine Position aus
  dem Warenkorb entfernt.“
- Ein **Filter** sagt: „Hier ist ein Wert – willst du ihn verändern, bevor ich
  ihn benutze?“ Beispiel: `woocommerce_get_item_data` = „Das sind die
  Zusatzinfos zu einer Position – willst du welche ergänzen?“

Man hängt sich mit `add_action(...)` bzw. `add_filter(...)` ein.

### Warenkorb-Position und `cart_item_data`

Jede Zeile im Warenkorb ist eine **Position** (englisch *cart item*). Eine
Position ist intern ein Paket aus Daten: welches Produkt, welche Menge, welche
Variante – und beliebige **Zusatzdaten**, die ein Plugin anhängen darf. Diese
Zusatzdaten heissen `cart_item_data`. Unser Plugin legt dort drei Dinge ab:

| Feld | Bedeutung | Beispiel |
|---|---|---|
| `_gcb_group` | Gruppen-Nummer, die Strauss und Karte verbindet | `gcb3f9a…` |
| `_gcb_role` | Rolle in der Gruppe | `parent` (Strauss) oder `card` (Karte) |
| `_greeting_card_text` | der Grusstext | „Alles Gute!“ |

Das Präfix `gcb` steht für **G**reeting **C**ard **B**lock. Alle Namen des
Plugins beginnen damit, damit sie nicht mit anderen Plugins kollidieren.

### API

Eine **API** ist eine vereinbarte Schnittstelle, über die zwei Programme
miteinander reden. In diesem Plugin gibt es zwei wichtige:

- Die **Interactivity API** (von WordPress): macht Blöcke im Browser
  lebendig. → [Kapitel 5](#5-die-interactivity-api)
- Die **Store API** (von WooCommerce): erlaubt dem Browser, Dinge in den
  Warenkorb zu legen. → [Kapitel 8](#8-die-store-api)

Die Namen sind leider verwirrend ähnlich („Store“ taucht in beiden auf, meint
aber Verschiedenes). Merke dir: **Interactivity API = Anzeige im Browser**,
**Store API = Warenkorb auf dem Server**.

### Zweimal „Kontext“

Auch dieses Wort hat zwei Bedeutungen:

- **Block-Kontext:** Daten, die ein Rahmen an seine Innenblöcke weiterreicht.
  Beispiel: Das Produkt-Template reicht `postId` (das Produkt) an alle Blöcke
  darin weiter, unser Rahmen zusätzlich das Vorschau-Produkt für den Editor.
- **Interactivity-Kontext** (`data-wp-context`): Daten, die nur für ein
  bestimmtes HTML-Element im Browser gelten, z. B. „dieser Knopf steht für
  *klein*“.

---

## 3. Die Blöcke und die Dateien

### Die Blöcke

| Block | Name im Code | Aufgabe |
|---|---|---|
| **Grusskarten-Kauf** (Rahmen) | `greeting-card-block/card-purchase` | hält den Satz zusammen, prüft Vollständigkeit |
| Variantenauswahl | `…/variant-selector` | Grösse o. Ä. wählen; der Preis-Block springt mit |
| Grusskarte hinzufügen | `…/card-toggle` | Checkbox, die die Kartenfunktion einschaltet |
| Grusskarten-Auswahl | `…/card-picker` | Slider mit den Karten |
| Grusstext | `…/card-message` | Textfeld für die Nachricht |
| In den Warenkorb | `…/add-to-cart` | prüft alles und legt Produkt (+ Karte) in den Warenkorb |

Alle sechs stehen im Editor in der Kategorie **„Grusskarte & Kauf“**. Die fünf
Kauf-Blöcke dürfen nur innerhalb des Rahmens stehen (Kapitel 6) und jeweils
nur einmal pro Seite.

### Die Dateien

```
greeting-card-block/
├── greeting-card-block.php              ← Einstieg: lädt alles, registriert Blöcke, Store-Modul, Kategorie
├── includes/
│   ├── purchase-blocks.json             ← welche Blöcke wesentlich sind (für PHP UND Editor)
│   ├── class-purchase-status.php        ← Vollständigkeit des Rahmens, wann die WooCommerce-Form verschwindet
│   ├── class-state.php                  ← bereitet die Produktdaten für alle Blöcke auf
│   ├── class-preview.php                ← Editor-Vorschau: welches Produkt gezeigt wird
│   ├── class-variation-fields.php       ← Feld „Durchmesser“ an jeder Variation
│   ├── class-product-options.php        ← Schalter „Grusskarte“ am Produkt (wirkt in gcb_get_card_ids())
│   ├── class-integration.php            ← Warenkorb-Logik (Hooks), Kartenliste, Weiche zur WooCommerce-Form
│   ├── class-store-api.php              ← Zusatzdaten in der Store-API-Antwort
│   └── class-checkout-blocks-integration.php ← lädt JS/CSS in Warenkorb- und Kassen-Block
├── src/
│   ├── shared/
│   │   ├── store.js                     ← gemeinsamer Store aller Blöcke (eigenes Skriptmodul)
│   │   ├── placeholder.js               ← Editor: echte Vorschau bzw. Platzhalter
│   │   └── icon.js                      ← Blumen-Symbol der Blöcke
│   └── blocks/
│       ├── card-purchase/               ← Rahmen: block.json, index.js, edit.js, render.php, style.scss, editor.scss
│       ├── variant-selector/            ← je Block: block.json, index.js, edit.js, render.php, view.js, style.scss
│       ├── card-toggle/
│       ├── card-picker/                 ← zusätzlich editor.scss; Swiper nur hier
│       ├── card-message/
│       └── add-to-cart/
├── build/                               ← automatisch erzeugt, nie von Hand ändern
├── assets/
│   ├── js/checkout-blocks.js            ← Einrückung der Karte im Warenkorb
│   └── css/checkout-blocks.css
├── webpack.config.js                    ← ergänzt den Standard-Build um den gemeinsamen Store
├── SETUP.md                             ← Einrichtung
├── ARCHITEKTUR.md                       ← diese Datei
└── greeting-card-block-spec_v4.md       ← Spezifikation und Entscheidungen
```

**Was jede Block-Datei tut:**

| Datei | wo sie läuft | Aufgabe |
|---|---|---|
| `block.json` | überall | Steckbrief: Name, Titel, Einstellungen (Attribute), welche Dateien dazugehören |
| `render.php` | Server | baut das HTML – für die Seite **und** für die Vorschau im Editor |
| `view.js` | Browser (Seite) | Verhalten: was bei Klicks passiert |
| `edit.js` | Editor | Vorschau und Einstellungen in der Seitenleiste |
| `index.js` | Editor | meldet den Block beim Editor an |
| `style.scss` | Seite + Editor | Aussehen (meist nur Anordnung, die Optik kommt aus dem Theme) |

**Wichtig zu `src/` und `build/`:** Du bearbeitest immer die Dateien in `src/`.
Der Befehl `npm run build` übersetzt sie nach `build/` (z. B. wird aus modernem
JavaScript browsertaugliches JavaScript, aus `.scss` wird `.css`). WordPress lädt
nur, was in `build/` liegt. Vergisst du den Build, siehst du deine Änderung
nicht.

---

## 4. Der Weg eines Kaufs – Schritt für Schritt

```
 ┌──────────────────────────── SERVER (PHP) ────────────────────────────┐
 │                                                                      │
 │ ① Seite wird angefragt. WordPress rendert das Produkt-Template.      │
 │                                                                      │
 │ ② Trifft es auf den Rahmen „Grusskarten-Kauf“, prüft das Plugin      │
 │    ZUERST, welche Blöcke darin stehen (class-purchase-status.php):   │
 │      • Kann man kaufen? (Warenkorb-Knopf da, ggf. Variantenauswahl)  │
 │      • Gehen Grusskarten? (zusätzlich Checkbox, Auswahl, Grusstext)  │
 │                                                                      │
 │ ③ Dann rendert jeder Kauf-Block sein HTML (render.php). Der erste    │
 │    bereitet dabei die Produktdaten auf (class-state.php) – Varianten,│
 │    Karten, Preise – und legt sie als „State“ (Zustand) ab. Die       │
 │    anderen bekommen dieselben Daten aus dem Zwischenspeicher.        │
 │                                                                      │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │  HTML + State (als JSON im Seitenquelltext)
                 ▼
 ┌──────────────────────────── BROWSER (JS) ────────────────────────────┐
 │                                                                      │
 │ ④ Der gemeinsame Store (store.js) und die view.js der Blöcke         │
 │    übernehmen den State und machen die Blöcke bedienbar.             │
 │ ⑤ Kundin wählt Grösse, hakt „Grusskarte“ an, wählt eine Karte,       │
 │    schreibt Text. Jede Änderung landet im gemeinsamen State; alle    │
 │    Blöcke, die davon abhängen, passen sich sofort an – auch der      │
 │    Preis-Block von WooCommerce.                                      │
 │ ⑥ Klick auf „In den Warenkorb“:                                      │
 │    • Fehlt etwas, springt die Seite zum ersten Block mit Fehler.     │
 │    • Sonst schickt der Block EINEN Request mit zwei Aufträgen an     │
 │      die Store API: Strauss-Variante (Rolle parent) und Karte mit    │
 │      Text (Rolle card), beide mit derselben Gruppen-Nummer.          │
 │                                                                      │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │  POST /wp-json/wc/store/v1/batch
                 ▼
 ┌──────────────────────────── SERVER (PHP) ────────────────────────────┐
 │ ⑦ WooCommerce prüft den Nonce (Sicherheitsmarke) und legt beide      │
 │    Produkte in den Warenkorb. Unser Filter hängt Gruppe, Rolle und   │
 │    Text als cart_item_data an. Antwort: der komplette Warenkorb.     │
 └───────────────┬──────────────────────────────────────────────────────┘
                 ▼
 ┌──────────────────────────── BROWSER (JS) ────────────────────────────┐
 │ ⑧ Der neue Warenkorb geht an den Mini-Warenkorb, damit das Symbol    │
 │    oben rechts sofort die richtige Zahl zeigt.                       │
 └──────────────────────────────────────────────────────────────────────┘

 Später, beim Bezahlen:
 ⑨ Ein Hook schreibt Grusstext und Gruppe in die Bestellung, damit sie
    dort erhalten bleiben, wenn der Warenkorb längst geleert ist.
```

---

## 5. Die Interactivity API

### Welches Problem löst sie?

Eine Webseite soll zwei Dinge können, die sich ein bisschen widersprechen:

1. **Schnell dastehen** – am besten kommt fertiges HTML vom Server, dann sieht
   man sofort etwas (und Suchmaschinen auch).
2. **Auf Klicks reagieren** – z. B. soll ein Knopf dunkel werden, wenn man ihn
   anklickt, ohne dass die Seite neu lädt.

Früher schrieb man dafür Code nach dem Muster „wenn geklickt, suche Element X
und ändere Klasse Y“. Bei vielen Zuständen wird das schnell unübersichtlich.

Die **Interactivity API** dreht das um. Du beschreibst nur noch:

- **welche Daten** es gibt (den *State*) und
- **welches Element von welchen Daten abhängt** (mit Attributen im HTML).

Den Rest – „wenn sich die Daten ändern, aktualisiere alle abhängigen
Elemente“ – erledigt die API automatisch. Das nennt man **reaktiv**.

### Warum nicht React?

React macht Ähnliches, baut die Seite aber normalerweise **erst im Browser**
zusammen. Dann kommt zuerst eine leere Seite, und es muss viel mehr JavaScript
geladen werden. Die Interactivity API ist die offizielle WordPress-Lösung: Der
Server liefert fertiges HTML, und im Browser wird es nur noch „aufgeweckt“.
(Intern nutzt sie übrigens *Preact*, eine kleine React-Verwandte.)

### Mehrere Blöcke, ein Store

Ein **Store** ist die Sammlung aus Daten und Funktionen eines Namensraums. Unser
Namensraum heisst `greeting-card-bundle`. Jeder Kauf-Block trägt an seinem
äussersten Element:

```html
<div data-wp-interactive="greeting-card-bundle"> … </div>
```

Damit gehört er zu **demselben** Store – egal, wo er auf der Seite steht und wie
tief er in Gruppen verschachtelt ist. Wählt die Kundin in der Variantenauswahl
„mittel“, sieht der Warenkorb-Knopf das sofort. **Das** macht es möglich, die
Kaufoberfläche auf mehrere Blöcke zu verteilen.

### Die vier Zutaten

| Zutat | Was ist das? | Beispiel | steht in |
|---|---|---|---|
| **state** | die Daten | `selectedAttributes`, `wantsCard`, `text` | vom Server, `class-state.php` |
| **abgeleiteter state** (Getter) | Werte, die aus anderen *berechnet* werden | `matchedVariation`, `isValid` | `src/shared/store.js` |
| **actions** | Funktionen, die bei Ereignissen laufen | `selectAttribute`, `addToCart` | `view.js` des jeweiligen Blocks |
| **callbacks** | Funktionen, die „nebenher“ laufen | `syncNativePrice`, `initSwiper` | `view.js` des jeweiligen Blocks |

Wer was beisteuert:

| Block | Actions / Callbacks |
|---|---|
| Variantenauswahl | `selectAttribute`, `syncNativePrice` |
| Grusskarte hinzufügen | `toggleWantsCard` |
| Grusskarten-Auswahl | `selectCard`, `initSwiper` |
| Grusstext | `updateText` |
| In den Warenkorb | `addToCart` |

### Das gemeinsame Store-Modul

Die Getter braucht nicht nur ein Block, sondern mehrere. Deshalb stehen sie in
**einer** Datei, `src/shared/store.js`, die als eigenes **Skriptmodul** mit der
ID `greeting-card-block/store` registriert ist. Jeder Block bindet es über seine
`block.json` ein – zusätzlich zu seiner eigenen `view.js`:

```json
"viewScriptModule": [ "greeting-card-block/store", "file:./view.js" ]
```

Steht kein `file:` davor, versteht WordPress den Eintrag als ID eines
registrierten Moduls. Mehrere `store()`-Aufrufe für denselben Namensraum führt
die Interactivity API zusammen.

**Wichtige Regel:** Die `view.js` der Blöcke dürfen `store.js` **nicht
importieren**. Ein `import` würde den Build dazu bringen, den ganzen Store in
jede `view.js` hineinzukopieren – dann läge er fünfmal im Browser. Gemeinsame
Werte (z. B. die Höchstlänge des Grusstexts) stehen deshalb im State, nicht in
einer exportierten Konstanten.

### Die Direktiven: wie das HTML mit den Daten verbunden wird

Im HTML stehen spezielle Attribute, die mit `data-wp-` beginnen. Sie heissen
**Direktiven**. Am echten Beispiel eines Variantenknopfs aus
`variant-selector/render.php`:

```html
<label class="greeting-card-bundle__option button outline"
       data-wp-context='{"attributeName":"pa_groesse","value":"klein"}'
       data-wp-class--is-selected="state.isOptionSelected"
       data-wp-class--is-disabled="!state.isOptionAvailable">
  <input type="radio"
         data-wp-on--change="actions.selectAttribute"
         data-wp-bind--checked="state.isOptionSelected"
         data-wp-bind--disabled="!state.isOptionAvailable" />
  <span>klein</span>
</label>
```

| Direktive | bedeutet |
|---|---|
| `data-wp-interactive="greeting-card-bundle"` (am äussersten Element) | „Ab hier gilt der Store mit diesem Namen.“ |
| `data-wp-context='{…}'` | „Dieses Element hat eigene Daten: Attribut *pa_groesse*, Wert *klein*.“ |
| `data-wp-on--change="actions.selectAttribute"` | „Wenn sich das ändert (Klick), rufe `selectAttribute` auf.“ |
| `data-wp-bind--checked="state.isOptionSelected"` | „Das Attribut `checked` ist genau dann gesetzt, wenn `isOptionSelected` wahr ist.“ |
| `data-wp-bind--hidden="!state.wantsCard"` | „Versteckt, solange keine Karte gewünscht ist.“ (Kartenauswahl, Grusstext) |
| `data-wp-class--is-selected="state.isOptionSelected"` | „Die CSS-Klasse `is-selected` ist genau dann gesetzt, wenn …“ |
| `data-wp-text="state.charCounter"` | „Der Text dieses Elements ist immer der Wert von `charCounter`.“ |
| `data-wp-watch="callbacks.syncNativePrice"` | „Führe diese Funktion aus – und jedes Mal erneut, wenn sich Daten ändern, die sie liest.“ |
| `data-wp-init="callbacks.initSwiper"` | „Führe diese Funktion einmal aus, wenn das Element erscheint.“ |

Das `!` davor bedeutet „nicht“.

### Ein Klick – was passiert genau?

1. Kundin klickt auf „klein“.
2. Das Radio-Element meldet `change` → `actions.selectAttribute` läuft.
3. Die Action liest aus dem Kontext „ich bin *pa_groesse* = *klein*“ und
   schreibt das in `state.selectedAttributes`.
4. Die API merkt: `selectedAttributes` hat sich geändert. Wer hängt davon ab?
   - `isOptionSelected` bei **allen** Knöpfen → „klein“ bekommt
     `is-selected`, die anderen verlieren es.
   - `matchedVariation` → findet jetzt die Variante „klein“.
   - `syncNativePrice` (ein Watch) → meldet die Variante an den Preis-Block.

Nirgends steht Code wie „entferne die Klasse bei den anderen Knöpfen“. Das
ergibt sich von selbst aus den Abhängigkeiten. **Das ist der Kern der Idee.**

### Server und Browser teilen sich den State

Der State entsteht auf dem Server in `gcb_prepare_state()` (`class-state.php`):

```php
wp_interactivity_state('greeting-card-bundle', [
    'cards'              => $cards,
    'selectedAttributes' => $selected,
    'cardsEnabled'       => $cards_enabled,
    // …
]);
```

WordPress schreibt diese Daten als JSON unsichtbar in den Seitenquelltext. Der
Store im Browser bekommt sie dort automatisch als Startzustand.

`gcb_prepare_state()` wird von **jedem** Kauf-Block aufgerufen, rechnet aber nur
beim ersten Mal – die übrigen bekommen das Ergebnis aus einem
Zwischenspeicher. Fünf Blöcke = einmal rechnen.

Zusätzlich wertet WordPress die Direktiven **schon auf dem Server** aus. Deshalb
sieht die Seite schon richtig aus, bevor JavaScript geladen ist.

**Die Falle dabei:** Getter stehen in `store.js`, also im Browser. Der Server
kennt sie nicht und behandelt sie als „leer“. Bei `!state.isOptionAvailable`
ergab „nicht leer“ = wahr – und **alle** Knöpfe kamen gesperrt beim Browser an.
Die Lösung: dieselben Getter zusätzlich als PHP-Funktionen (*Closures*) in den
State legen (`isOptionSelected`, `isOptionAvailable` in `class-state.php`).
WordPress rechnet sie beim Rendern aus und überlässt danach dem Browser die
JS-Version. **Die Logik muss in beiden Sprachen gleich sein** – wer eine ändert,
muss die andere mitziehen.

### Mit fremden Stores reden: der Preis-Block

Man kann auch in den Store eines anderen Plugins schreiben. So springt der
**Preis-Block von WooCommerce** mit:

- Der Preis-Block liest aus dem Store `woocommerce/products` den Wert
  `variationId`. Ist er gesetzt, zeigt er den Preis dieser Variante, sonst die
  Preisspanne.
- `syncNativePrice` (Variantenauswahl) schreibt bei jeder Auswahl die passende
  `variationId` dort hinein.
- Damit der Preis-Block die Varianten überhaupt kennt, lädt
  `gcb_load_native_price_variations()` sie auf dem Server in diesen Store.

Dieser Store ist bei WooCommerce **privat bzw. experimentell**: WooCommerce
verlangt wörtliche Zustimmungstexte („I acknowledge that …“) und kündigt damit
an, dass er sich ändern kann. Deshalb ist alles abgesichert: Klappt es nicht
mehr, zeigt der Preis-Block die Spanne, und die Variantenauswahl blendet eine
eigene Preiszeile ein. Der Kauf funktioniert in jedem Fall.
→ siehe [Kapitel 16](#16-wartung-was-tun-wenn-).

---

## 6. Der Rahmen und die Vollständigkeit

### Warum ein Rahmen?

Die fünf Kauf-Blöcke funktionieren nur zusammen: Ohne Warenkorb-Knopf kann man
nichts kaufen, ohne Grusstext keine Karte. Ein Rahmen hält sie zusammen –
und er weiss jederzeit, welche Blöcke er enthält.

Damit die Kauf-Blöcke auch **in Gruppen und Spalten** innerhalb des Rahmens
stehen dürfen, steht in ihrer `block.json`:

```json
"ancestor": [ "greeting-card-block/card-purchase" ]
```

`ancestor` heisst „irgendwo unterhalb dieses Blocks“. Die strengere Variante
`parent` würde nur direkte Kinder erlauben – Gruppen dazwischen wären dann
unmöglich.

### Was „vollständig“ heisst

Welche Blöcke wesentlich sind, steht in **einer** Datei:
`includes/purchase-blocks.json`. PHP und der Editor lesen beide daraus, damit
Seite und Editor nie unterschiedlich entscheiden.

| Funktion | braucht |
|---|---|
| **Kaufen** (`canPurchase`) | „In den Warenkorb“; bei variablen Produkten zusätzlich die Variantenauswahl |
| **Grusskarte** (`cardsEnabled`) | Kaufen möglich **und** Checkbox, Kartenauswahl, Grusstext **und** das Produkt hat Karten |

### Was auf der Seite passiert, wenn etwas fehlt

| Situation | Verhalten |
|---|---|
| alles da | normal. Kartenauswahl und Grusstext erscheinen nach dem Haken. |
| Checkbox, Kartenauswahl oder Grusstext fehlt | keine Kartenoptionen; Kauf **ohne** Karte geht |
| Warenkorb-Knopf fehlt (oder Variantenauswahl bei variablem Produkt) | der Rahmen zeigt **nichts**, die normale WooCommerce-Form springt ein (Kapitel 11) |

Kund:innen sehen nie Halbfertiges. Wer das Template bearbeiten darf, sieht auf
der Seite einen dezenten Hinweis, was fehlt.

### Die Reihenfolge beim Rendern – und warum sie knifflig ist

WordPress rendert **erst die Innenblöcke und danach den Rahmen**. Die
Innenblöcke müssen aber schon wissen, ob der Satz vollständig ist – sonst
würde z. B. die Checkbox erscheinen, obwohl der Grusstext fehlt.

Deshalb hängt sich `class-purchase-status.php` an den Filter
**`render_block_data`**. Der läuft, **bevor** ein Block samt Innenblöcken
gerendert wird. Trifft er auf den Rahmen, liest er dessen Innenblock-Baum
(beliebig tief, inklusive synchronisierter Vorlagen und Muster) und merkt sich
das Ergebnis. Die Innenblöcke fragen es dann mit `gcb_get_purchase_status()` ab.

### Der Abstand zwischen den Blöcken

Dein Theme setzt den Standardabstand im Fliess-Layout auf 0. Der Rahmen bringt
deshalb einen eigenen Standard von **1.5rem** mit (`block.json`, Attribut
`style`), den man im Editor unter **„Blockabstand“** ändern kann.

Auch hier eine Falle: Auf der Seite berechnet WordPress das Layout nur aus den
**gespeicherten** Einstellungen – und Standardwerte werden nicht gespeichert. Im
Editor hätte der Abstand gestimmt, auf der Seite gefehlt. Ein zweiter
`render_block_data`-Filter ergänzt deshalb den Standard, bevor WordPress das
Layout berechnet. Ein im Editor eingestellter Wert hat Vorrang.

---

## 7. Im Editor

### Die Vorschau sieht aus wie die Seite

Im Editor zeigen die Kauf-Blöcke ihre **echte Ausgabe**. `edit.js` nutzt dafür
`ServerSideRender`: Der Editor fragt beim Server denselben `render.php` ab wie
die Seite (über den REST-Endpunkt `/wp/v2/block-renderer`). So lassen sich die
Blöcke nach dem tatsächlichen Aussehen anordnen.

Drei Anpassungen sind dafür nötig (`class-preview.php`, `gcb_is_editor_preview()`):

1. **Vorschau-Produkt:** Im Template steht kein bestimmtes Produkt. Der Rahmen
   hat deshalb die Einstellung **„Vorschau → Vorschau-Produkt“** und reicht sie
   als Block-Kontext an die Kauf-Blöcke weiter. Leer = automatisch ein
   variables Produkt mit Grusskarten, weil das alle Blöcke zeigt.
2. **Kartenauswahl und Grusstext sind im Editor immer sichtbar** und die
   Checkbox angehakt – auf der Seite erscheinen sie erst nach dem Haken, im
   Editor muss man sie aber sehen, um sie anzuordnen.
3. **Pfeile und Punkte des Sliders** liefert der Server für die Vorschau mit,
   weil im Editor kein Swiper läuft.

Die Vorschau ist nur zum Ansehen (`pointer-events: none`): Ein Klick wählt den
Block aus, statt z. B. einen Variantenknopf umzuschalten. Zeigt ein Block für
das Vorschau-Produkt nichts an (z. B. Variantenauswahl bei einem einfachen
Produkt), erscheint ein Platzhalter mit Erklärung.

### Fehlende Blöcke: Hinweis und Ausgrauen

Der Rahmen beobachtet im Editor seine Innenblöcke. Fehlt etwas Wesentliches:

- Hinweisleiste oben im Rahmen mit Knopf **„Wiederherstellen“** – fügt die
  fehlenden Blöcke am Ende des Rahmens wieder ein.
- Die betroffenen Blöcke werden **im Inhalt** (über `data-type`) **und in der
  Listenansicht** (Zeilen über ihre Block-ID `data-block`) ausgegraut. Sie
  bleiben auswählbar, verschiebbar und löschbar.

Im Editor ist das Produkt unbekannt – dasselbe Template gilt für alle
Produkte. Die Variantenauswahl gilt dort deshalb immer als wesentlich.

### Einstellungen der Blöcke

| Block | Einstellungen in der Seitenleiste |
|---|---|
| Grusskarten-Kauf | Vorschau-Produkt, Blockabstand, Innenabstand, Breite |
| Variantenauswahl | Durchmesser in den Knöpfen, eigene Preiszeile |
| Grusskarte hinzufügen | Beschriftung |
| Grusskarten-Auswahl | sichtbare Karten Desktop (1–6) und Mobil < 600px (1–3), letzte Karte anschneiden, Preis, Pfeile, Punkte |
| Grusstext | Beschriftung, Platzhalter, Höchstlänge (1–300) |
| In den Warenkorb | Beschriftung, Stil (Kontur/Gefüllt), Warenkorb-Symbol |

Die Einstellungen sind **Attribute** in der `block.json`. Der Editor speichert
sie im Template, `render.php` liest sie aus `$attributes`.

---

## 8. Die Store API

### Was ist das?

Die **Store API** ist eine Schnittstelle von WooCommerce, über die der Browser
mit dem Warenkorb reden kann – ohne die Seite neu zu laden. Man schickt eine
Anfrage an eine Adresse (einen *Endpunkt*) und bekommt eine Antwort.

Die Adressen beginnen immer mit `/wp-json/wc/store/v1/`. Wichtige Endpunkte:

| Endpunkt | Methode | tut |
|---|---|---|
| `cart` | GET | zeigt den aktuellen Warenkorb |
| `cart/add-item` | POST | legt ein Produkt in den Warenkorb |
| `cart/remove-item` | POST | entfernt eine Position |
| `cart/update-item` | POST | ändert die Menge |
| `batch` | POST | mehrere der obigen Aufträge in **einem** Request |

Tipp zum Ausprobieren: Öffne im Browser
`http://floerlike.local/wp-json/wc/store/v1/cart` – du siehst deinen Warenkorb
als JSON.

### Warum `batch`?

Strauss und Karte sollen **gemeinsam** in den Warenkorb. Mit zwei einzelnen
Requests könnte der erste klappen und der zweite scheitern – dann läge der
Strauss ohne Karte im Warenkorb. `batch` schickt beides in einem Paket. Mit
`validation: 'require-all-validate'` werden alle Aufträge vorher geprüft.

So sieht der Request aus (vereinfacht, aus `add-to-cart/view.js`):

```json
{
  "validation": "require-all-validate",
  "requests": [
    {
      "path": "/wc/store/v1/cart/add-item",
      "method": "POST",
      "headers": { "Nonce": "33d905a218" },
      "body": { "id": 575, "quantity": 1, "gcb_group": "gcb3f9a…", "gcb_role": "parent" }
    },
    {
      "path": "/wc/store/v1/cart/add-item",
      "method": "POST",
      "headers": { "Nonce": "33d905a218" },
      "body": { "id": 74, "quantity": 1, "gcb_group": "gcb3f9a…", "gcb_role": "card",
                "greeting_card_text": "Alles Gute!" }
    }
  ]
}
```

`id` ist beim Strauss die **Varianten-ID** (z. B. „klein“ = 575), nicht die ID
des Hauptprodukts.

### Der Nonce – eine Sicherheitsmarke

Stell dir vor, eine fremde Webseite versteckt einen Knopf, der heimlich eine
Anfrage an *deinen* Shop schickt – mit den Cookies der Besucherin. Diese
Angriffsart heisst **CSRF** (*Cross-Site Request Forgery*).

Dagegen gibt es den **Nonce**: eine Zeichenkette, die der Server beim
Seitenaufruf erzeugt (`wp_create_nonce('wc_store_api')` in `class-state.php`)
und die nur deine echte Seite kennt. Jede Anfrage, die etwas verändert, muss
sie im Header `Nonce` mitschicken. Fehlt sie oder stimmt sie nicht, lehnt
WooCommerce ab (Fehler 401 bzw. 403).

### Eigene Felder mitschicken

`gcb_group`, `gcb_role` und `greeting_card_text` kennt WooCommerce nicht. Die
Store API lässt unbekannte Felder aber durch, und über den Filter
`woocommerce_store_api_add_to_cart_data` kann ein Plugin sie abgreifen. Genau
das tut der erste Filter in `class-integration.php`: Er liest die Felder,
**bereinigt** sie (siehe [Kapitel 13](#13-sicherheit)) und legt sie als
`cart_item_data` an die Position.

### Die Antwort ist der ganze Warenkorb

Nach `add-item` antwortet die Store API mit dem **kompletten** neuen
Warenkorb. Der Warenkorb-Knopf gibt ihn an den Datenspeicher der
Warenkorb-Blöcke weiter (`receiveCart`), damit Warenkorb- und Kasse-Block
sofort stimmen.

Der **Mini-Cart** im Header hängt daran nicht verlässlich: Er läuft seit
WooCommerce 10 über einen eigenen Interactivity-Store (`woocommerce`), den
WooCommerce für fremde Plugins sperrt. Ohne weiteres Zutun zeigte er z. B.
nach einem Neuladen mit gefülltem Warenkorb weiter die alte Anzahl. Der
Knopf sendet deshalb zusätzlich das Ereignis, auf das dieser Store lauscht:

```js
window.dispatchEvent( new CustomEvent( 'wc-blocks_store_sync_required', {
	detail: { type: 'from_@wordpress/data' },
} ) );
```

Der Mini-Cart holt dann den Warenkorb neu vom Server. Der Ereignisname ist
ein Interna von WooCommerce (11.1, `stores/woocommerce/cart.js`) – **nach
einem WooCommerce-Update prüfen**: Produkt in den Warenkorb legen, Seite neu
laden, ein zweites hinzufügen, die Zahl am Mini-Cart muss mitzählen.

### Zusatzdaten in der Antwort (ExtendSchema)

Umgekehrt kann ein Plugin auch **eigene Daten in die Antwort** der Store API
hängen. `class-store-api.php` tut das mit
`woocommerce_store_api_register_endpoint_data()`: An jede Warenkorb-Position
kommt ein Abschnitt `extensions["greeting-card-block"]` mit Gruppe, Rolle,
Elternposition und Text. Den braucht die Darstellung im Warenkorb-Block
([Kapitel 10](#10-die-darstellung-im-warenkorb)).

---

## 9. Wie Strauss und Karte zusammenbleiben

### Die Idee: eine Gruppen-Nummer

Im Warenkorb sind Strauss und Karte **zwei ganz normale, getrennte
Positionen**. WooCommerce weiss nicht, dass sie zusammengehören. Deshalb
bekommen beide dieselbe **Gruppen-Nummer** (`_gcb_group`) und eine **Rolle**
(`_gcb_role`: `parent` oder `card`).

Die Nummer erzeugt der Browser in `createGroupId()` mit
`crypto.randomUUID()` – einer zufälligen, praktisch nie doppelt vorkommenden
Zeichenkette.

### Warum nicht einfach „Karte gehört zu Position XY“?

Jede Warenkorb-Position hat einen internen Schlüssel (*cart key*). Es wäre
naheliegend, bei der Karte zu speichern: „Ich gehöre zu Schlüssel XY“. Das
geht aus zwei Gründen nicht gut:

1. Beim Absenden **gibt es den Schlüssel noch gar nicht** – der Strauss liegt
   ja noch nicht im Warenkorb.
2. Positionen können entfernt und neu angelegt werden.

Die Gruppen-Nummer dagegen legt der Browser selbst fest, sie ist von Anfang an
bekannt und bleibt stabil. Den tatsächlichen Schlüssel sucht der Server bei
Bedarf: `gcb_find_parent_key()` geht den Warenkorb durch und sucht die
Position mit derselben Gruppe und der Rolle `parent`.

### Das Verhalten im Warenkorb – alles über Hooks

| Wunsch | Hook | Was passiert |
|---|---|---|
| Karte fliegt mit raus, wenn der Strauss entfernt wird | `woocommerce_cart_item_removed` | Wurde ein `parent` entfernt, werden alle `card` derselben Gruppe mitentfernt. |
| „Rückgängig“ holt auch die Karte zurück | `woocommerce_cart_item_restored` | umgekehrt |
| Karte hat immer dieselbe Menge wie der Strauss | `woocommerce_before_calculate_totals` | Vor jeder Preisberechnung wird die Menge der Karte angeglichen. |
| Karte ohne Strauss wird aufgeräumt | derselbe Hook | Findet sich keine Elternposition mehr, wird die Karte entfernt. |
| Kundin kann die Menge der Karte nicht selbst ändern | `woocommerce_store_api_product_quantity_editable` | Liefert für Karten `false` – der Mengen-Regler verschwindet. |
| Grusstext im Warenkorb sichtbar | `woocommerce_get_item_data` | fügt die Zeile „Grusstext: …“ hinzu |
| Grusstext in der Bestellung gespeichert | `woocommerce_checkout_create_order_line_item` | schreibt Text und Gruppe als Meta-Daten in die Bestellposition |

Warum `before_calculate_totals` für die Menge? Weil dieser Hook bei **jeder**
Änderung am Warenkorb läuft – egal, auf welchem Weg die Menge geändert wurde.
Ein Hook, der alle Wege abdeckt, ist robuster als mehrere, die einzelne Wege
abdecken.

---

## 10. Die Darstellung im Warenkorb

Der Warenkorb-Block ist eine eigene React-Anwendung von WooCommerce. Auf sein
HTML hat man keinen direkten Zugriff. WooCommerce bietet dafür zwei offizielle
Wege, und wir nutzen beide:

1. **Daten hineinbringen:** über die Store-API-Erweiterung aus
   [Kapitel 8](#zusatzdaten-in-der-antwort-extendschema). Jede Position hat
   dann `extensions["greeting-card-block"]` mit `role` und `parentKey`.
2. **Darstellung beeinflussen:** über sogenannte **Checkout-Filter**. In
   `assets/js/checkout-blocks.js` registrieren wir den Filter `cartItemClass`.
   Er bekommt jede Position und darf CSS-Klassen ergänzen. Ist die Rolle
   `card`, hängen wir `gcb-item--card` an. `checkout-blocks.css` rückt solche
   Positionen dann ein und zeichnet eine kleine Verbindungslinie.

Damit das Skript überhaupt im Warenkorb-Block landet, meldet
`class-checkout-blocks-integration.php` es über die offizielle
`IntegrationInterface` an – an den Hooks
`woocommerce_blocks_cart_block_registration` (und `…mini-cart…`,
`…checkout…`).

---

## 11. Die Produktseite: wann die WooCommerce-Form verschwindet

Auf einer Produktseite darf es **genau einen** „In den Warenkorb“-Knopf geben.
Kauft man über unsere Blöcke, muss WooCommerces eigene Form verschwinden – aber
**nur dann**. Sonst hätte ein Produkt womöglich gar keinen Knopf.

### Zwei Fragen, zwei Funktionen

1. **Sind unsere Blöcke für das Produkt zuständig?** → `gcb_handles_product()`:
   ja für **einfache** und **variable** Produkte. Für Bundles, gruppierte und
   externe Produkte nein – deren Formulare bauen die Blöcke nicht nach.
2. **Kann man auf dieser Seite damit kaufen?** → `gcb_page_can_purchase()`:
   steht ein Rahmen „Grusskarten-Kauf“ auf der Seite, der für dieses Produkt
   vollständig ist? Durchsucht werden das aktuelle Template und der Inhalt der
   aufgerufenen Seite (z. B. eine Landingpage mit dem Block „Einzelnes
   Produkt“), inklusive Gruppen, synchronisierter Vorlagen, Template-Teile und
   Muster.

`gcb_should_hide_native_form()` verlangt **beides**. Im Zweifel bleibt die
WooCommerce-Form stehen – lieber zwei Knöpfe als keiner.

Warum vorab suchen, statt einfach auf den Rahmen zu warten? Weil die
WooCommerce-Form im Template **vor** dem Rahmen stehen kann und dann zuerst
gerendert wird.

### Wie die Form ausgeblendet wird

Je nach Aufbau des Templates erzeugt WooCommerce seine Form auf
unterschiedliche Weise. Wir fangen beide ab (`class-integration.php`):

- **Klassischer Hook** (`woocommerce_single_product_summary`, Priorität 30):
  Bei Priorität 29 startet ein Ausgabe-Puffer (`ob_start`), bei 31 wird alles
  weggeworfen, was dazwischen ausgegeben wurde (`ob_end_clean`).
- **Block im Template** (`woocommerce/add-to-cart-form` bzw.
  `add-to-cart-with-options`): Der Filter `render_block` ersetzt seine Ausgabe
  durch einen leeren Text. Das Produkt kommt dabei aus dem **Block-Kontext**,
  nicht aus `get_the_ID()` – auf einer Landingpage wäre das sonst die Seite.

Die eigene Kartenauswahl von *Product Bundles* (Bundle-sells als
Checkbox-Liste) bleibt auf unseren Produkten **immer** aus, auch wenn die
WooCommerce-Form als Rückfall erscheint: Sie würde Karten ohne Grusstext und
ohne Verbindung zum Strauss in den Warenkorb legen.

---

## 12. Preise und Varianten

### Wie WooCommerce Preise denkt

Bei einem **variablen Produkt** hat **jede Variante ihren eigenen, vollen
Preis**. Das Hauptprodukt hat keinen Preis – ein dort eingetragener Wert wird
ignoriert. „Grundpreis + Aufschlag“ kennt WooCommerce nicht.

Deshalb: In jede Variante gehört der **Endpreis** (z. B. klein 35, mittel 45,
gross 55), nicht der Aufschlag (−10, 0, +10). Sonst landet im Warenkorb
wörtlich ein negativer Preis.

### Welche Varianten angeboten werden

`gcb_build_variation_selector()` (`class-state.php`) fragt WooCommerce nach den
**verfügbaren** Varianten (`get_available_variations()`). Varianten ohne Preis
sortiert WooCommerce dort aus. Zusätzlich werden Attributwerte ausgeblendet, zu
denen es gar keine verfügbare Variante gibt – sonst gäbe es einen Knopf
„gross“, zu dem man nichts kaufen kann.

Im Browser prüft `isOptionAvailable` bei jedem Knopf: *Gibt es mit diesem Wert –
zusammen mit dem, was bei anderen Attributen schon gewählt ist – eine
kaufbare Variante?* Wenn nein, wird der Knopf ausgegraut und gesperrt.

Die **Reihenfolge** der Knöpfe folgt der Reihenfolge der Variationen im
Produkt (Tab „Variationen“, per Ziehen sortierbar): von oben nach unten im
Admin = von links nach rechts auf der Seite. WooCommerce speichert sie als
`menu_order` und liefert die Varianten schon so sortiert. Jeder Wert rückt an
die Stelle seiner ersten Variante. Ohne diese Sortierung käme die Reihenfolge
zufällig aus der Datenbank.

Der **Durchmesser** einer Variante erscheint im Knopf unter dem Wert
(„klein / ca. 35 cm Ø“). Er ist ein eigenes Feld, das
`class-variation-fields.php` in jede Variation einsetzt (Hook
`woocommerce_variation_options_dimensions`, direkt unter
„Abmessungen“) und als Meta-Feld `_gcb_diameter` speichert (Hook
`woocommerce_admin_process_variation_object`). Die Beschreibung bleibt so
frei für echten Text. Bei mehreren Attributen erscheint der Durchmesser nur,
wenn er eindeutig ist.

Gespeichert wird **nur die Zahl** („35“, „37.5“); die Einheit ist die
Abmessungs-Einheit von WooCommerce. Den Text baut `gcb_format_diameter()`
(„ca. 35 cm Ø“, bei zwei Werten „ca. 35 – 55 cm Ø“). Mit einer Zahl lässt
sich rechnen: Das Schaufenster-Plugin zeigt im Block „Varianten-Spanne“ den
kleinsten und grössten Durchmesser. Dafür meldet dieses Plugin den
Durchmesser über den Filter `psb_variation_range_values` an – die beiden
Plugins kennen sich nicht, ist das Schaufenster aus, greift der Filter
einfach nicht. Ältere Freitext-Werte („ca. 35 cm Ø“) hat eine einmalige
Umstellung beim ersten Aufruf des Admins in Zahlen verwandelt (Option
`gcb_diameter_numeric`).

### Warum Radio-Buttons, die wie Knöpfe aussehen?

Variantenauswahl und Kartenauswahl bestehen aus echten
`<input type="radio">`, die per CSS unsichtbar gemacht und durch das `<label>`
als Knopf dargestellt werden. Das bringt „nur einer gleichzeitig“ **gratis vom
Browser**. Ausserdem funktionieren Pfeiltasten und Screenreader korrekt. Das
Radio wird nicht mit `display: none` versteckt, sondern nur optisch – sonst
wäre es für Tastatur und Screenreader ebenfalls verschwunden.

Das Aussehen kommt aus den Theme-Klassen `button outline` bzw.
`button outline tile` (Karten) in `main.css` – dieselben wie überall auf der
Seite. Das Plugin bringt nur eine schlichte **Ersatz-Optik** mit (schwarz,
eckig), falls das Theme fehlt. Sie steht in `:where(…)`, hat damit Spezifität
null, und jede Theme-Regel gewinnt automatisch.

---

## 13. Sicherheit

Die wichtigste Regel im Web: **Alles, was aus dem Browser kommt, ist
verdächtig.** Die Kundin (oder ein Angreifer) kann jede Anfrage verändern. Der
Server muss deshalb alles prüfen.

### Eingaben bereinigen (*sanitize*)

Bevor etwas aus einer Anfrage gespeichert wird, wird es bereinigt:

| Eingabe | Funktion | Wirkung |
|---|---|---|
| `gcb_group` | `sanitize_key()` | nur Kleinbuchstaben, Ziffern, `-` und `_` bleiben übrig |
| `gcb_role` | Vergleich mit fester Liste | alles ausser `card` wird zu `parent` |
| `greeting_card_text` | `sanitize_textarea_field()` + `mb_substr(…, 0, 300)` | HTML-Tags werden entfernt, Länge wird begrenzt |

Die **Höchstlänge** aus den Einstellungen des Grusstext-Blocks gilt nur im
Browser. Der Server kürzt immer hart auf 300 – mehr nimmt er nie an, auch wenn
jemand die Anfrage von Hand baut.

### Ausgaben escapen (*escape*)

Bevor etwas ins HTML geschrieben wird, wird es „entschärft“, damit es nicht als
Code ausgeführt werden kann. Sonst könnte jemand z. B. einen Grusstext
`<script>…</script>` einschleusen – diese Angriffsart heisst **XSS**
(*Cross-Site Scripting*).

| Funktion | für |
|---|---|
| `esc_html()` | normalen Text (auch Beschriftungen aus den Einstellungen) |
| `esc_attr()` | Werte in HTML-Attributen (`value="…"`, `placeholder="…"`) |
| `esc_url()` | Adressen (`src="…"`, `href="…"`) |
| `wp_kses_post()` | HTML, das bewusst erlaubt ist (z. B. Preis mit `<span>`) |
| `wp_interactivity_data_wp_context()` | den Kontext als JSON im Attribut |

Merksatz: **Beim Speichern bereinigen, beim Ausgeben escapen.** Beides, nicht
nur eins von beiden.

### Weitere Schutzschichten

- **Nonce** gegen gefälschte Anfragen ([Kapitel 8](#der-nonce--eine-sicherheitsmarke)).
- **Keine Preislogik aus dem Browser:** Der Browser sagt nur *welches* Produkt,
  nie *zu welchem Preis*. Den Preis bestimmt immer WooCommerce auf dem Server.
- **Editor-Vorschau nur für Berechtigte:** Den REST-Endpunkt
  `/wp/v2/block-renderer` dürfen nur angemeldete Nutzer:innen mit
  Bearbeitungsrechten aufrufen; das prüft WordPress selbst.
- **Hinweis für die Zukunft:** Welche Karte als `card` in den Warenkorb kommt,
  wird aktuell nicht gegen die Bundle-sells-Liste des Strausses geprüft. Das
  ist harmlos, solange Karten keinen Rabatt bekommen. Führt man einen
  Kartenrabatt ein, **muss** diese Prüfung ergänzt werden.

---

## 14. Best Practices, die im Code stecken

Jeweils: was, und **warum**.

**Nicht gegen die Plattform arbeiten.**
Endpreise statt Aufschläge, echte Radio-Buttons statt selbstgebauter
Auswahllogik, offizielle Hooks, Innenblöcke mit `ancestor` wie bei der
Abfrage-Schleife. Jede Abweichung vom „normalen“ Weg muss man an vielen
Stellen nachbauen und bei jedem Update neu prüfen.

**Server zuerst, Browser verbessert nur.**
Die Seite kommt fertig vom Server, JavaScript macht sie nur interaktiv. Fachwort:
*Progressive Enhancement*. Vorteil: schnell, suchmaschinenfreundlich, robust.

**Eine Wahrheit an einem Ort.**
`purchase-blocks.json` für „was ist wesentlich“, `gcb_handles_product()` für
die Zuständigkeit, die Gruppen-Nummer für die Zusammengehörigkeit, der State für
die Anzeige, das Theme für die Optik. Nie zwei Stellen, die dasselbe
unabhängig voneinander entscheiden.

**Sanft scheitern (*graceful degradation*).**
Fehlt ein Block, springt die WooCommerce-Form ein. Fällt die Preis-Kopplung
weg, erscheint die eigene Preiszeile. Fehlt das Theme, greift die
Ersatz-Optik. Nichts davon bricht den Kauf.

**Nur laden, was gebraucht wird.**
Swiper (rund 80 KB) steckt nur in der Kartenauswahl, der gemeinsame Store
nur einmal im Browser. Die anderen Kauf-Blöcke haben je unter 2 KB JavaScript.

**Kommentare erklären das *Warum*, nicht das *Was*.**
Dass `ob_start()` einen Puffer startet, sieht man am Code. *Warum* wir das an
Priorität 29 tun, sieht man nicht – das steht im Kommentar.

**Einheitliche Präfixe.**
Alles heisst `gcb_…`, damit nichts mit anderen Plugins kollidiert.

**Barrierefreiheit mitdenken.**
`<fieldset>` mit `<legend>` für Gruppen, sichtbarer Fokusring (`:focus-visible`)
für Tastaturnutzer, `role="alert"` bei Fehlermeldungen, Sprung zum ersten
Fehler mit Fokus auf die Eingabe, „Bewegung reduzieren“ respektiert.

**Gegen das echte System testen.**
Viele Fehler in [Kapitel 15](#15-stolperfallen-die-wir-tatsächlich-erlebt-haben)
fielen erst auf, als wir gegen den laufenden Shop und den echten Editor
getestet haben – nicht beim Lesen des Codes.

---

## 15. Stolperfallen, die wir tatsächlich erlebt haben

Diese Fehler sind beim Bau passiert. Sie sind lehrreich, weil man sie beim
Lesen des Codes nicht sieht.

| Symptom | Ursache | Lösung |
|---|---|---|
| `batch` meldet 200, aber nichts liegt im Warenkorb | Jeder Teil-Auftrag prüft seinen **eigenen** Nonce; die Header des äusseren Requests werden nicht vererbt. | Nonce in **jedem** Teil-Auftrag mitschicken; die Status der Teil-Antworten prüfen. |
| Grusstext kommt bei `batch` nicht an | Teil-Aufträge liefern ihre Felder als *Body-Params*, nicht als JSON. | Filter liest beide Quellen. |
| Skript für den Warenkorb-Block wurde nie geladen | Registrierung am Hook `woocommerce_blocks_loaded` – zu spät. | Registrierung direkt beim Laden der Datei. |
| Alle Variantenknöpfe kamen gesperrt an | Getter existieren nur im Browser; der Server sah „leer“. | Getter zusätzlich als PHP-Closure. |
| Knopf „gross“ ohne Wirkung | Variante ohne Preis → von WooCommerce aussortiert, Wert trotzdem angeboten. | Nur Werte mit verfügbarer Variante anbieten. |
| Negativer Preis im Warenkorb | Aufschläge statt Endpreise in den Varianten | Endpreise pflegen ([Kapitel 12](#12-preise-und-varianten)). |
| Innenblöcke wussten nicht, ob der Satz vollständig ist | WordPress rendert Innenblöcke **vor** dem Rahmen. | Vollständigkeit vorher über `render_block_data` ermitteln. |
| Kartenslider falsch dargestellt, sobald er erscheint | Er ist beim Laden versteckt; Swiper hat an einem unsichtbaren Element gemessen. | `observer`/`observeParents` in Swiper. |
| Blöcke klebten auf der Seite aneinander, im Editor nicht | Theme-Abstand 0; Standardwerte werden nicht gespeichert, WordPress rechnet das Layout aber aus gespeicherten Werten. | Standard-Blockabstand per `render_block_data` ergänzen. |
| WooCommerce-Form verschwand auf einer Landingpage nicht | `get_the_ID()` lieferte die Seite statt des Produkts. | Produkt aus dem Block-Kontext lesen. |
| Store-Code mehrfach im Browser (drohte) | Ein `import` aus `store.js` hätte ihn in jede `view.js` kopiert. | Kein Import; gemeinsame Werte in den State. |
| Im Editor grössere Abstände als auf der Seite | Der Editor lädt das CSS **aller** registrierten Blöcke; ein alter Block setzte Abstände auf dieselben Klassen. | Alten Block entfernen; Klassen-Regeln eng fassen. |
| Ausgegraute Blöcke im Editor fast unsichtbar (drohte) | Die Blockklasse steht in der Vorschau doppelt ineinander; Deckkraft hätte sich multipliziert. | Über `data-type` ausgrauen, das nur die äussere Hülle trägt. |
| Plötzlich geänderte Dateien, die niemand angefasst hat | `wp-scripts lint-js --fix <datei>` formatiert trotzdem das ganze Projekt. | Nur eine Datei formatieren: `npx wp-scripts format <datei>`. Danach `git status` prüfen. |

---

## 16. Wartung: was tun, wenn …

**… ich etwas an `src/` geändert habe?**
Im Plugin-Ordner `npm run build` ausführen (oder während der Arbeit
`npm start`, das baut bei jeder Änderung automatisch). Sonst lädt WordPress
die alte Version aus `build/`.

**… WooCommerce aktualisiert wurde?**
Eine variable Produktseite öffnen und verschiedene Grössen anklicken. Springt
der Preis oben mit? Wenn nicht, hat WooCommerce seinen privaten Store geändert.
Der Kauf funktioniert trotzdem, und die Variantenauswahl zeigt automatisch eine
eigene Preiszeile, falls die Ladefunktion ganz fehlt. Anzupassen wären
`syncNativePrice` (`variant-selector/view.js`) und
`gcb_load_native_price_variations()` (`class-state.php`).

**… ein Produkt keinen „In den Warenkorb“-Knopf hat?**
- Steht der Rahmen „Grusskarten-Kauf“ im Template, und ist er vollständig? Im
  Editor zeigt der Rahmen einen Hinweis, wenn etwas fehlt.
- Ist es ein Bundle, gruppiertes oder externes Produkt? Dann sind unsere
  Blöcke nicht zuständig. Entweder das Produkt auf einfach/variabel umstellen
  oder im Site Editor den Block „Add to Cart with Options“ ins Template setzen –
  er wird bei unseren Produkten automatisch ausgeblendet.

**… keine Grusskarten erscheinen?**
Sind im Produkt unter „Bundle-sells“ Karten eingetragen? Stehen Checkbox,
Kartenauswahl und Grusstext alle im Rahmen?

**… eine Grösse nicht angeboten wird?**
Meist hat die Variante keinen Preis oder ist deaktiviert. Unter Produktdaten →
Variationen prüfen.

**… ein weiterer wesentlicher Block dazukommt?**
In `includes/purchase-blocks.json` eintragen – Editor und Server übernehmen ihn
von dort.

**… ich den Warenkorb „von innen“ sehen will?**
`http://floerlike.local/wp-json/wc/store/v1/cart` im Browser öffnen. Unter
`items[].extensions["greeting-card-block"]` stehen Gruppe, Rolle und
Elternposition.

---

## 17. Glossar

| Begriff | Erklärung |
|---|---|
| **Action (Hook)** | Haken, an dem eigener Code *zusätzlich* ausgeführt wird |
| **Action (Interactivity)** | Funktion in `view.js`, die auf ein Ereignis (Klick) reagiert |
| **ancestor** | Angabe in `block.json`: Block darf nur irgendwo unterhalb eines bestimmten Blocks stehen |
| **API** | vereinbarte Schnittstelle zwischen Programmen |
| **Attribut (Block)** | gespeicherte Einstellung eines Blocks, z. B. Anzahl sichtbarer Karten |
| **Batch** | mehrere Anfragen in einem Paket |
| **Block** | Baustein im WordPress-Editor |
| **Block-Kontext** | Daten, die ein Rahmen an seine Innenblöcke weiterreicht (z. B. `postId`) |
| **Build** | Übersetzen von `src/` nach `build/` mit `npm run build` |
| **Bundle-sells** | Feld von *Product Bundles*, in dem wir die Karten eines Produkts verknüpfen |
| **Callback** | Funktion, die von aussen aufgerufen wird (z. B. bei `data-wp-watch`) |
| **cart_item_data** | Zusatzdaten, die ein Plugin an eine Warenkorb-Position hängt |
| **Cart key** | interner Schlüssel einer Warenkorb-Position |
| **Closure** | Funktion ohne Namen, die man wie einen Wert weitergeben kann |
| **CSRF** | Angriff, bei dem eine fremde Seite Anfragen in deinem Namen schickt |
| **Derived State / Getter** | Wert, der aus anderen Werten berechnet wird |
| **Direktive** | `data-wp-…`-Attribut, das HTML mit dem State verbindet |
| **Endpunkt** | Adresse einer API, z. B. `/wc/store/v1/cart` |
| **Escape** | Text so umwandeln, dass er im HTML nicht als Code wirkt |
| **Filter (Hook)** | Haken, an dem ein Wert *verändert* werden kann |
| **Hook** | Stelle, an der WordPress/WooCommerce fremden Code aufruft |
| **Innenblock** | Block, der in einem anderen Block (Rahmen) steht |
| **Interactivity API** | WordPress-Werkzeug, um Blöcke im Browser reaktiv zu machen |
| **Interactivity-Kontext** | `data-wp-context`: Daten, die nur für ein bestimmtes HTML-Element gelten |
| **JSON** | Textformat für Daten, z. B. `{"name": "Rosen"}` |
| **Kauf-Block** | einer der fünf Blöcke im Rahmen „Grusskarten-Kauf“ |
| **Nonce** | Sicherheitsmarke gegen gefälschte Anfragen |
| **Progressive Enhancement** | Server liefert fertiges HTML, JavaScript verbessert nur |
| **Rahmen** | Block, der andere Blöcke enthält; hier „Grusskarten-Kauf“ |
| **Reaktiv** | Anzeige aktualisiert sich automatisch, wenn sich Daten ändern |
| **Sanitize** | Eingaben bereinigen, bevor sie gespeichert werden |
| **ServerSideRender** | Editor-Baustein, der einen Block vom Server rendern lässt |
| **Single Source of Truth** | eine Entscheidung wird an genau einer Stelle getroffen |
| **Skriptmodul** | moderne JavaScript-Datei (ES-Modul), von WordPress per ID registriert |
| **SSR** (*Server-Side Rendering*) | HTML wird auf dem Server erzeugt |
| **State** | die Daten, von denen die Anzeige abhängt |
| **Store (Interactivity)** | Sammlung aus State, Getter, Actions und Callbacks eines Namensraums |
| **Store API** | WooCommerce-Schnittstelle für Warenkorb und Kasse |
| **Variante** | Ausprägung eines variablen Produkts, z. B. Grösse „klein“ |
| **Vorschau-Produkt** | Produkt, mit dem die Kauf-Blöcke im Editor ihre Ausgabe zeigen |
| **XSS** | Angriff, bei dem eingeschleuster Code im Browser anderer ausgeführt wird |
