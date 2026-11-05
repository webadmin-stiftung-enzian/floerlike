<?php

/**
 * My Account navigation
 *
 * This template can be overridden by copying it to yourtheme/woocommerce/myaccount/navigation.php.
 *
 * HOWEVER, on occasion WooCommerce will need to update template files and you
 * (the theme developer) will need to copy the new files to your theme to
 * maintain compatibility. We try to do this as little as possible, but it does
 * happen. When this occurs the version of the template file will be bumped and
 * the readme will list any important changes.
 *
 * @see     https://woocommerce.com/document/template-structure/
 * @package WooCommerce\Templates
 * @version 9.3.0
 */

if (! defined('ABSPATH')) {
	exit;
}

do_action('woocommerce_before_account_navigation');
?>
<?php
// Aktuelle Unterseite, z. B. "orders" oder "view-order". Leer wäre das
// Dashboard -- das gibt es nicht mehr, /my-account/ leitet auf die
// Bestellungen weiter (functions.php); der Titel bleibt trotzdem abgesichert.
$current_endpoint = WC()->query->get_current_endpoint();
$page_title       = $current_endpoint
	? WC()->query->get_endpoint_title($current_endpoint)
	: __('Dashboard', 'woocommerce');

// Abmelden ist eine Aktion, kein Bereich: es steht nicht als Pille im Menü
// (functions.php nimmt es heraus), sondern klein darüber, zusammen mit dem
// Namen -- so ist auch klar, mit welchem Konto man angemeldet ist.
$current_user = wp_get_current_user();
?>
<p class="floerlike-account-status">
	<span class="heading mittel">
		<?php
		/* translators: %s: Anzeigename des Kunden */
		printf(esc_html__('Angemeldet als %s', 'floerlike'), esc_html($current_user->display_name));
		?>
	</span>
	<a class="floerlike-account-status__logout icon icon--logout heading klein" href="<?php echo esc_url(wc_logout_url()); ?>">
		<?php esc_html_e('Log out', 'woocommerce'); ?>
	</a>
</p>
<h1 class="heading gross"><?php echo esc_html($page_title); ?></h1>
<nav class="woocommerce-MyAccount-navigation" aria-label="<?php esc_html_e('Account pages', 'woocommerce'); ?>">
	<ul>
		<?php foreach (wc_get_account_menu_items() as $endpoint => $label) : ?>
			<li class="<?php echo wc_get_account_menu_item_classes($endpoint); ?>">
				<a href="<?php echo esc_url(wc_get_account_endpoint_url($endpoint)); ?>" <?php echo wc_is_current_account_menu_item($endpoint) ? 'aria-current="page"' : ''; ?>>
					<?php echo esc_html($label); ?>
				</a>
			</li>
		<?php endforeach; ?>
	</ul>
</nav>

<?php do_action('woocommerce_after_account_navigation'); ?>