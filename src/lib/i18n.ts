type Locale = 'it' | 'en';

const messages: Record<Locale, Record<string, string>> = {
  it: {
    welcome: 'Benvenuto',
    create_account: 'Crea il tuo profilo GST',
  },
  en: {
    welcome: 'Welcome',
    create_account: 'Create your GST profile',
  },
};

export function t(key: string, locale: Locale = 'it') {
  return messages[locale][key] ?? key;
}
