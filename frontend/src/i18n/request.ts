import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';

export default getRequestConfig(async ({ locale }) => {
  // If no locale is provided, detect from browser language (Accept-Language header)
  let detectedLocale = 'en';

  if (!locale) {
    try {
      const headersList = await headers();
      const acceptLanguage = headersList.get('accept-language');

      if (acceptLanguage) {
        // Parse Accept-Language header to determine preferred language
        const languages = acceptLanguage.split(',').map(lang => {
          const [locale, q = '1'] = lang.trim().split(';q=');
          return { locale: locale.toLowerCase(), q: parseFloat(q) };
        }).sort((a, b) => b.q - a.q);

        // Check if Russian or English is in the list
        for (const lang of languages) {
          if (lang.locale.startsWith('ru')) {
            detectedLocale = 'ru';
            break;
          } else if (lang.locale.startsWith('en')) {
            detectedLocale = 'en';
            break;
          }
        }

        // Default fallback
        if (!['en', 'ru'].includes(detectedLocale)) {
          detectedLocale = 'en';
        }
      }
    } catch (error) {
      console.warn('Could not detect locale from headers:', error);
    }
  } else {
    // Validate locale if provided
    if (!['en', 'ru'].includes(locale)) {
      notFound();
    }
    detectedLocale = locale;
  }

  return {
    locale: detectedLocale,
    messages: (await import(`../messages/${detectedLocale}.json`)).default
  };
});
