# Einrichtung: Grusskarte zu einem Produkt

Diese Schritte passieren **im WordPress-Admin**, nicht im Code. Wie alles
technisch zusammenhängt, erklärt [ARCHITEKTUR.md](ARCHITEKTUR.md).

Der Strauss ist ein ganz normales **einfaches oder variables Produkt**. Die
Karten hängen über das Feld **Bundle-sells** daran. Ein Produkt vom Typ
„Bundle“ braucht es nicht.

WooCommerce Product Bundles wird nur noch für dieses **Admin-Feld** gebraucht.
Seine eigene Warenkorb-Logik kommt bewusst nicht zum Einsatz: Sie funktioniert
nur über die klassische Add-to-Cart-Form und erzeugt im Warenkorb keine echte
Eltern-Kind-Beziehung. Beides übernimmt dieses Plugin selbst.

## 1. Produkte anlegen

1. **Grusskarten als einfache Produkte anlegen.** Produktbild = Kartenmotiv,
   Preis setzen. Katalog-Sichtbarkeit optional auf „Verborgen“.

2. **Strauss als normales Produkt anlegen.** Hat er Grössen oder Farben, ist er
   ein **variables Produkt** mit Attributen und Variationen wie gewohnt.
   - In jede Variation gehört der **Endpreis** (klein 35, mittel 45 …), kein
     Aufschlag.
   - Die **Reihenfolge der Variationen** (per Ziehen im Tab „Variationen“)
     ist die Reihenfolge der Knöpfe: oben = links.
   - Das Feld **„Durchmesser“** (direkt unter „Abmessungen“) erscheint im
     Knopf unter dem Wert, z. B. „ca. 35 cm Ø“ (abschaltbar). Freitext, so
     wie er dort steht.

3. **Karten verknüpfen:** Produktdaten → **Linked Products** → **Bundle-sells**.
   Dort die gewünschten Karten eintragen (nur einfache Produkte möglich).
   - **Bundle-sells title** und **discount:** leer lassen. Die Beschriftung der
     Checkbox stellst du im Block ein (Schritt 2), Rabatte über Product
     Bundles werden nicht verwendet.
   - Ohne Karten funktioniert der Kauf trotzdem, nur ohne Kartenoption.

4. **Grusskarte anbieten:** Oben im Kasten **Produktdaten**, neben „Virtuell“
   und „Herunterladbar“, den Haken bei **Grusskarte** setzen. Nur dann
   erscheint auf der Produktseite „Grusskarte hinzufügen“ – auch wenn Karten
   verknüpft sind. So lässt sich die Option je Produkt abschalten, ohne die
   verknüpften Karten zu verlieren.
   - Neue Produkte starten ohne Haken.
   - Produkte von vor diesem Schalter verhalten sich wie bisher (Option da,
     sobald Karten verknüpft sind), bis du sie einmal speicherst.

## 2. Blöcke ins Template setzen

1. Site Editor → **Templates → Einzelnes Produkt** öffnen.
2. Den Block **„Grusskarten-Kauf“** einfügen (Kategorie „Grusskarte & Kauf“).
   Er legt automatisch alle fünf Blöcke an:

   | Block | Aufgabe |
   |---|---|
   | Variantenauswahl | Grösse o. Ä. als Knöpfe |
   | Grusskarte hinzufügen | Checkbox |
   | Grusskarten-Auswahl | Slider mit den Karten |
   | Grusstext | Textfeld |
   | In den Warenkorb | Knopf |

3. **Anordnen:** Innerhalb des Rahmens lassen sich die Blöcke frei
   verschieben. Beliebige andere Blöcke (Überschriften, Absätze, Gruppen,
   Spalten, der Preis-Block …) dürfen dazwischen stehen. Die Kauf-Blöcke können
   den Rahmen aber nicht verlassen und stehen je nur einmal darin.

4. **Vorschau:** Die Blöcke zeigen im Editor ihre echte Ausgabe. Mit welchem
   Produkt, stellst du am Rahmen unter **Vorschau → Vorschau-Produkt** ein.
   Leer = automatisch ein variables Produkt mit Grusskarten.

5. **Den WooCommerce-Block „In den Warenkorb“ bzw. „Add to Cart with Options“
   im Template stehen lassen.** Er wird automatisch ausgeblendet, sobald man
   über unseren Rahmen kaufen kann. Würde man ihn entfernen, hätten Bundles,
   gruppierte und externe Produkte keinen Knopf mehr, weil dasselbe Template
   für den ganzen Shop gilt.

## 3. Einstellungen

Jeder Block hat eigene Einstellungen in der Seitenleiste rechts:

| Block | Einstellungen |
|---|---|
| Grusskarten-Kauf | Vorschau-Produkt, Blockabstand (Standard 1.5rem), Innenabstand, Breite |
| Variantenauswahl | Durchmesser in den Knöpfen, eigene Preiszeile (sinnvoll, wenn kein Preis-Block auf der Seite steht) |
| Grusskarte hinzufügen | Beschriftung |
| Grusskarten-Auswahl | sichtbare Karten Desktop / Mobil, letzte Karte anschneiden, Preis auf Karten, Pfeile, Punkte |
| Grusstext | Beschriftung, Platzhalter, Höchstlänge (bis 300) |
| In den Warenkorb | Beschriftung, Stil (Kontur / Gefüllt), Warenkorb-Symbol |

Das Aussehen von Knöpfen und Slider kommt aus dem Theme (`main.css`).

## 4. Wenn ein Block fehlt

Wird ein Kauf-Block gelöscht, zeigt der Rahmen im Editor einen Hinweis mit
**„Wiederherstellen“**, und die betroffenen Blöcke werden im Inhalt und in der
Listenansicht ausgegraut. Auf der Seite gilt:

| Es fehlt … | dann … |
|---|---|
| Checkbox, Kartenauswahl oder Grusstext | keine Grusskarten, Kauf ohne Karte geht |
| „In den Warenkorb“ (oder bei variablen Produkten die Variantenauswahl) | der Rahmen zeigt nichts, die normale WooCommerce-Form erscheint |

Kund:innen sehen nie einen halbfertigen Kaufbereich. Wer das Template
bearbeiten darf, sieht auf der Seite einen Hinweis, was fehlt.

## 5. Testen

- Strauss ohne Karte kaufen: eine Position im Warenkorb.
- Karte angehakt, aber keine Karte gewählt oder kein Text: Kauf wird verhindert,
  die Seite springt zum ersten Fehler.
- Strauss mit Karte kaufen: zwei Positionen, die Karte eingerückt darunter,
  mit dem Grusstext als Zusatzinformation.
- Menge des Strausses ändern: die Karte zieht nach.
- Strauss entfernen: die Karte verschwindet mit.
- Grösse wechseln: der Preis-Block springt auf den Preis der Variante.

## 6. Nach Code-Änderungen

Wer etwas in `src/` ändert, muss im Plugin-Ordner bauen:

```sh
npm install   # einmalig
npm run build # oder während der Arbeit: npm start
```

WordPress lädt nur, was in `build/` liegt.

## Ohne Product Bundles

Ist die Extension nicht aktiv, liest das Plugin die gespeicherte Kartenliste
direkt aus der Produkt-Meta `_wc_pb_bundle_sell_ids`. Bestehende Produkte
funktionieren auf der Seite also weiter, nur bearbeiten lässt sich die Liste im
Admin dann nicht mehr. Ein Hinweis im Plugins-Bildschirm weist darauf hin.
