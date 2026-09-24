# Wie das Grusskarten-Plugin funktioniert

Diese Datei erklärt, **was** das Plugin tut, **wie** die Daten durch das System
fliessen und **warum** es so gebaut ist. Sie setzt kein Vorwissen voraus: Jeder
Fachbegriff wird beim ersten Auftreten erklärt, und am Ende steht ein Glossar.

Für die reine Einrichtung im WooCommerce-Admin (Produkte anlegen, Karten
verknüpfen) gibt es die kürzere [SETUP.md](SETUP.md).

---

## Inhalt

1. [Worum geht es?](#1-worum-geht-es)
2. [Fünf Grundbegriffe vorab](#2-fünf-grundbegriffe-vorab)
3. [Die Dateien und ihre Aufgaben](#3-die-dateien-und-ihre-aufgaben)
4. [Der Weg eines Kaufs – Schritt für Schritt](#4-der-weg-eines-kaufs--schritt-für-schritt)
5. [Die Interactivity API](#5-die-interactivity-api)
6. [Die Store API](#6-die-store-api)
7. [Wie Strauss und Karte zusammenbleiben](#7-wie-strauss-und-karte-zusammenbleiben)
8. [Die Darstellung im Warenkorb](#8-die-darstellung-im-warenkorb)
9. [Die Produktseite: wer ist zuständig?](#9-die-produktseite-wer-ist-zuständig)
10. [Preise und Varianten](#10-preise-und-varianten)
11. [Sicherheit](#11-sicherheit)
12. [Best Practices, die im Code stecken](#12-best-practices-die-im-code-stecken)
13. [Stolperfallen, die wir tatsächlich erlebt haben](#13-stolperfallen-die-wir-tatsächlich-erlebt-haben)
14. [Wartung: was tun, wenn …](#14-wartung-was-tun-wenn-)
15. [Glossar](#15-glossar)

---

## 1. Worum geht es?

Eine Kundin ist auf der Produktseite eines Blumenstrausses. Sie kann:

1. eine **Grösse** wählen (klein / mittel / gross) – falls der Strauss Varianten hat,
2. optional eine **Grusskarte** dazunehmen und
3. einen **Grusstext** für die Karte schreiben.

Dann klickt sie auf „In den Warenkorb“. Im Warenkorb liegen danach **zwei
Positionen**: der Strauss und – eingerückt darunter – die Karte mit dem Text.
Wird der Strauss entfernt, verschwindet die Karte mit. Ändert sich die Menge
des Strausses, zieht die Karte nach.

Das klingt einfach. WooCommerce kann das aber nicht von Haus aus. Das Plugin
füllt diese Lücke.

**Wichtige Entscheidung im Hintergrund:** Früher war der Strauss ein Produkt
vom Typ „Bundle“ (aus der Extension *WooCommerce Product Bundles*). Das hatte
einen Haken: Pro Strauss brauchte man **zwei** Produkte (ein variables Produkt
für die Grössen und ein Bundle drumherum). Heute ist der Strauss ein ganz
normales Produkt, und die Karten werden im Feld **„Bundle-sells“** verknüpft.
Die Verbindung im Warenkorb baut das Plugin selbst.

---

## 2. Fünf Grundbegriffe vorab

Diese fünf Begriffe tauchen überall auf. Wenn du sie verstanden hast, verstehst
du den Rest.

### Server und Browser

Eine Webseite entsteht an **zwei Orten**:

- Auf dem **Server** (dort läuft PHP und WordPress). Er baut das HTML zusammen
  und schickt es los.
- Im **Browser** der Kundin (dort läuft JavaScript). Er zeigt das HTML an und
  reagiert auf Klicks.

Fast jede Frage in diesem Plugin lautet am Ende: *Passiert das auf dem Server
oder im Browser – und wie kommen die Daten von einem zum anderen?*

### Block

Ein **Block** ist ein Baustein, den man im WordPress-Editor auf eine Seite
setzt – wie ein Absatz oder ein Bild. Unser Plugin liefert einen Block namens
„Grusskarte + Produkt in den Warenkorb“. Er steckt im Template der
Produktseite.

### Hook (Action und Filter)

WordPress und WooCommerce rufen an vielen Stellen „Haken“ auf, an die man
eigenen Code hängen kann:

- Eine **Action** sagt: „Jetzt passiert gerade X – willst du etwas dazu tun?“
  Beispiel: `woocommerce_cart_item_removed` = „Gerade wurde eine Position aus
  dem Warenkorb entfernt.“
- Ein **Filter** sagt: „Hier ist ein Wert – willst du ihn verändern, bevor ich
  ihn benutze?“ Beispiel: `woocommerce_get_item_data` = „Das sind die
  Zusatzinfos zu einer Position – willst du welche ergänzen?“

Man hängt sich mit `add_action(...)` bzw. `add_filter(...)` ein. Der Grossteil
von `includes/class-integration.php` besteht aus solchen Haken.

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
  Warenkorb zu legen. → [Kapitel 6](#6-die-store-api)

Die Namen sind leider verwirrend ähnlich („Store“ taucht in beiden auf, meint
aber Verschiedenes). Merke dir: **Interactivity API = Anzeige im Browser**,
**Store API = Warenkorb auf dem Server**.

---

## 3. Die Dateien und ihre Aufgaben

```
greeting-card-block/
├── greeting-card-block.php                  ← Einstieg: lädt alles andere
├── includes/
│   ├── class-integration.php                ← Warenkorb-Logik (PHP-Hooks)
│   ├── class-store-api.php                  ← Zusatzdaten für die Store API
│   └── class-checkout-blocks-integration.php← lädt JS/CSS in den Warenkorb-Block
├── src/greeting-card-bundle/                ← der Block (Quellcode)
│   ├── block.json                           ← Steckbrief des Blocks
│   ├── render.php                           ← baut das HTML auf dem Server
│   ├── view.js                              ← Verhalten im Browser
│   ├── style.scss                           ← Aussehen
│   ├── edit.js / index.js / editor.scss     ← Darstellung im Editor
├── build/                                   ← automatisch erzeugt, nie von Hand ändern
├── assets/
│   ├── js/checkout-blocks.js                ← Einrückung der Karte im Warenkorb
│   └── css/checkout-blocks.css
├── SETUP.md                                 ← Einrichtung im Admin
└── ARCHITEKTUR.md                           ← diese Datei
```

**Wichtig zu `src/` und `build/`:** Du bearbeitest immer die Dateien in `src/`.
Der Befehl `npm run build` übersetzt sie nach `build/` (z. B. wird aus modernem
JavaScript browsertaugliches JavaScript, aus `.scss` wird `.css`). WordPress lädt
nur, was in `build/` liegt. Vergisst du den Build, siehst du deine Änderung
nicht.

---

## 4. Der Weg eines Kaufs – Schritt für Schritt

So fliessen die Daten, von der ersten Anfrage bis zur fertigen Bestellung:

```
 ┌──────────────────────────── SERVER (PHP) ────────────────────────────┐
 │                                                                      │
 │ ① Seite wird angefragt                                                │
 │    render.php liest aus WooCommerce:                                 │
 │      • Varianten (Grössen, Preise, Lagerstatus)                      │
 │      • verknüpfte Karten (Bundle-sells)                              │
 │    und legt sie in den "State" (Zustand) des Blocks.                 │
 │    Dann baut es das HTML mit den Knöpfen.                            │
 │                                                                      │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │  HTML + State (als JSON im Seitenquelltext)
                 ▼
 ┌──────────────────────────── BROWSER (JS) ────────────────────────────┐
 │                                                                      │
 │ ② view.js übernimmt den State und macht die Knöpfe klickbar.        │
 │ ③ Kundin wählt Grösse, Karte, schreibt Text.                        │
 │    Der State ändert sich, die Anzeige passt sich automatisch an.     │
 │ ④ Klick auf „In den Warenkorb“:                                      │
 │    view.js erzeugt eine Gruppen-Nummer und schickt EINEN Request     │
 │    mit zwei Aufträgen an die Store API:                              │
 │      – lege Strauss-Variante X in den Warenkorb (Rolle: parent)      │
 │      – lege Karte Y mit Text Z in den Warenkorb (Rolle: card)        │
 │                                                                      │
 └───────────────┬──────────────────────────────────────────────────────┘
                 │  POST /wp-json/wc/store/v1/batch
                 ▼
 ┌──────────────────────────── SERVER (PHP) ────────────────────────────┐
 │                                                                      │
 │ ⑤ WooCommerce prüft den Nonce (Sicherheitsmarke) und legt beide     │
 │    Produkte in den Warenkorb. Unser Filter hängt dabei Gruppe,       │
 │    Rolle und Text als cart_item_data an.                             │
 │ ⑥ Antwort: der komplette neue Warenkorb.                            │
 │                                                                      │
 └───────────────┬──────────────────────────────────────────────────────┘
                 ▼
 ┌──────────────────────────── BROWSER (JS) ────────────────────────────┐
 │ ⑦ view.js reicht den neuen Warenkorb an den Mini-Warenkorb weiter,  │
 │    damit das Symbol oben rechts sofort die richtige Zahl zeigt.      │
 └──────────────────────────────────────────────────────────────────────┘

 Später, beim Bezahlen:
 ⑧ Ein Hook schreibt Grusstext und Gruppe in die Bestellung, damit sie
    dort erhalten bleiben, wenn der Warenkorb längst geleert ist.
```

Die einzelnen Stationen erklären die nächsten Kapitel genauer.

---

## 5. Die Interactivity API

### Welches Problem löst sie?

Eine Webseite soll zwei Dinge können, die sich ein bisschen widersprechen:

1. **Schnell dastehen** – am besten kommt fertiges HTML vom Server, dann sieht
   man sofort etwas (und Suchmaschinen auch).
2. **Auf Klicks reagieren** – z. B. soll ein Knopf dunkel werden, wenn man ihn
   anklickt, ohne dass die Seite neu lädt.

Früher schrieb man dafür jQuery-Code nach dem Muster „wenn geklickt, suche
Element X und ändere Klasse Y“. Bei vielen Zuständen wird das schnell
unübersichtlich: Man vergisst eine Stelle, und die Anzeige passt nicht mehr
zum Zustand.

Die **Interactivity API** dreht das um. Du beschreibst nur noch:

- **welche Daten** es gibt (den *State*) und
- **welches Element von welchen Daten abhängt** (mit Attributen im HTML).

Den Rest – also „wenn sich die Daten ändern, aktualisiere alle abhängigen
Elemente“ – erledigt die API automatisch. Das nennt man **reaktiv**.

### Warum nicht React?

React macht Ähnliches, baut die Seite aber normalerweise **erst im Browser**
zusammen. Dann kommt zuerst eine leere Seite, und es muss viel mehr JavaScript
geladen werden. Die Interactivity API ist die offizielle WordPress-Lösung: Der
Server liefert fertiges HTML, und im Browser wird es nur noch „aufgeweckt“.
(Intern nutzt sie übrigens *Preact*, eine kleine React-Verwandte.)

### Die vier Zutaten

Alles, was in `view.js` steht, gehört zu einem dieser vier Töpfe:

| Zutat | Was ist das? | Beispiel aus unserem Plugin |
|---|---|---|
| **state** | die Daten | `selectedAttributes` (gewählte Grösse), `wantsCard`, `text` |
| **abgeleiteter state** (Getter) | Werte, die aus anderen *berechnet* werden | `matchedVariation` (welche Variante passt zur Auswahl?), `isValid` |
| **actions** | Funktionen, die bei Ereignissen laufen | `selectAttribute` (Knopf geklickt), `addToCart` |
| **callbacks** | Funktionen, die „nebenher“ laufen | `syncNativePrice`, `initSwiper` |

Dazu kommt der **context**: Daten, die nur für **ein** Element gelten. Jeder
Variantenknopf hat einen eigenen Context, z. B. `{ attributeName: "pa_groesse",
value: "klein" }`. So weiss derselbe Code bei jedem Knopf, um welchen es geht.

### Die Direktiven: wie das HTML mit den Daten verbunden wird

Im HTML stehen spezielle Attribute, die mit `data-wp-` beginnen. Sie heissen
**Direktiven**. Hier die, die wir benutzen, am echten Beispiel des
Variantenknopfs aus `render.php`:

```html
<label class="greeting-card-bundle__option"
       data-wp-context='{"attributeName":"pa_groesse","value":"klein"}'
       data-wp-class--is-selected="state.isOptionSelected"
       data-wp-class--is-unavailable="!state.isOptionAvailable">
  <input type="radio"
         data-wp-on--change="actions.selectAttribute"
         data-wp-bind--checked="state.isOptionSelected"
         data-wp-bind--disabled="!state.isOptionAvailable" />
  <span>klein</span>
</label>
```

Gelesen in normaler Sprache:

| Direktive | bedeutet |
|---|---|
| `data-wp-interactive="greeting-card-bundle"` (am äussersten Element) | „Ab hier gilt der Store mit diesem Namen.“ |
| `data-wp-context='{…}'` | „Dieses Element hat eigene Daten: Attribut *pa_groesse*, Wert *klein*.“ |
| `data-wp-on--change="actions.selectAttribute"` | „Wenn sich das ändert (Klick), rufe `selectAttribute` auf.“ |
| `data-wp-bind--checked="state.isOptionSelected"` | „Das Attribut `checked` ist genau dann gesetzt, wenn `isOptionSelected` wahr ist.“ |
| `data-wp-class--is-selected="state.isOptionSelected"` | „Die CSS-Klasse `is-selected` ist genau dann gesetzt, wenn …“ |
| `data-wp-text="state.charCounter"` | „Der Text dieses Elements ist immer der Wert von `charCounter`.“ |
| `data-wp-watch="callbacks.syncNativePrice"` | „Führe diese Funktion aus – und jedes Mal erneut, wenn sich Daten ändern, die sie liest.“ |
| `data-wp-init="callbacks.initSwiper"` | „Führe diese Funktion einmal aus, wenn das Element erscheint.“ |

Das `!` davor bedeutet „nicht“: `!state.isOptionAvailable` ist wahr, wenn die
Option *nicht* verfügbar ist.

### Ein Klick – was passiert genau?

1. Kundin klickt auf „klein“.
2. Das Radio-Element meldet `change` → `actions.selectAttribute` läuft.
3. Die Action liest aus dem Context „ich bin *pa_groesse* = *klein*“ und
   schreibt das in `state.selectedAttributes`.
4. Die API merkt: `selectedAttributes` hat sich geändert. Wer hängt davon ab?
   - `isOptionSelected` bei **allen** Knöpfen → wird neu berechnet → „klein“
     bekommt `is-selected`, die anderen verlieren es.
   - `matchedVariation` → findet jetzt die Variante „klein“.
   - `syncNativePrice` (ein Watch) → meldet die Variante an den Preis-Block.

Nirgends steht Code wie „entferne die Klasse bei den anderen Knöpfen“. Das
ergibt sich von selbst aus den Abhängigkeiten. **Das ist der Kern der Idee.**

### Server und Browser teilen sich den State

Der State entsteht auf dem Server in `render.php`:

```php
wp_interactivity_state('greeting-card-bundle', [
    'cards'              => $cards,
    'selectedAttributes' => $selected_attributes,
    // …
]);
```

WordPress schreibt diese Daten als JSON unsichtbar in den Seitenquelltext.
`view.js` bekommt sie dort automatisch als Startzustand. Du musst nichts
selbst übertragen.

Zusätzlich wertet WordPress die Direktiven **schon auf dem Server** aus. Steht
`data-wp-bind--checked="state.isOptionSelected"` im HTML und ist der Wert wahr,
schreibt der Server gleich `checked` ins HTML. Deshalb sieht die Seite schon
richtig aus, bevor JavaScript geladen ist.

**Die Falle dabei:** Abgeleitete Werte (Getter) stehen nur in `view.js`, also
im Browser. Der Server kennt sie nicht und behandelt sie als „leer“. Bei
`!state.isOptionAvailable` ergab „nicht leer“ = wahr – und **alle** Knöpfe kamen
gesperrt beim Browser an. Die Lösung: dieselben Getter zusätzlich als
PHP-Funktionen in den State legen (siehe `isOptionSelected` /
`isOptionAvailable` in `render.php`). WordPress rechnet sie beim Rendern aus
und überlässt danach dem Browser die JS-Version. **Die Logik muss in beiden
Sprachen gleich sein** – wer eine ändert, muss die andere mitziehen.

### Mit fremden Stores reden

Jedes Plugin hat seinen eigenen Store (unserer heisst
`greeting-card-bundle`). Man kann aber auch in den Store eines anderen Plugins
schreiben. Genau so springt der **native Preis-Block** mit:

- Der Preis-Block von WooCommerce liest aus dem Store `woocommerce/products`
  den Wert `variationId`. Ist er gesetzt, zeigt er den Preis dieser Variante,
  sonst die Preisspanne.
- Unser Callback `syncNativePrice` schreibt bei jeder Auswahl die passende
  `variationId` dort hinein.

Dieser Store ist **privat**: WooCommerce verlangt einen wörtlichen
Zugangstext („I acknowledge that …“) und kündigt damit an, dass er sich ändern
kann. Deshalb ist der Zugriff in `try … catch` verpackt: Klappt er nicht mehr,
zeigt der Preis-Block einfach die Spanne, und der Kauf funktioniert trotzdem.
→ siehe [Kapitel 14](#14-wartung-was-tun-wenn-).

---

## 6. Die Store API

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

Die Warenkorb- und Kassen-Blöcke von WooCommerce benutzen intern genau diese
Schnittstelle. Unser Block ist also „in guter Gesellschaft“.

Tipp zum Ausprobieren: Öffne im Browser
`http://floerlike.local/wp-json/wc/store/v1/cart` – du siehst deinen Warenkorb
als JSON.

### Warum `batch`?

Strauss und Karte sollen **gemeinsam** in den Warenkorb. Mit zwei einzelnen
Requests könnte der erste klappen und der zweite scheitern – dann läge der
Strauss ohne Karte im Warenkorb. `batch` schickt beides in einem Paket. Mit
`validation: 'require-all-validate'` werden alle Aufträge vorher geprüft.

So sieht der Request aus (vereinfacht, aus `view.js`):

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
Seitenaufruf erzeugt (`wp_create_nonce('wc_store_api')` in `render.php`) und
die nur deine echte Seite kennt. Jede Anfrage, die etwas verändert, muss sie im
Header `Nonce` mitschicken. Fehlt sie oder stimmt sie nicht, lehnt WooCommerce
ab (Fehler 401 bzw. 403).

### Eigene Felder mitschicken

`gcb_group`, `gcb_role` und `greeting_card_text` kennt WooCommerce nicht. Die
Store API lässt unbekannte Felder aber durch, und über den Filter
`woocommerce_store_api_add_to_cart_data` kann ein Plugin sie abgreifen. Genau
das tut der erste Filter in `class-integration.php`: Er liest die Felder,
**bereinigt** sie (siehe [Kapitel 11](#11-sicherheit)) und legt sie als
`cart_item_data` an die Position.

### Die Antwort ist der ganze Warenkorb

Nach `add-item` antwortet die Store API mit dem **kompletten** neuen
Warenkorb. `view.js` gibt ihn an den Datenspeicher der Warenkorb-Blöcke weiter
(`receiveCart`), damit das Warenkorb-Symbol sofort stimmt.

### Zusatzdaten in der Antwort (ExtendSchema)

Umgekehrt kann ein Plugin auch **eigene Daten in die Antwort** der Store API
hängen. `class-store-api.php` tut das mit
`woocommerce_store_api_register_endpoint_data()`: An jede Warenkorb-Position
kommt ein Abschnitt `extensions["greeting-card-block"]` mit Gruppe, Rolle,
Elternposition und Text. Den braucht die Darstellung im Warenkorb-Block
([Kapitel 8](#8-die-darstellung-im-warenkorb)).

---

## 7. Wie Strauss und Karte zusammenbleiben

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
2. Schlüssel können sich ändern bzw. Positionen können neu angelegt werden.

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
Änderung am Warenkorb läuft – egal, ob die Menge über den Warenkorb-Block, die
klassische Seite oder sonst wie geändert wurde. Ein Hook, der alle Wege
abdeckt, ist robuster als mehrere, die einzelne Wege abdecken.

---

## 8. Die Darstellung im Warenkorb

Der Warenkorb-Block ist eine eigene React-Anwendung von WooCommerce. Auf sein
HTML hat man keinen direkten Zugriff. WooCommerce bietet dafür zwei offizielle
Wege, und wir nutzen beide:

1. **Daten hineinbringen:** über die Store-API-Erweiterung aus
   [Kapitel 6](#zusatzdaten-in-der-antwort-extendschema). Jede Position hat
   dann `extensions["greeting-card-block"]` mit `role` und `parentKey`.

2. **Darstellung beeinflussen:** über sogenannte **Checkout-Filter**. In
   `assets/js/checkout-blocks.js` registrieren wir den Filter `cartItemClass`.
   Er bekommt jede Position und darf CSS-Klassen ergänzen. Ist die Rolle
   `card`, hängen wir `gcb-item--card` an. `checkout-blocks.css` rückt solche
   Positionen dann ein und zeichnet eine kleine Verbindungslinie.

Damit unser Skript überhaupt im Warenkorb-Block landet, meldet
`class-checkout-blocks-integration.php` es über die offizielle
`IntegrationInterface` an – an den Hooks
`woocommerce_blocks_cart_block_registration` (und `…mini-cart…`,
`…checkout…`).

---

## 9. Die Produktseite: wer ist zuständig?

Auf einer Produktseite darf es **genau einen** „In den Warenkorb“-Knopf geben.
Wenn unser Block zuständig ist, muss WooCommerces eigenes Formular
verschwinden – und umgekehrt.

### Eine Regel, an einem Ort

Die Frage „Ist unser Block zuständig?“ beantwortet **eine einzige Funktion**:
`gcb_handles_product()`. Sie sagt ja für **einfache** und **variable**
Produkte. Für Bundles, gruppierte und externe Produkte sagt sie nein – deren
Formulare baut unser Block nicht nach.

Diese eine Funktion benutzen alle Stellen:

- `render.php`: Nicht zuständig? Dann gib nichts aus.
- die „Weiche“ in `class-integration.php`: Zuständig? Dann unterdrücke
  WooCommerces Formular.

Würden beide Stellen eigene Regeln haben, könnten sie irgendwann
auseinanderlaufen – und ein Produkt hätte zwei oder gar keinen Knopf. Dieses
Prinzip heisst **Single Source of Truth**: eine Wahrheit, an einem Ort.

Ob die **Kartenauswahl** erscheint, ist eine zweite, getrennte Frage:
`gcb_is_card_parent()` – gibt es Karten unter „Bundle-sells“?

### Wie das native Formular unterdrückt wird

Je nach Aufbau des Templates erzeugt WooCommerce sein Formular auf
unterschiedliche Weise. Wir fangen beide ab:

- **Klassischer Hook** (`woocommerce_single_product_summary`, Priorität 30):
  Wir starten bei Priorität 29 einen Ausgabe-Puffer (`ob_start`) und werfen bei
  31 alles weg, was dazwischen ausgegeben wurde (`ob_end_clean`). Nur genau
  dieses eine Formular verschwindet.
- **Block im Template** (`woocommerce/add-to-cart-form` bzw.
  `add-to-cart-with-options`): Der Filter `render_block` ersetzt seine Ausgabe
  durch einen leeren Text.

Zusätzlich schalten wir die eigene Kartenauswahl von *Product Bundles* ab,
damit es nie zwei Kartenauswahlen gibt.

---

## 10. Preise und Varianten

### Wie WooCommerce Preise denkt

Bei einem **variablen Produkt** hat **jede Variante ihren eigenen, vollen
Preis**. Das Hauptprodukt hat keinen Preis – ein dort eingetragener Wert wird
ignoriert. „Grundpreis + Aufschlag“ kennt WooCommerce nicht.

Deshalb: In jede Variante gehört der **Endpreis** (z. B. klein 35, mittel 45,
gross 55), nicht der Aufschlag (−10, 0, +10). Sonst landet im Warenkorb
wörtlich ein negativer Preis.

### Welche Varianten angeboten werden

`render.php` fragt WooCommerce nach den **verfügbaren** Varianten
(`get_available_variations()`). Varianten ohne Preis sortiert WooCommerce dort
aus. Zusätzlich blendet `render.php` Attributwerte aus, zu denen es gar keine
verfügbare Variante gibt – sonst gäbe es einen Knopf „gross“, zu dem man nichts
kaufen kann.

Im Browser prüft `isOptionAvailable` bei jedem Knopf: *Gibt es mit diesem Wert –
zusammen mit dem, was bei anderen Attributen schon gewählt ist – eine
kaufbare Variante?* Wenn nein, wird der Knopf ausgegraut und gesperrt.

### Warum Radio-Buttons, die wie Knöpfe aussehen?

Die Variantenauswahl besteht aus echten `<input type="radio">`, die per CSS
unsichtbar gemacht und durch das `<label>` als Knopf dargestellt werden. Das
bringt „nur einer gleichzeitig“ **gratis vom Browser** – ohne eigene Logik.
Ausserdem funktionieren Pfeiltasten und Screenreader (Vorleseprogramme für
blinde Menschen) korrekt. Wichtig dabei: Das Radio wird nicht mit
`display: none` versteckt, sondern nur optisch – sonst wäre es für Tastatur und
Screenreader ebenfalls verschwunden.

---

## 11. Sicherheit

Die wichtigste Regel im Web: **Alles, was aus dem Browser kommt, ist
verdächtig.** Die Kundin (oder ein Angreifer) kann jede Anfrage verändern. Der
Server muss deshalb alles prüfen.

Zwei Grundprinzipien ziehen sich durch das ganze Plugin:

### Eingaben bereinigen (*sanitize*)

Bevor etwas aus einer Anfrage gespeichert wird, wird es bereinigt:

| Eingabe | Funktion | Wirkung |
|---|---|---|
| `gcb_group` | `sanitize_key()` | nur Kleinbuchstaben, Ziffern, `-` und `_` bleiben übrig |
| `gcb_role` | Vergleich mit fester Liste | alles ausser `card` wird zu `parent` |
| `greeting_card_text` | `sanitize_textarea_field()` + `mb_substr(…, 0, 300)` | HTML-Tags werden entfernt, Länge wird begrenzt |

### Ausgaben escapen (*escape*)

Bevor etwas ins HTML geschrieben wird, wird es „entschärft“, damit es nicht als
Code ausgeführt werden kann. Sonst könnte jemand z. B. einen Grusstext
`<script>…</script>` einschleusen – diese Angriffsart heisst **XSS**
(*Cross-Site Scripting*).

| Funktion | für |
|---|---|
| `esc_html()` | normalen Text |
| `esc_attr()` | Werte in HTML-Attributen (`value="…"`) |
| `esc_url()` | Adressen (`src="…"`, `href="…"`) |
| `wp_kses_post()` | HTML, das bewusst erlaubt ist (z. B. Preis mit `<span>`) |
| `wp_interactivity_data_wp_context()` | den Context als JSON im Attribut |

Merksatz: **Beim Speichern bereinigen, beim Ausgeben escapen.** Beides, nicht
nur eins von beiden.

### Weitere Schutzschichten

- **Nonce** gegen gefälschte Anfragen ([Kapitel 6](#der-nonce--eine-sicherheitsmarke)).
- **Keine Preislogik aus dem Browser:** Der Browser sagt nur *welches* Produkt,
  nie *zu welchem Preis*. Den Preis bestimmt immer WooCommerce auf dem Server.
- **Hinweis für die Zukunft:** Welche Karte als `card` in den Warenkorb kommt,
  wird aktuell nicht gegen die Bundle-sells-Liste des Strausses geprüft. Das
  ist harmlos, solange Karten keinen Rabatt bekommen. Führt man einen
  Kartenrabatt ein, **muss** diese Prüfung ergänzt werden – sonst könnte man
  beliebige Produkte als „Karte“ rabattiert kaufen.

---

## 12. Best Practices, die im Code stecken

Jeweils: was, und **warum**.

**Nicht gegen die Plattform arbeiten.**
Endpreise statt Aufschläge, echte Radio-Buttons statt selbstgebauter
Auswahllogik, offizielle Hooks statt Umbauten an WooCommerce-Dateien. Jede
Abweichung vom „normalen“ Weg muss man an vielen Stellen nachbauen und bei
jedem Update neu prüfen.

**Server zuerst, Browser verbessert nur.**
Die Seite kommt fertig vom Server, JavaScript macht sie nur interaktiv. Fachwort:
*Progressive Enhancement*. Vorteil: schnell, suchmaschinenfreundlich, robust.

**Eine Wahrheit an einem Ort.**
`gcb_handles_product()` für die Zuständigkeit, die Gruppen-Nummer für die
Zusammengehörigkeit, der State für die Anzeige. Nie zwei Stellen, die dasselbe
unabhängig voneinander entscheiden.

**Sanft scheitern (*graceful degradation*).**
Fällt die experimentelle Preis-Kopplung weg, zeigt der Block seine eigene
Preiszeile. Klappt der Zugriff auf den fremden Store nicht, bleibt die
Preisspanne stehen. Ohne Product Bundles werden gespeicherte Karten trotzdem
gelesen. Nichts davon bricht den Kauf.

**Kommentare erklären das *Warum*, nicht das *Was*.**
Dass `ob_start()` einen Puffer startet, sieht man am Code. *Warum* wir das an
Priorität 29 tun, sieht man nicht – das steht im Kommentar.

**Einheitliche Präfixe.**
Alles heisst `gcb_…`, damit nichts mit anderen Plugins kollidiert.

**Barrierefreiheit mitdenken.**
`<fieldset>` mit `<legend>` für Gruppen, sichtbarer Fokusring (`:focus-visible`)
für Tastaturnutzer, `role="alert"` bei Fehlermeldungen, damit Screenreader sie
vorlesen.

**Gegen das echte System testen.**
Viele Fehler in [Kapitel 13](#13-stolperfallen-die-wir-tatsächlich-erlebt-haben)
fielen erst auf, als wir gegen den laufenden Shop getestet haben – nicht beim
Lesen des Codes.

---

## 13. Stolperfallen, die wir tatsächlich erlebt haben

Diese Fehler sind beim Bau passiert. Sie sind lehrreich, weil man sie beim
Lesen des Codes nicht sieht.

| Symptom | Ursache | Lösung |
|---|---|---|
| `batch` meldet 200, aber nichts liegt im Warenkorb | Jeder Teil-Auftrag prüft seinen **eigenen** Nonce; die Header des äusseren Requests werden nicht vererbt. Die Teile antworteten mit 401. | Nonce in **jedem** Teil-Auftrag mitschicken. Ausserdem die Status der Teil-Antworten prüfen, nicht nur den des Batch. |
| Grusstext kommt bei `batch` nicht an | Teil-Aufträge liefern ihre Felder als *Body-Params*, nicht als JSON. `get_json_params()` war leer. | Filter liest beide Quellen. |
| Skript für den Warenkorb-Block wurde nie geladen | Die Registrierung hing am Hook `woocommerce_blocks_loaded` – zu spät, die Registry war schon fertig. | Registrierung direkt beim Laden der Datei. |
| Alle Variantenknöpfe kamen gesperrt an | Getter existieren nur im Browser; der Server sah „leer“. | Getter zusätzlich als PHP-Closure ([Kapitel 5](#server-und-browser-teilen-sich-den-state)). |
| Knopf „gross“ ohne Wirkung, Meldung „Bitte wählen“ | Variante ohne Preis → von WooCommerce aussortiert, aber der Wert wurde trotzdem angeboten. | Nur Werte mit verfügbarer Variante anbieten, klare Meldungen trennen. |
| Negativer Preis im Warenkorb | Aufschläge statt Endpreise in den Varianten | Endpreise pflegen ([Kapitel 10](#10-preise-und-varianten)) |
| Plötzlich geänderte Dateien, die niemand angefasst hat | `wp-scripts lint-js --fix <datei>` formatiert trotzdem das ganze Projekt. | Nur eine Datei formatieren: `npx wp-scripts format <datei>`. Danach immer `git status` prüfen. |

---

## 14. Wartung: was tun, wenn …

**… ich etwas an `render.php`, `view.js` oder `style.scss` geändert habe?**
Im Plugin-Ordner `npm run build` ausführen. Sonst lädt WordPress die alte
Version aus `build/`.

**… WooCommerce aktualisiert wurde?**
Eine variable Produktseite öffnen und verschiedene Grössen anklicken. Springt
der Preis oben mit? Wenn nicht, hat WooCommerce seinen privaten Store geändert.
Der Kauf funktioniert trotzdem; nur die Preisanzeige muss angepasst werden
(`syncNativePrice` in `view.js` und `$native_price_sync` in `render.php`).

**… ein Produkt keinen „In den Warenkorb“-Knopf hat?**
Ist es ein Bundle, gruppiertes oder externes Produkt? Dann ist unser Block
nicht zuständig, und das Template enthält keine native Form. Entweder das
Produkt auf einfach/variabel umstellen oder im Site Editor den Block „Add to
Cart with Options“ ins Template setzen – die Weiche blendet ihn bei unseren
Produkten automatisch aus.

**… eine Grösse nicht angeboten wird?**
Meist hat die Variante keinen Preis oder ist deaktiviert. Unter Produktdaten →
Variationen prüfen.

**… ich den Warenkorb „von innen“ sehen will?**
`http://floerlike.local/wp-json/wc/store/v1/cart` im Browser öffnen. Unter
`items[].extensions["greeting-card-block"]` stehen Gruppe, Rolle und
Elternposition.

---

## 15. Glossar

| Begriff | Erklärung |
|---|---|
| **Action (Hook)** | Haken, an dem eigener Code *zusätzlich* ausgeführt wird |
| **Action (Interactivity)** | Funktion in `view.js`, die auf ein Ereignis (Klick) reagiert |
| **API** | vereinbarte Schnittstelle zwischen Programmen |
| **Batch** | mehrere Anfragen in einem Paket |
| **Block** | Baustein im WordPress-Editor |
| **Build** | Übersetzen von `src/` nach `build/` mit `npm run build` |
| **Bundle-sells** | Feld von *Product Bundles*, in dem wir die Karten eines Produkts verknüpfen |
| **Callback** | Funktion, die von aussen aufgerufen wird (z. B. bei `data-wp-watch`) |
| **cart_item_data** | Zusatzdaten, die ein Plugin an eine Warenkorb-Position hängt |
| **Cart key** | interner Schlüssel einer Warenkorb-Position |
| **Closure** | Funktion ohne Namen, die man wie einen Wert weitergeben kann |
| **Context** | Daten, die nur für ein bestimmtes HTML-Element gelten |
| **CSRF** | Angriff, bei dem eine fremde Seite Anfragen in deinem Namen schickt |
| **Derived State / Getter** | Wert, der aus anderen Werten berechnet wird |
| **Direktive** | `data-wp-…`-Attribut, das HTML mit dem State verbindet |
| **Endpunkt** | Adresse einer API, z. B. `/wc/store/v1/cart` |
| **Escape** | Text so umwandeln, dass er im HTML nicht als Code wirkt |
| **Filter (Hook)** | Haken, an dem ein Wert *verändert* werden kann |
| **Hook** | Stelle, an der WordPress/WooCommerce fremden Code aufruft |
| **Interactivity API** | WordPress-Werkzeug, um Blöcke im Browser reaktiv zu machen |
| **JSON** | Textformat für Daten, z. B. `{"name": "Rosen"}` |
| **Nonce** | Sicherheitsmarke gegen gefälschte Anfragen |
| **Progressive Enhancement** | Server liefert fertiges HTML, JavaScript verbessert nur |
| **Reaktiv** | Anzeige aktualisiert sich automatisch, wenn sich Daten ändern |
| **Sanitize** | Eingaben bereinigen, bevor sie gespeichert werden |
| **Single Source of Truth** | eine Entscheidung wird an genau einer Stelle getroffen |
| **SSR** (*Server-Side Rendering*) | HTML wird auf dem Server erzeugt |
| **State** | die Daten, von denen die Anzeige abhängt |
| **Store (Interactivity)** | Sammlung aus State, Actions und Callbacks eines Blocks |
| **Store API** | WooCommerce-Schnittstelle für Warenkorb und Kasse |
| **Variante** | Ausprägung eines variablen Produkts, z. B. Grösse „klein“ |
| **XSS** | Angriff, bei dem eingeschleuster Code im Browser anderer ausgeführt wird |
