/**
 * Supported language codes for transcription and reasoning
 * Maps language codes to Whisper language names
 */

export const SUPPORTED_TRANSCRIPTION_LANGUAGES = {
  auto: "auto",
  en: "english",
  de: "german",
  ja: "japanese",
  es: "spanish",
  fr: "french",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  pl: "polish",
  ru: "russian",
  zh: "chinese",
  ko: "korean",
  ar: "arabic",
  hi: "hindi",
  vi: "vietnamese",
  tr: "turkish",
  th: "thai",
  sw: "swahili",
  id: "indonesian",
  ms: "malay",
  fa: "persian",
  he: "hebrew",
  bn: "bengali",
  pa: "punjabi",
  ro: "romanian",
  cs: "czech",
  sk: "slovak",
  hu: "hungarian",
  bg: "bulgarian",
  hr: "croatian",
  sr: "serbian",
  sq: "albanian",
  ur: "urdu",
  tl: "tagalog",
  et: "estonian",
  lv: "latvian",
  lt: "lithuanian",
  sl: "slovenian",
  ca: "catalan",
  gl: "galician",
  cy: "welsh",
  ga: "irish",
  mt: "maltese",
  my: "burmese",
  km: "khmer",
  lo: "lao",
  uk: "ukrainian",
  el: "greek",
  no: "norwegian",
  da: "danish",
  sv: "swedish",
  fi: "finnish",
  tw: "mandarin"
};

// For reasoning/generation, support main teaching languages
export const SUPPORTED_REASONING_LANGUAGES = [
  "ja", // Japanese
  "en", // English
  "de", // German
  "es", // Spanish
  "fr", // French
  "it", // Italian
  "pt", // Portuguese
  "ko", // Korean
  "zh", // Chinese
  "tw"  // Traditional Chinese
];

// Get transcription language codes (excluding 'auto')
export function getTranscriptionLanguageCodes() {
  return Object.keys(SUPPORTED_TRANSCRIPTION_LANGUAGES);
}

// Get reasoning language codes
export function getReasoningLanguageCodes() {
  return SUPPORTED_REASONING_LANGUAGES;
}

// Get Whisper language name by code
export function getWhisperLanguageName(languageCode) {
  return SUPPORTED_TRANSCRIPTION_LANGUAGES[languageCode] || languageCode;
}

// Validate transcription language
export function isValidTranscriptionLanguage(languageCode) {
  return languageCode in SUPPORTED_TRANSCRIPTION_LANGUAGES;
}

// Validate reasoning language
export function isValidReasoningLanguage(languageCode) {
  return SUPPORTED_REASONING_LANGUAGES.includes(languageCode);
}
