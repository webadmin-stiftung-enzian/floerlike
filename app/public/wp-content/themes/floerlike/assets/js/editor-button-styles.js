/**
 * Stile des Button-Blocks im Editor ("Stile" rechts in der Seitenleiste).
 *
 * Der Kern registriert "fill" (Füllen) und "outline" (Umriss) selbst in
 * JavaScript -- umbenennen lassen sie sich deshalb nur hier, nicht in PHP.
 * Alle vier Stile stehen darum an dieser einen Stelle, in der Reihenfolge,
 * in der sie im Editor erscheinen. Das Aussehen steht in main.css (BUTTONS).
 *
 * Die Namen sind kurz, weil die Stil-Knöpfe nur rund 13 Zeichen zeigen
 * ("Rand auf dunkel" wurde schon abgeschnitten). Erst der Untergrund, auf
 * dem der Button steht, dann die Form. Im zweispaltigen Raster der
 * Seitenleiste steht so oben "Hell", unten "Dunkel", links "Voll", rechts
 * "Rand".
 *
 * Die Kennungen (name) bleiben bei bestehenden Stilen gleich, sonst verlören
 * schon gesetzte Buttons ihren Stil: "outline" ist der Kern-Stil, der hier
 * "Dunkel · Rand" ist, "outline-dark" hiess früher "Umriss dunkel".
 */
wp.domReady( () => {
	wp.blocks.unregisterBlockStyle( 'core/button', [
		'fill',
		'outline',
		'outline-dark',
	] );

	[
		{ name: 'fill', label: 'Hell · Voll', isDefault: true },
		{ name: 'outline-dark', label: 'Hell · Rand' },
		{ name: 'fill-on-dark', label: 'Dunkel · Voll' },
		{ name: 'outline', label: 'Dunkel · Rand' },
	].forEach( ( style ) =>
		wp.blocks.registerBlockStyle( 'core/button', style )
	);
} );
