import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const i18nInstance = i18n.createInstance();

// We load translations dynamically from public/locales
// For SSR compatibility, we provide them inline as well
const resources = {
  en: { translation: {} },
  hi: { translation: {} },
  ta: { translation: {} },
};

i18nInstance
  .use(initReactI18next)
  .init({
    resources,
    lng: "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });

export default i18nInstance;
