/**
 * Angaben für Impressum und Datenschutzerklärung (eine Stelle für beide Seiten).
 * `residence`: Für diese private, nicht kommerzielle Seite reicht der Wohnort (§ 25 Abs. 5 MedienG).
 */
export const OPERATOR = {
  name: 'Maximilian Lehner',
  // TODO: vor der Veröffentlichung den Wohnort eintragen.
  residence: '[WOHNORT EINTRAGEN]',
  country: 'Österreich',
  email: 'info@lm-lehner.at',
  phone: { label: '+43 676 5212165', href: 'tel:+436765212165' },
} as const;

export const REPOSITORY_URL = 'https://github.com/Lehnerma/FH-Poll';

/** Stand der Rechtstexte; bei inhaltlichen Änderungen anpassen. */
export const LEGAL_VERSION = 'November 2026';
