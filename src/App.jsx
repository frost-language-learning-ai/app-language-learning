import React, { useMemo, useState } from "react";
import LanguageLearningPage from "./components/LanguageLearningPage.jsx";
import { getMessages } from "./i18n/translations.js";

export default function App() {
  const [locale, setLocale] = useState(() => localStorage.getItem("settings.locale") || "en");
  const t = useMemo(() => getMessages(locale), [locale]);

  return (
    <div>
      <LanguageLearningPage locale={locale} setLocale={setLocale} t={t} />
    </div>
  );
}
