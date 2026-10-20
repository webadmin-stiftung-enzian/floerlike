<?php

/**
 * Filter-Tags: welche Produkt-Schlagwörter als Knopf im Filter erscheinen.
 *
 * Statt Tags von Produkten zu nehmen, wenn ein Anlass vorbei ist, bekommt
 * jedes Schlagwort eigene Felder (Produkte → Schlagwörter → bearbeiten):
 *
 *   Im Filter zeigen     an/aus
 *   Sichtbar von / bis   optionaler Zeitraum
 *   Jährlich wiederholen nur Tag und Monat zählen (Valentinstag, Muttertag …)
 *   Reihenfolge          Position des Knopfs
 *
 * Die Zuordnung Tag ↔ Produkt bleibt dabei immer stehen. Gespeichert als
 * Term-Meta am Schlagwort. Siehe Spezifikation, Kapitel 3.
 *
 * @package ProductShowcaseBlock
 */

if (! defined('ABSPATH')) {
    exit;
}

const PSB_TAG_TAXONOMY = 'product_tag';

/**
 * Die Felder mit Speicher-Schlüssel und Bereinigung -- an einer Stelle,
 * damit Formular, Speichern und Auslesen nicht auseinanderlaufen.
 *
 * @return array<string, array{meta: string, sanitize: callable}>
 */
function psb_filter_tag_fields()
{
    return [
        'in_filter' => ['meta' => '_psb_in_filter', 'sanitize' => 'psb_sanitize_flag'],
        'from'      => ['meta' => '_psb_from', 'sanitize' => 'psb_sanitize_date'],
        'until'     => ['meta' => '_psb_until', 'sanitize' => 'psb_sanitize_date'],
        'yearly'    => ['meta' => '_psb_yearly', 'sanitize' => 'psb_sanitize_flag'],
        'order'     => ['meta' => '_psb_order', 'sanitize' => 'psb_sanitize_order'],
    ];
}

/** Checkbox: "1" oder leer. */
function psb_sanitize_flag($value)
{
    return $value ? '1' : '';
}

/** Datum als JJJJ-MM-TT, wie es ein <input type="date"> liefert; sonst leer. */
function psb_sanitize_date($value)
{
    $value = trim((string) $value);
    if (! preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)) {
        return '';
    }

    return checkdate((int) $m[2], (int) $m[3], (int) $m[1]) ? $value : '';
}

/** Reihenfolge: ganze Zahl, Standard 0. */
function psb_sanitize_order($value)
{
    return (string) (int) $value;
}

/**
 * Einstellungen eines Schlagworts.
 *
 * @param int $term_id
 * @return array{in_filter: bool, from: string, until: string, yearly: bool, order: int}
 */
function psb_get_filter_tag_settings($term_id)
{
    $settings = [];
    foreach (psb_filter_tag_fields() as $key => $field) {
        $settings[$key] = (string) get_term_meta($term_id, $field['meta'], true);
    }

    return [
        'in_filter' => '1' === $settings['in_filter'],
        'from'      => $settings['from'],
        'until'     => $settings['until'],
        'yearly'    => '1' === $settings['yearly'],
        'order'     => (int) $settings['order'],
    ];
}

/**
 * Steht das Schlagwort an diesem Tag im Filter?
 *
 * Jährlich: nur Monat und Tag zählen. Ein Zeitraum darf über den
 * Jahreswechsel gehen (1.12.–6.1.): liegt "bis" vor "von", gilt er von
 * "von" bis Jahresende und von Jahresanfang bis "bis". Der 29.2. zählt in
 * Nicht-Schaltjahren als 28.2.
 *
 * Einmalig: ganze Daten. Ein fehlendes "von" bzw. "bis" heisst "offen".
 *
 * @param int         $term_id
 * @param string|null $today JJJJ-MM-TT; null = heute in der Zeitzone der Website.
 * @return bool
 */
function psb_is_filter_tag_active($term_id, $today = null)
{
    $settings = psb_get_filter_tag_settings($term_id);

    return psb_is_period_active($settings, $today);
}

/**
 * Kern der Prüfung, ohne Datenbank -- so lässt er sich direkt testen.
 *
 * @param array       $settings wie psb_get_filter_tag_settings().
 * @param string|null $today    JJJJ-MM-TT; null = heute.
 * @return bool
 */
