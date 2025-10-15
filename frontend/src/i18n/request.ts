import { getRequestConfig } from 'next-intl/server';
import { headers, cookies } from 'next/headers';

export default getRequestConfig(async ({ locale }) => {
  // If no locale is provided, check cookie first, then browser language
  let detectedLocale = 'en';

  if (!locale) {
    try {
      // First try to get from cookie
      const cookieStore = await cookies();
      const localeCookie = cookieStore.get('locale')?.value;

      if (localeCookie && (localeCookie === 'en' || localeCookie === 'ru')) {
        detectedLocale = localeCookie;
      } else {
        // If no cookie, detect from Accept-Language header
        const headersList = await headers();
        const acceptLanguage = headersList.get('accept-language');

        if (acceptLanguage) {
          const hasRussian = acceptLanguage.toLowerCase().includes('ru');
          const hasEnglish = acceptLanguage.toLowerCase().includes('en');

          if (hasRussian && (!hasEnglish || acceptLanguage.toLowerCase().indexOf('ru') < acceptLanguage.toLowerCase().indexOf('en'))) {
            detectedLocale = 'ru';
          }
        }
      }
    } catch (error) {
      console.warn('Could not detect locale:', error);
    }
  } else {
    // Validate locale if provided
    if (['en', 'ru'].includes(locale)) {
      detectedLocale = locale;
    }
  }

  return {
    locale: detectedLocale,
    messages: (await import(`../messages/${detectedLocale}.json`)).default
  };
});
