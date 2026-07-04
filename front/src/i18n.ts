export type Lang = 'en' | 'mt';

const messages = {
  en: {
    admin: 'Admin',
    amount: 'Amount',
    audit: 'Audit',
    campaign: 'Campaign',
    campaigns: 'Campaigns',
    card: 'Card',
    confirmation: 'Confirmation',
    currency: 'Currency',
    dashboard: 'Dashboard',
    donate: 'Donate',
    donated: 'Donation submitted',
    email: 'Email',
    exportCsv: 'Export CSV',
    highContrast: 'High contrast',
    language: 'Language',
    largeText: 'Large text',
    ledger: 'Ledger',
    login: 'Log in',
    logout: 'Log out',
    name: 'Name',
    password: 'Password',
    phone: 'Phone',
    print: 'Print report',
    receipt: 'Receipt',
    reconciliation: 'Reconciliation',
    submit: 'Submit',
    tap: 'Simulated tap',
  },
  mt: {
    admin: 'Amministrazzjoni',
    amount: 'Ammont',
    audit: 'Verifika',
    campaign: 'Kampanja',
    campaigns: 'Kampanji',
    card: 'Kard',
    confirmation: 'Konferma',
    currency: 'Munita',
    dashboard: 'Bord',
    donate: 'Agħti',
    donated: 'Donazzjoni mibgħuta',
    email: 'Email',
    exportCsv: 'Esporta CSV',
    highContrast: 'Kuntrast għoli',
    language: 'Lingwa',
    largeText: 'Test kbir',
    ledger: 'Reġistru',
    login: 'Idħol',
    logout: 'Oħroġ',
    name: 'Isem',
    password: 'Password',
    phone: 'Telefon',
    print: 'Ipprintja rapport',
    receipt: 'Irċevuta',
    reconciliation: 'Rikonċiljazzjoni',
    submit: 'Ibgħat',
    tap: 'Tap simulat',
  },
} satisfies Record<Lang, Record<string, string>>;

export const getInitialLang = (): Lang => {
  const stored = localStorage.getItem('tap_lang');
  return stored === 'mt' ? 'mt' : 'en';
};

export const t = (lang: Lang, key: keyof typeof messages.en): string =>
  messages[lang][key] || messages.en[key];