function psb_is_period_active(array $settings, $today = null)
{
    if (empty($settings['in_filter'])) {
        return false;
    }

    $today = $today ?: current_datetime()->format('Y-m-d');
    $from  = $settings['from'] ?? '';
    $until = $settings['until'] ?? '';

    if ('' === $from && '' === $until) {
        return true;
    }

    if (empty($settings['yearly'])) {
        return ('' === $from || $today >= $from) && ('' === $until || $today <= $until);
    }

    $is_leap  = (bool) gmdate('L', strtotime($today));
    $month_day = static function ($date, $fallback) use ($is_leap) {
        $md = '' === $date ? $fallback : substr($date, 5);

        return (! $is_leap && '02-29' === $md) ? '02-28' : $md;
    };

    $now   = substr($today, 5);
    $start = $month_day($from, '01-01');
    $end   = $month_day($until, '12-31');

    if ($start <= $end) {
        return $now >= $start && $now <= $end;
    }

    // Über den Jahreswechsel.
    return $now >= $start || $now <= $end;
}

/**
 * Alle Schlagwörter, die heute im Filter stehen, in ihrer Reihenfolge
 * (dann alphabetisch).
 *
 * @param string|null $today JJJJ-MM-TT; null = heute.
 * @return WP_Term[]
 */
function psb_get_filter_tags($today = null)
{
    $terms = get_terms([
        'taxonomy'   => PSB_TAG_TAXONOMY,
        'hide_empty' => true,
        'meta_query' => [['key' => '_psb_in_filter', 'value' => '1']], // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query -- wenige Schlagwörter
    ]);

    if (is_wp_error($terms)) {
        return [];
    }

    $active = array_values(array_filter($terms, static function ($term) use ($today) {
        return psb_is_filter_tag_active($term->term_id, $today);
    }));

    usort($active, static function ($a, $b) {
        $order = psb_get_filter_tag_settings($a->term_id)['order'] <=> psb_get_filter_tag_settings($b->term_id)['order'];

        return 0 !== $order ? $order : strcasecmp($a->name, $b->name);
    });

    return $active;
}

/* ---------------------------------------------------------------------------
   Admin: Felder beim Anlegen und Bearbeiten eines Schlagworts
   --------------------------------------------------------------------------- */

/**
 * Die Eingabefelder. $settings leer = neues Schlagwort.
 *
 * @param array $settings
 * @param bool  $as_table Bearbeiten-Seite (Tabellenzeilen) statt Anlegen-Formular.
 */
function psb_render_filter_tag_fields(array $settings, $as_table)
{
    $s = wp_parse_args($settings, ['in_filter' => false, 'from' => '', 'until' => '', 'yearly' => false, 'order' => 0]);

    $rows = [
        [
            'label' => __('Im Filter zeigen', 'product-showcase-block'),
            'field' => sprintf(
                '<label><input type="checkbox" name="psb[in_filter]" value="1"%s /> %s</label>',
                checked($s['in_filter'], true, false),
                esc_html__('Als Knopf im Filter des Schaufensters anbieten', 'product-showcase-block')
            ),
            'help'  => __('Die Zuordnung zu den Produkten bleibt immer bestehen – hier wird nur der Knopf ein- und ausgeschaltet.', 'product-showcase-block'),
        ],
        [
            'label' => __('Sichtbar von / bis', 'product-showcase-block'),
            'field' => sprintf(
                '<input type="date" name="psb[from]" value="%s" aria-label="%s" /> – <input type="date" name="psb[until]" value="%s" aria-label="%s" />',
                esc_attr($s['from']),
                esc_attr__('Sichtbar von', 'product-showcase-block'),
                esc_attr($s['until']),
                esc_attr__('Sichtbar bis', 'product-showcase-block')
            ),
            'help'  => __('Optional. Leer = immer, solange „Im Filter zeigen“ an ist.', 'product-showcase-block'),
        ],
        [
            'label' => __('Jährlich wiederholen', 'product-showcase-block'),
            'field' => sprintf(
                '<label><input type="checkbox" name="psb[yearly]" value="1"%s /> %s</label>',
                checked($s['yearly'], true, false),
                esc_html__('Nur Tag und Monat zählen, jedes Jahr wieder', 'product-showcase-block')
            ),
            'help'  => __('Für wiederkehrende Anlässe wie Valentinstag. Darf über den Jahreswechsel gehen (z. B. 1.12.–6.1.).', 'product-showcase-block'),
        ],
        [
            'label' => __('Reihenfolge im Filter', 'product-showcase-block'),
            'field' => sprintf('<input type="number" name="psb[order]" value="%d" step="1" class="small-text" />', (int) $s['order']),
            'help'  => __('Kleinere Zahl = weiter vorne. Bei Gleichstand alphabetisch.', 'product-showcase-block'),
        ],
    ];

    wp_nonce_field('psb_filter_tag', 'psb_filter_tag_nonce');

    foreach ($rows as $row) {
        if ($as_table) {
            printf(
                '<tr class="form-field"><th scope="row">%s</th><td>%s<p class="description">%s</p></td></tr>',
                esc_html($row['label']),
                $row['field'], // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- oben escaped
                esc_html($row['help'])
            );
        } else {
            printf(
                '<div class="form-field"><span class="psb-label" style="display:block;font-weight:600;margin-bottom:4px">%s</span>%s<p>%s</p></div>',
                esc_html($row['label']),
                $row['field'], // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- oben escaped
                esc_html($row['help'])
            );
        }
    }
}

