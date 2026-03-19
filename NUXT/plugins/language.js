import ar from "~/lib/languages/arabic";
import az from "~/lib/languages/azerbaijan";
import bn from "~/lib/languages/bengali";
import pt from "~/lib/languages/brazilian-portuguese";
import bg from "~/lib/languages/bulgarian";
import zh from "~/lib/languages/chinese-simplified";
import zh_TW from "~/lib/languages/chinese-traditional";
import cs from "~/lib/languages/czech";
import nl from "~/lib/languages/dutch";
import en from "~/lib/languages/english";
import et from "~/lib/languages/estonian";
import fr from "~/lib/languages/french-fr";
import de from "~/lib/languages/german";
import hi from "~/lib/languages/hindi";
import mr from "~/lib/languages/marathi";
import hu from "~/lib/languages/hungarian";
import id from "~/lib/languages/indonesian";
import it from "~/lib/languages/italian";
import ja from "~/lib/languages/japanese";
import ko from "~/lib/languages/korean";
import mk from "~/lib/languages/macedonian";
import ms from "~/lib/languages/malay";
import pl from "~/lib/languages/polish";
import ro from "~/lib/languages/romanian";
import ru from "~/lib/languages/russian";
import sr from "~/lib/languages/serbian";
import sl from "~/lib/languages/slovenian";
import es from "~/lib/languages/spanish";
import ta from "~/lib/languages/tamil";
import tr from "~/lib/languages/turkish";
import uk from "~/lib/languages/ukrainian";
import vi from "~/lib/languages/vietnamese";

const packs = {
  ar, az, bn, pt, bg, zh, zh_TW, cs, nl, en, et, fr, de, hi, mr, hu,
  id, it, ja, ko, mk, ms, pl, ro, ru, sr, sl, es, ta, tr, uk, vi,
};

function convertToISO() {
  const languageMap = {
    arabic: "ar", azerbaijan: "az", bengali: "bn",
    "brazilian-portuguese": "pt", bulgarian: "bg",
    "chinese-simplified": "zh", "chinese-traditional": "zh-TW",
    czech: "cs", dutch: "nl", english: "en", estonian: "et",
    "french-fr": "fr", german: "de", hindi: "hi", marathi: "mr",
    hungarian: "hu", indonesian: "id", italian: "it", japanese: "ja",
    korean: "ko", macedonian: "mk", malay: "ms", polish: "pl",
    romanian: "ro", russian: "ru", serbian: "sr", slovenian: "sl",
    spanish: "es", tamil: "ta", turkish: "tr", ukrainian: "uk",
    vietnamese: "vi",
  };

  const storedLang = localStorage.getItem("language");
  if (storedLang && languageMap[storedLang]) {
    localStorage.setItem("language", languageMap[storedLang]);
  }
}

function mergeMissingKeysFlat(source, target) {
  const stack = [{ src: source, tgt: target }];
  while (stack.length) {
    const { src, tgt } = stack.pop();
    for (const key in src) {
      if (!(key in tgt)) {
        tgt[key] =
          typeof src[key] === "object" && src[key] !== null
            ? {}
            : `${src[key]} `;
      }
      if (
        typeof src[key] === "object" && src[key] !== null &&
        typeof tgt[key] === "object" && tgt[key] !== null
      ) {
        stack.push({ src: src[key], tgt: tgt[key] });
      }
    }
  }
  return target;
}

function langModule(subPack, listPacks) {
  convertToISO();
  if (listPacks === true) return packs;

  const selectedLanguage = localStorage.getItem("language") || "en";
  let languagePack = mergeMissingKeysFlat(packs.en, packs[selectedLanguage] || packs.en);

  if (!subPack) return languagePack;
  languagePack = languagePack[subPack];
  console.log("RETURNING:", languagePack);
  return languagePack;
}

export default defineNuxtPlugin(() => {
  return {
    provide: {
      lang: langModule,
    },
  };
});
