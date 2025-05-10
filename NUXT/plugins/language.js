const packs = {
  ar: require("./languages/arabic"),
  az: require("./languages/azerbaijan"),
  bn: require("./languages/bengali"),
  pt: require("./languages/brazilian-portuguese"),
  bg: require("./languages/bulgarian"),
  zh: require("./languages/chinese-simplified"),
  zh_TW: require("./languages/chinese-traditional"),
  cs: require("./languages/czech"),
  nl: require("./languages/dutch"),
  en: require("./languages/english"),
  et: require("./languages/estonian"),
  fr: require("./languages/french-fr"),
  de: require("./languages/german"),
  hi: require("./languages/hindi"),
  mr: require("./languages/marathi"),
  hu: require("./languages/hungarian"),
  id: require("./languages/indonesian"),
  it: require("./languages/italian"),
  ja: require("./languages/japanese"),
  ko: require("./languages/korean"),
  mk: require("./languages/macedonian"),
  ms: require("./languages/malay"),
  pl: require("./languages/polish"),
  ro: require("./languages/romanian"),
  ru: require("./languages/russian"),
  sr: require("./languages/serbian"),
  sl: require("./languages/slovenian"),
  es: require("./languages/spanish"),
  ta: require("./languages/tamil"),
  tr: require("./languages/turkish"),
  uk: require("./languages/ukrainian"),
  vi: require("./languages/vietnamese"),
};

function convertToISO() {
  const languageMap = {
    arabic: "ar",
    azerbaijan: "az",
    bengali: "bn",
    "brazilian-portuguese": "pt",
    bulgarian: "bg",
    "chinese-simplified": "zh",
    "chinese-traditional": "zh-TW",
    czech: "cs",
    dutch: "nl",
    english: "en",
    estonian: "et",
    "french-fr": "fr",
    german: "de",
    hindi: "hi",
    marathi: "mr",
    hungarian: "hu",
    indonesian: "id",
    italian: "it",
    japanese: "ja",
    korean: "ko",
    macedonian: "mk",
    malay: "ms",
    polish: "pl",
    romanian: "ro",
    russian: "ru",
    serbian: "sr",
    slovenian: "sl",
    spanish: "es",
    tamil: "ta",
    turkish: "tr",
    ukrainian: "uk",
    vietnamese: "vi"
  };

  const storedLang = localStorage.getItem("language");
  if (storedLang && languageMap[storedLang]) {
    localStorage.setItem("language", languageMap[storedLang]);
  }

}

function module(subPack, listPacks) {
  convertToISO();
  //---   List All Packs   ---//
  if (listPacks === true) return packs;

  //---   Return Language Pack   ---//
  const selectedLanguage = localStorage.getItem("language") || "en";
  let languagePack = mergeMissingKeysFlat(packs.en, packs[selectedLanguage]);

  //---   Send Full Language Pack   ---//
  if (!subPack) return languagePack;
  //---   Allow Subpack Fallback   ---//
  // let builtSubPack = new Object();
  // for (const i in packs.en[subPack]) {
  //   const englishEntry = packs.en[subPack][i];
  //   const entry = languagePack[subPack][i];
  //
  //   if (!entry) {
  //     builtSubPack[i] = englishEntry;
  //   } else {
  //     builtSubPack[i] = entry;
  //   }
  //
  //
  // }
  //---   Return Built Subpack   ---//
  languagePack = languagePack[subPack];
  console.log("RETURNING:",languagePack)
  return languagePack;
}
function mergeMissingKeysFlat(source, target) {
  const stack = [{ src: source, tgt: target }];

  while (stack.length) {
    const {src, tgt} = stack.pop();
    for (const key in src) {
      if (!(key in tgt)) {
        tgt[key] =
          typeof src[key] === 'object' && src[key] !== null
            ? {}
            : `${src[key]} `; // need to be translated
      }

      if (
        typeof src[key] === 'object' &&
        src[key] !== null &&
        typeof tgt[key] === 'object' &&
        tgt[key] !== null
      ) {
        stack.push({src: src[key], tgt: tgt[key]});
      }
    }
  }
  return target;
}

export default ({ app }, inject) => {
  inject("lang", module);
};