add_action(PSB_TAG_TAXONOMY . '_add_form_fields', function () {
    psb_render_filter_tag_fields([], false);
});

add_action(PSB_TAG_TAXONOMY . '_edit_form_fields', function ($term) {
    psb_render_filter_tag_fields(psb_get_filter_tag_settings($term->term_id), true);
});

/**
 * Speichern beim Anlegen und Bearbeiten. Nur mit gültigem Nonce und dem
 * Recht, Schlagwörter zu bearbeiten.
 *
 * @param int $term_id
 */
function psb_save_filter_tag_fields($term_id)
{
    if (
        ! isset($_POST['psb_filter_tag_nonce'])
        || ! wp_verify_nonce(sanitize_key(wp_unslash($_POST['psb_filter_tag_nonce'])), 'psb_filter_tag')
        || ! current_user_can('edit_term', $term_id)
    ) {
        return;
    }

    $input = isset($_POST['psb']) && is_array($_POST['psb']) ? wp_unslash($_POST['psb']) : []; // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized -- je Feld unten

    foreach (psb_filter_tag_fields() as $key => $field) {
        $value = call_user_func($field['sanitize'], $input[$key] ?? '');

        if ('' === $value || ('order' === $key && '0' === $value)) {
            delete_term_meta($term_id, $field['meta']);
        } else {
            update_term_meta($term_id, $field['meta'], $value);
        }
    }
}

add_action('created_' . PSB_TAG_TAXONOMY, 'psb_save_filter_tag_fields');
add_action('edited_' . PSB_TAG_TAXONOMY, 'psb_save_filter_tag_fields');

/* ---------------------------------------------------------------------------
   Admin: Spalte "Im Filter" in der Liste der Schlagwörter
   --------------------------------------------------------------------------- */

add_filter('manage_edit-' . PSB_TAG_TAXONOMY . '_columns', function ($columns) {
    $columns['psb_filter'] = __('Im Filter', 'product-showcase-block');

    return $columns;
});

add_filter('manage_' . PSB_TAG_TAXONOMY . '_custom_column', function ($content, $column, $term_id) {
    if ('psb_filter' !== $column) {
        return $content;
    }

    $s = psb_get_filter_tag_settings($term_id);
    if (! $s['in_filter']) {
        return '–';
    }

    // Nur umformatieren, nicht über einen Zeitstempel umrechnen -- sonst
    // könnte die Zeitzone das Datum um einen Tag verschieben.
    $format = static function ($date) use ($s) {
        $d = DateTime::createFromFormat('!Y-m-d', $date);

        return $d ? $d->format($s['yearly'] ? 'j.n.' : 'j.n.Y') : $date;
    };

    $period = '';
    if ('' !== $s['from'] || '' !== $s['until']) {
        $period = sprintf(
            ' %s – %s%s',
            '' !== $s['from'] ? $format($s['from']) : '…',
            '' !== $s['until'] ? $format($s['until']) : '…',
            $s['yearly'] ? ', ' . __('jährlich', 'product-showcase-block') : ''
        );
    }

    $status = psb_is_filter_tag_active($term_id)
        ? __('jetzt sichtbar', 'product-showcase-block')
        : __('ausserhalb des Zeitraums', 'product-showcase-block');

    return esc_html(sprintf('%s%s', $status, $period ? ' ·' . $period : ''));
}, 10, 3);
