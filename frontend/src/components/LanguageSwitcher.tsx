"use client";

import { useState } from 'react';
import { useLocale } from 'next-intl';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const [isOpen, setIsOpen] = useState(false);

  const languages = [
    { code: 'en', flag: '🇺🇸' },
    { code: 'ru', flag: '🇷🇺' }
  ];

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0];
  const otherLanguage = languages.find(lang => lang.code !== locale) || languages[1];

  // Switch language using cookie
  const switchLanguage = async () => {
    const newLocale = locale === 'en' ? 'ru' : 'en';

    // Set cookie for the locale
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;

    // Reload the page to apply new locale
    window.location.reload();
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-2 rounded-lg border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-opacity-50"
        style={{
          backgroundColor: "var(--primary)",
          color: "var(--foreground)",
          borderColor: "rgba(0,0,0,0.2)",
        }}
        aria-label="Select language"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <svg
          className={`w-4 h-4 ml-1 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            className="absolute right-0 top-full mt-2 z-20 w-16 rounded-lg border-2 shadow-xl"
            style={{
              backgroundColor: "var(--primary)",
              borderColor: "rgba(0,0,0,0.2)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
          >
            <button
              onClick={switchLanguage}
              className="w-full flex items-center justify-center px-4 py-3 text-left hover:bg-opacity-10 transition-colors duration-200 rounded-lg hover:bg-white"
              style={{
                color: "var(--foreground)",
              }}
            >
              <span className="text-lg">{otherLanguage.flag}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
