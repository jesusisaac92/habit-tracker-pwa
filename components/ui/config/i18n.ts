"use client";

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import esCommon from '@/public/locales/es/common.json';
import enCommon from '@/public/locales/en/common.json';

i18next
  .use(initReactI18next)
  .init({
    resources: {
      es: {
        common: esCommon
      },
      en: {
        common: enCommon
      }
    },
    lng: 'es',
    fallbackLng: 'es',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  });

// Función para cambiar el idioma
export const changeLanguage = (lng: string) => {
  return i18next.changeLanguage(lng);
};

export default i18next;