//⚠️🚧 WARNING: THIS FILE IS IN MAINTENANCE MODE 🚧⚠️
// NEW FEATURES FROM THIS FILE WILL BE TRASFERRED TO INNERTUBE.JS - A SEPARATE LIBRARY
// New library: https://github.com/pixkk/Vuetube-Extractor (currently is not active)

// Code specific to working with the innertube API
// https://www.youtube.com/youtubei/v1

import {Http} from "@capacitor-community/http";
import {delay, getBetweenStrings, getCpn} from "./utils";
import rendererUtils from "./renderers";
import constants from "./constants";

class Innertube {
  //--- Initiation ---//

  constructor(ErrorCallback) {
    this.ErrorCallback = ErrorCallback || undefined;
    this.retry_count = 0;
    this.playerParams = "";
    this.signatureTimestamp = 0;
    this.nfunction = "";
    this.visitorData = "";
    this.getPot = "";
    this.pot = "";
    this.secretArrayName = "";
    this.recommendationsFix = !(JSON.parse(localStorage.getItem("recommendationsFix")) === false)
  }

  checkErrorCallback() {
    return typeof this.ErrorCallback === "function";
  }
  getSecretArray(secretArrayName, rootPageBody) {
    let array = new RegExp(`var ${secretArrayName.replace("$", "\\$")}=("|\').*("|\').split\\(".*"\\),\\n`, 'gm').exec(rootPageBody);
    if (array == null) {
      array = new RegExp(`var ${secretArrayName.replace("$", "\\$")}='(.*)'.split\\("(.*)"\\)`, 'g').exec(rootPageBody);
    }
    if (array == null) {
      array = new RegExp(`var ${secretArrayName.replace("$", "\\$")}=\\[(.*.*\\n.*)\\n.*\\]`, 'g').exec(rootPageBody);
    }
    if (array == null) {
      array = new RegExp(`var ${secretArrayName.replace("$", "\\$")}=\\[(.*.*\n.*)\\]`, 'g').exec(rootPageBody);
    }
    if (array) {
      array[0] = array[0] + "; return " + secretArrayName + ";"
      array[0] = array[0].replace("),\n; return ", ") \n; return ");
      let returnSecretArray = new Function(array[0]);
      return returnSecretArray();
    }
  }

  decodeFunctionWithSecretArray(functionBody, secretArray, secretArrayName) {
    let regex = new RegExp(`\\b(${secretArrayName.replace("$", "\\$")})\\[([0-9]+)\\]`, 'gm');
    functionBody = functionBody.replace(regex, (match, varName, index) => {
      return  '"' + secretArray[`${parseInt(index)}`].replace(/(["'\\])/g, '\\$1') +  '"';
    });
    return functionBody;
  }
  processFunctionWithSecretArray(helpDecipher, functionBody, rootDocumentBody) {
    let secretArray = /\[([A-z0-9$]+)\[[A-z0-9$]+\]/.exec(helpDecipher[0]);
    let splitDataFromSecretArray;
    if (secretArray) {
      splitDataFromSecretArray = this.getSecretArray(secretArray[1], rootDocumentBody);
      this.secretArrayName = secretArray[1];
      return this.decodeFunctionWithSecretArray(functionBody, splitDataFromSecretArray, secretArray[1]);
    }
  }

  processFunctionWithKnownSecretArray(functionBody, rootDocumentBody) {
    let splitDataFromSecretArray = this.getSecretArray(this.secretArrayName, rootDocumentBody);
    return this.decodeFunctionWithSecretArray(functionBody, splitDataFromSecretArray, this.secretArrayName);
  }

  async makeDecipherFunction(baseJs) {
    // Example:
    //;var IF={k4:function(a,b){var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c},
    // VN:function(a){a.reverse()},
    // DW:function(a,b){a.splice(0,b)}};
    let isMatch;
    let firstPart0 = /;var [A-Za-z$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\(a\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\};/;
    let firstPart1 = /var [A-z0-9$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\}\;/;
    let firstPart2 = /var [A-z0-9$"]+=\{(?:[A-z0-9"]+:function\([^)]*\)\{[^}]*\},\n)+.*\}\};/;
    if (firstPart0.exec(baseJs.data)) {
      isMatch = firstPart0.exec(baseJs.data);
    } else if (firstPart1.exec(baseJs.data)) {
      isMatch = firstPart1.exec(baseJs.data);
    } else if (firstPart2.exec(baseJs.data)) {
      // FirstPart2 - more optimized version of firstpart1
      isMatch = firstPart2.exec(baseJs.data);
    }

    if (isMatch) {
      let firstPart = isMatch[0];
      let helpDecipher;
      let functionArg = null;
      let secondPart0 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return [A-z0-9$]\.join\(""\)\};/;
      let secondPart1 = /{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart2 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart3 = /\{[A-Za-z]=[A-Za-z]\.split\(""[^"]*""\)\};/i;
      let secondPart4 = /\{a=a\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return a\.join\(""\)\};/;
      let secondPart5 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart6 = /{[A-Za-z]=[A-Za-z]\.split\(""\);.*return [A-Za-z]\.join\(""\)};/;
      let secondPart7 = /{[A-Za-z]=[A-Za-z]\.split\(.*\);return [A-Za-z]\.join\(.*\)};/;
      // secondPart8 - Oldest method
      let secondPart8 = /{[A-Za-z]=[A-Za-z]\[[A-Za-z$]+\[[0-9]+\]\]\([A-Za-z$]+\[[0-9]+\]\).*/;
      // 24.09.2025 - preparing for the second part #9
      let secondPart9 = /;[A-z0-9$]+\.set\("alr","yes"\);[A-z0-9$]+&&\([A-z0-9$]+=([A-z0-9]+)\(([0-9]+).*decodeURIComponent\([A-z0-9]+\)\),/gm;
      if (secondPart0.exec(baseJs.data)) {
        isMatch = secondPart0.exec(baseJs.data);
      } else if (secondPart1.exec(baseJs.data)) {
        isMatch = secondPart1.exec(baseJs.data);
      } else if (secondPart2.exec(baseJs.data)) {
        isMatch = secondPart2.exec(baseJs.data);
      } else if (secondPart3.exec(baseJs.data)) {
        // 10.07.2023
        isMatch = secondPart3.exec(baseJs.data);
      } else if (secondPart4.exec(baseJs.data)){
        isMatch = secondPart4.exec(baseJs.data);
      }
      else if(secondPart5.exec(baseJs.data)) {
      // 12.01.2025
        isMatch = secondPart5.exec(baseJs.data);
      }
      else if (secondPart6.exec(baseJs.data)){
        // 16.01.2025
        isMatch = secondPart6.exec(baseJs.data);
      }
      else if (secondPart7.exec(baseJs.data)) {
        helpDecipher = secondPart7.exec(baseJs.data);
          // 25.03.2025 - new update: additional array with some values.
         //var ****="',(\";\u00ae{reverse{*****{;[)/({...".split("{")
          if (helpDecipher) {
            isMatch[0] = this.processFunctionWithSecretArray(helpDecipher, helpDecipher[0], baseJs.data);
          }
      }
      else if (secondPart8.exec(baseJs.data) && false){
        helpDecipher = secondPart8.exec(baseJs.data);
        // console.warn(helpDecipher)
        if (helpDecipher) {
          isMatch[0] = this.processFunctionWithSecretArray(helpDecipher, helpDecipher[0], baseJs.data);
        }
      }
      else if(secondPart9.exec(baseJs.data)) {
        // 24.09.2025 - Totally updated second part of decipher
        // Yes, without double .exec() it returns null (wtf).
        // Searching needed functin by alr yes parameter.
        let resultPreSecond = secondPart9.exec(baseJs.data);
        resultPreSecond = secondPart9.exec(baseJs.data);
        // console.warn(resultPreSecond[2])

        this.decodeUrlFirstArg = resultPreSecond[2];
        // TODO: Optimize it
        let secondPart8Name = resultPreSecond[1];
        secondPart8 = new RegExp(
          `${secondPart8Name.replaceAll("$", "\\$")}=function\\([^)]*\\)\\{[\\s\\S]*?return[\\s\\S]*?\\}\\s*;`
        ).exec(baseJs.data);
 //       console.warn(`${secondPart8Name.replaceAll("$", "\\$")}=function\\([^)]*\\)\\{[\\s\\S]*?return[\\s\\S]*?\\}\\s*;`)
 //       console.warn(secondPart8)
        if (!secondPart8) {
          secondPart8 = new RegExp(
            `${secondPart8Name.replaceAll("$", "\\$")}=function\\(.*\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)};`
          ).exec(baseJs.data);

        }
 //       console.warn(`${secondPart8Name.replaceAll("$", "\\$")}=function\\(.*\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)};`);
        functionArg = new RegExp(
          `${secondPart8Name.replaceAll("$", "\\$")}=function\\((.*,[A-z0-9]+)\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)}`
        ).exec(secondPart8[0])[1];
        helpDecipher = new RegExp(
          `{if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)};`
        ).exec(secondPart8[0]);

    //    console.error(`${secondPart8Name.replaceAll("$", "\\$")}=function\\((.*)\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)}`)
    //    console.error(secondPart8[0])
    //    console.warn(helpDecipher)
        // console.warn(/[A-z0-9$]+=([A-z0-9$]+)\([0-9]+,.*\),/g.exec(helpDecipher[0]))
        if (/[A-z0-9$]+=([A-z0-9$]+)\([0-9]+,.*\),/g.exec(helpDecipher[0])) {
          helpDecipher[0] = this.processFunctionWithSecretArray(helpDecipher, helpDecipher[0], baseJs.data);
         // console.warn(helpDecipher[0]);
          let name = /[A-z0-9$]+=([A-z0-9$]+)\([0-9]+,.*\),/g.exec(helpDecipher[0])[1];
          // console.warn(name);
          // console.warn(`\\s${name}=function\\(.*?\\){[\\s\\S]*?};`);
         // console.warn(`\\s${name}=function\\(.*?\\){[\\s\\S]*?return .*};`);
          if (name !== secondPart8Name) {

            let funcBody = new RegExp(`\\s${name}=function\\(.*?\\){[\\s\\S]*?return .*};`, 'gm').exec(baseJs.data)[0];
          // console.warn(funcBody);
            helpDecipher[0] += "\n" + funcBody;
          }
          else {
          }
        }
        if (helpDecipher) {
          try {
            isMatch[0] = this.processFunctionWithKnownSecretArray(helpDecipher[0], baseJs.data);
          }
          catch (e) {
            isMatch[0] = this.processFunctionWithSecretArray(helpDecipher, helpDecipher[0], baseJs.data);
          }
        }
      }

      if (!isMatch) {
        console.warn(
          "The second part of decipher string does not match the regex pattern."
        );
      }

      // Example: - deprecated example (since 24.09.2025)
      // {a=a.split("");IF.k4(a,4);IF.VN(a,68);IF.DW(a,2);IF.VN(a,66);IF.k4(a,19);IF.DW(a,2);IF.VN(a,36);IF.DW(a,2);IF.k4(a,41);return a.join("")};
      // Get third part of decipher function
      if (helpDecipher) {
        isMatch[0] = isMatch[0].replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
        firstPart = this.processFunctionWithKnownSecretArray(firstPart, baseJs.data);
        firstPart = firstPart.replace(/([A-z0-9$])\["([A-z0-9$]+)"\]/g, '$1.$2');
        firstPart = firstPart.replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
      }
      const match = isMatch[0].match(/(\w+)\.join\(\s*""\s*\)/);
      if (match && functionArg == null) {
        functionArg = match[1];
      }

      const thirdPart =
        "var decodeUrl=function("+functionArg+")" + isMatch[0] + "return decodeUrl;";
      let decodeFunction = firstPart + thirdPart;
      // console.warn(decodeFunction)
      let decodeUrlFunction = new Function(decodeFunction);
      this.decodeUrl = decodeUrlFunction();

      let signatureIntValue = /.sts="[0-9]+";/.exec(baseJs.data);
      // Get signature timestamp
      this.signatureTimestamp = parseInt(
        signatureIntValue[0].replace(/\D/g, "")
      );
    } else {
      console.warn(
        "The first part of decipher string does not match the regex pattern."
      );
    }
  }
  async getPOTFunction(baseJs) {
    /**
     * Convertation of EOM_VISITOR_DATA || VISITOR_DATA to Uint8Array
     * @type {RegExpExecArray}
     */
    let firstFunction = /[A-Za-z0-9$]+=function\([A-Za-z0-9$]+\)\{for\([^)]*\)\{[^}]*\}return [A-Za-z0-9$]+\};/gm.exec(baseJs.data);
    let firstFunctionName = "";

    /**
     * Modification result from firstFunction
     * @type {RegExpExecArray}
     */
    // let secondFunction = /[A-z0-9]+\.prototype\.[A-z0-9$]+=function\([A-z0-9]+\)\{var [A-z0-9]+=[A-z0-9]+\(\);[^}]*return [A-z0-9$]+\}/m.exec(baseJs.data);
    let secondFunction = /;[A-z0-9$]+\.prototype\.[A-z0-9$]+=function(?:\([A-z0-9]+\)|\(\))\{var [A-z0-9]+=.*return [A-z0-9$]+\};var/m.exec(baseJs.data);

    console.warn(secondFunction);
    let secondFunctionName = "";

    let thirdFunction = /function\([^)]*\)\{[A-Za-z0-9]+===void 0\&\&\([A-z0-9$]+\=0\)\;.*?join\(""\)\};/m.exec(baseJs.data);
    // let fourthFunction = /[A-z0-9$]+=function\(\)\{if[^₴]*\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\"\.split\(""\),[^₴]*\)\}\}\}\}\;/.exec(baseJs.data)[0].match(/^.*?}};/);
    let fourthFunction = /[A-z0-9$]+=function\(\)\{if\(![A-z0-9$]+\)\{.*\}\}\;/.exec(baseJs.data);

    let resultF = "";
    if (firstFunction) {
      firstFunctionName = firstFunction[0].match(/^([a-zA-Z0-9_$]+)\s*=\s*function/)[1];

      if (secondFunction) {
        let optimizedSecondFunc = secondFunction[0].substring(1, secondFunction[0].length - 4);
        optimizedSecondFunc = optimizedSecondFunc.replaceAll("this.clientState", "2");
        console.warn(optimizedSecondFunc);


        optimizedSecondFunc = optimizedSecondFunc.replace(/var\s+([A-z0-9$]+)=([A-z0-9$]+)\(\);/g, firstFunction[0]+'\nvar $1='+firstFunctionName+'($2);');
        optimizedSecondFunc = optimizedSecondFunc.replace(/if\([^)]*\)throw new [A-Za-z0-9._$]+\([0-9]+,"[^"]*"\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/this\.logger\.[A-Za-z0-9$]+\([^)]*\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/this\.[A-Za-z0-9$]+\.[A-Za-z0-9$]+\([^)]*\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/^.*?prototype\./, '');

        optimizedSecondFunc = optimizedSecondFunc.replace(/var ([A-z0-9$]+)\=[A-z0-9$]+\(([A-z0-9$]+)\)/, 'var $1='+firstFunctionName+'($2)\n');

        console.warn(optimizedSecondFunc);
        secondFunctionName = optimizedSecondFunc.match(/^([a-zA-Z0-9_$]+)\s*=\s*function/)[1];

        console.warn(secondFunctionName);


        console.warn(thirdFunction);
        if (thirdFunction) {
          console.warn(fourthFunction);
          let functionNameForInserting = /[A-z0-9$]+\(\)/.exec(thirdFunction[0])[0];

          console.warn(functionNameForInserting);
          let inFFKV = fourthFunction[0].match(/([A-z0-9$]+)\[[A-z0-9$]+\]\=[A-z0-9$]+/)[1];

          console.warn(inFFKV);
          let fourthFunctionKeyValue = fourthFunction[0].match(/if\(\![A-z0-9$]+\)/)[0].replace("if(!", "").replace(")", "");

          console.warn(fourthFunctionKeyValue);
          let modifiedThirdFunction = thirdFunction[0].replace(functionNameForInserting, "var "+ inFFKV +"={};\nvar "+fourthFunctionKeyValue+"=null;\n"+"var "+optimizedSecondFunc+";\n"+fourthFunction[0]+"\n"+functionNameForInserting+";\n");

          console.warn(modifiedThirdFunction);
          let fourthFunctionTwoKeyValue = modifiedThirdFunction.match(/[A-Za-z0-9$]+\[[A-Za-z0-9$]+\]=[A-Za-z0-9$]+;/)[0].split('[')[0];

          console.warn(fourthFunctionTwoKeyValue);
          modifiedThirdFunction = modifiedThirdFunction.replace(functionNameForInserting+";\n", functionNameForInserting+";\nvar "+fourthFunctionTwoKeyValue+"="+secondFunctionName+"("+fourthFunctionTwoKeyValue+")\n");
          modifiedThirdFunction = modifiedThirdFunction.replace("var "+fourthFunctionKeyValue+"=null;\n", "var "+fourthFunctionKeyValue+"=null;\n");
          resultF = modifiedThirdFunction;
          console.warn(resultF);
        }
        else {
          console.error("The third part of POT function does not match the regex pattern.");
        }

        const fullCode =
          "var getPot=" + resultF + " return getPot;";

        let getPot = new Function(fullCode);
        this.getPot = getPot();
      }
      else {
        console.error("The second part of POT function does not match the regex pattern.");
      }

    }
    else {
      console.error("The first part of POT function does not match the regex pattern.");
    }
  }

  async getNFunction(baseJs) {
    let challenge_name =
      /\.get\("n"\)\)&&\(b=([a-zA-Z0-9$]+)(?:\[(\d+)\])?\([a-zA-Z0-9]\)/.exec(
        baseJs.data
      );

    let functionArg = "";

    let fullCode = "";
    if (challenge_name) {
      challenge_name = challenge_name[1];
      //.get("n"))&&(b=fG[0](b),a.set("n",b),fG.length||kq(""))}}
      // fG;
      challenge_name = new RegExp(
        `var ${challenge_name.replaceAll("$", "\\$")}\\s*=\\s*\\[(.+?)\\]\\s*[,;]`
      ).exec(baseJs.data)[1];

      if (challenge_name) {
        challenge_name = new RegExp(
          `${challenge_name}\\s*=\\s*function\\s*\\(([\\w$]+)\\)\\s*{(.+?}\\s*return\\ [\\w$]+.join\\(""\\))};`,
          "s"
        ).exec(baseJs.data)[2];
      }
      console.warn("NFunction - 1 error");
    }else {
      challenge_name = /[A-z0-9$]=String\.fromCharCode\(110\),[A-z0-9$]=[A-z0-9$]\.get\([A-z0-9$]\)\)&&\([A-z0-9$]=[A-Za-z0-9]+\[0\]\([A-z0-9$]\),[A-z0-9$]\.set\([A-z0-9$],[A-z0-9$]\)/i.exec(baseJs.data);

      if (challenge_name === null) {
        console.warn("NFunction - 2 error");
        challenge_name = /\nvar [A-z0-9_$]+=\[[A-z0-9_$]+\];/i.exec(baseJs.data);
        // console.warn(challenge_name);
      }
      else {
        console.warn("NFunction - success");
        challenge_name = /[A-z0-9$]=[A-Za-z0-9]+\[0\]\([A-z0-9$]\)/i.exec(challenge_name[0]);
      }
      // console.warn(challenge_name);

      challenge_name = /^.*?=\s*\[(.*)\];/gm.exec(challenge_name[0])[1];

      challenge_name = challenge_name.replaceAll("$", "\\$");

      // console.warn(challenge_name);
      let res = null;
      let newMethod = false;

      // console.warn(res);
      res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return [A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\[[0-9]+\\]\\)};`, 'g').exec(baseJs.data);
      // console.error(res);
      if (res == null) {
        res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return [A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\(.*\\)};`, 'g').exec(baseJs.data);
        // console.error(res);
        this.nfunctionFirstArg = /\(this,([0-9]+),.*\)/gm.exec(res[0])[1];
        // 24.09.2025
        newMethod = true;
      }
      if (res == null) {
        res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(.*\\)};`, 'g').exec(baseJs.data);
        // console.log(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(.*\\)}`);
      }
      // console.warn(res[0]);
      let helpDecipher = /return [A-Za-z]\.join\(.*\)}/.exec(
        res[0]
      );
      if (!helpDecipher) {
        helpDecipher = /return [A-z0-9$]+\[[A-z0-9$]+\[[0-9]+\]\]/.exec(
          res[0]
        );
      }
      // console.warn(res[0]);
      // console.warn(helpDecipher);
      // 25.03.2025 - new update: additional array with some values.
      if (helpDecipher) {
          res[0] = this.processFunctionWithSecretArray(helpDecipher, res[0], baseJs.data);
        // res[0] = this.processFunctionWithKnownSecretArray(res[0], baseJs.data);
      }
      // console.warn(helpDecipher);

      if (newMethod) {
        let funcName = /return ([A-z0-9$]+)\[[A-z0-9$]+\[[0-9]+\]\]/.exec(helpDecipher[0])[1];
        // console.warn(funcName);
        let funcBody = new RegExp(`\\s${funcName}=function\\(.*?\\){[\\s\\S]*?return .*};`, 'gm').exec(baseJs.data)[0];
       // console.warn(`${funcName}=function\\(.*\\){.*\\s.*\\s.*\\s.*`);
       // console.warn(`${funcName}=function\\(.*\\){.*\\s.*\\s.*\\s.*`);
       // console.warn(funcBody);
        let funcBodyProcessed = this.processFunctionWithKnownSecretArray(funcBody, baseJs.data);
        // console.warn(funcBodyProcessed);

        const threeSymbolsFunctionsNameForProcessing = new RegExp('(?:\\b(?!var|try|for|url|let|[0-9]+|1[e,E][0-9]+\\b)(?=[A-Za-z0-9$]{3}\\b)(?=.*[A-Za-z])[A-Za-z0-9$]{3}\\b(?:,|\\]| \\[))|\\$[A-z0-9]+,|,[A-z0-9$]{3},|[A-z0-9]+\\$,', 'gm');

       // console.warn(threeSymbolsFunctionsNameForProcessing);
        let m;

        let subFuncBody = [];
        let whatToReplace = [];

        function parseArgsOfFunc(functionBody) {
          let args = /function\((.*)\){/.exec(functionBody);
          return args[1];
        }
        function parseSubFunc(functionBody) {
          let funcName = /return ([A-z0-9$]+)\[[A-z0-9$"]+\(this,(.*)\)/.exec(functionBody);
          return [funcName[1], funcName[2]];
        }


        while ((m = threeSymbolsFunctionsNameForProcessing.exec(funcBodyProcessed)) !== null) {
          // This is necessary to avoid infinite loops with zero-width matches
          if (m.index === threeSymbolsFunctionsNameForProcessing.lastIndex) {
            threeSymbolsFunctionsNameForProcessing.lastIndex++;
          }

          // The result can be accessed through the `m`-variable.
          m.forEach((match, groupIndex) => {
            // console.log(`Found match, group ${groupIndex}: ${match}`);
            let updMatch = match.replaceAll(",", "").replaceAll("]", "").replaceAll("[", "");
         //   console.log(`Found match: ${updMatch}`);
            let findSourceOfMatch = new RegExp(`var ${updMatch.replace("$", "\\$")}=function\\(.*\\){return .*};`).exec(baseJs.data)
            whatToReplace.push(updMatch);
           // console.log(`var ${updMatch}=function\\(.*\\){return .*};`);
           // console.log(`Found findSourceOfMatch: ${findSourceOfMatch}`);
            findSourceOfMatch = this.processFunctionWithKnownSecretArray(findSourceOfMatch[0], baseJs.data)
            let args = parseArgsOfFunc(findSourceOfMatch);
            let subfunc = parseSubFunc(findSourceOfMatch);
            // console.log(`Found findSourceOfMatch: ${findSourceOfMatch}, args: ${args}, subfunc: ${JSON.stringify(subfunc)}`);
            let subFuncBodyRegex = new RegExp(`\\s${subfunc[0].replace("$", "\\$")}=function\\(.*\\){[\\s\\S]*?return [A-z0-9]+};`).exec(baseJs.data);
            if (subFuncBodyRegex == null && subfunc[0]===funcName) {
              subFuncBody.push([subfunc[0], subfunc[1], this.processFunctionWithKnownSecretArray(funcBody, baseJs.data), args])
            }
            else {
              let processed = "";
              try {
                processed =
                  this.processFunctionWithKnownSecretArray(subFuncBodyRegex[0], baseJs.data);
              }
              catch (e) {
                processed = "error";
              }
              subFuncBody.push([subfunc[0], subfunc[1], processed, args])
            }
          });
          // console.warn(subFuncBody);
        }
        for (let i = 0; i < whatToReplace.length; i++) {
          // funcBody += "\n";
          // console.warn(whatToReplace[i])
          // funcBodyProcessed = funcBodyProcessed.replace(whatToReplace[i], subFuncBody[i][0] + "("+ subFuncBody[i][1] + ")")
       //   console.log(`var ${whatToReplace[i]} = function(${subFuncBody[i][3]}){return ${subFuncBody[i][0]}(${subFuncBody[i][1]})}`)
          funcBodyProcessed += `var ${whatToReplace[i]} = function(${subFuncBody[i][3]}){return ${subFuncBody[i][0]}(${subFuncBody[i][1]})};`
        }
        //console.warn(funcBodyProcessed)
        const subFuncBodyFiltered = new Set();
        const result = subFuncBody.filter(([key, _]) => {
          if (subFuncBodyFiltered.has(key)) return false;
          subFuncBodyFiltered.add(key);
          return true;
        });
        for (let i = 0; i < result.length; i++) {
          funcBodyProcessed += "\n";
          if (result[i][0] === funcName) {
            continue;
          }
          funcBodyProcessed += result[i][2];


        }
        const regex = /[A-z0-9$]+=([A-z0-9$]+)\([0-9]+,.*\)(?:,|;|[,;][A-z0-9]+=)/gm;
        let m1;

        let tempFuncBodyProcessed = funcBodyProcessed;
        while ((m1 = regex.exec(tempFuncBodyProcessed)) !== null) {
          // This is necessary to avoid infinite loops with zero-width matches
          if (m1.index === regex.lastIndex) {
            regex.lastIndex++;
          }

          let arrayWithProcessedFunctions = [];
          // The result can be accessed through the `m1`-variable.
          m1.forEach((match, groupIndex) => {
            // console.log(`Found match, group ${groupIndex}: ${match}`);
            // console.warn(andOneFunct)
            if (groupIndex === 1) {
              let thFName = match.replace("$", "\\$");
              if (!arrayWithProcessedFunctions.indexOf(thFName)) {
                if (thFName !== funcName) {
                  let bodyOfAndOneFunct = new RegExp(`\\s${thFName}=function\\(.*\\){[\\s\\S]*?};\\s`).exec(baseJs.data)
                  // console.warn(`\\s${thFName}=function\\(.*\\){.*\\s.*\\s.*\\s.*\\s.*};`)
                  bodyOfAndOneFunct = this.processFunctionWithKnownSecretArray(bodyOfAndOneFunct[0], baseJs.data);
                  //  console.warn(bodyOfAndOneFunct)
                  funcBodyProcessed += "\n" + bodyOfAndOneFunct;
                  arrayWithProcessedFunctions.push(thFName);
                }
              }
            }
          });
        }

      //   ======================
        challenge_name = funcBodyProcessed;
      //  console.warn(challenge_name);
        const match = challenge_name.match(/function\s*\(([^)]+)\)/);

        if (match) {
          functionArg = match[1].trim();
        }

        let startIndex = challenge_name.indexOf('{');
        let trimmedCode = challenge_name.slice(startIndex).substring(1);
        let endIndex = trimmedCode.lastIndexOf('}');
        trimmedCode = trimmedCode.slice(0, endIndex);
        challenge_name = trimmedCode;
        fullCode =
          // "var "+ funcName +"=function("+functionArg+"){" + challenge_name + "}; return "+ funcName + ";";
          // "var "+ funcName +"=function("+functionArg+"){console.error(" + functionArg + "); debugger;" + challenge_name + "};"
          "var "+ funcName +"=function("+functionArg+"){" + challenge_name + "};"
        // console.warn(fullCode)
        this.nfunction = funcName;
      }
      else {

        challenge_name = res[0];
       // console.warn(challenge_name);
        const match = challenge_name.match(/function\s*\(([^)]+)\)/);

        if (match) {
          functionArg = match[1].trim();
        }

        let startIndex = challenge_name.indexOf('{');
        let trimmedCode = challenge_name.slice(startIndex).substring(1);
        let endIndex = trimmedCode.lastIndexOf('}');
        trimmedCode = trimmedCode.slice(0, endIndex);
        challenge_name = trimmedCode;
        fullCode =
          "var getN=function("+functionArg+"){" + challenge_name + "};";

        this.nfunction = "getN";
      }

    }

    // let tempFunctionArgs = functionArg.split(",");
    // if (tempFunctionArgs.length > 1) {
    //   functionArg = tempFunctionArgs[0] + "=1,";
    //   for (let i = 1; i < tempFunctionArgs; i++) {
    //     functionArg += tempFunctionArgs[i] + ","
    //   }
    //   functionArg = functionArg.slice(0, -1);
    // }

    fullCode = this.processFunctionWithKnownSecretArray(fullCode, baseJs.data);
    // console.warn(fullCode);

    fullCode = fullCode.replace(/if\(typeof [A-Za-z0-9_$]+==="undefined"\)return [A-Za-z0-9]+;/g, "");
    fullCode = fullCode.replace(/if\(typeof [A-Za-z0-9_$]+==="undefined"\)var [A-Za-z0-9]+=[A-Za-z0-9]+;/g, "if (false) var sgsgnsbdbnn = 1;");
    fullCode = fullCode.replace(/typeof [A-z0-9$]+==="undefined"/g, "false");
    // console.warn(fullCode);
    let modify = /([A-z0-9$])\[\"([A-z0-9$]+)\"\]/g.exec(fullCode);
    if (modify) {
      // console.warn(modify);
      fullCode = fullCode.replace(/([A-z0-9$])\["([A-z0-9$]+)"\]/g, '$1.$2');
      fullCode = fullCode.replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
    }
    // console.warn(fullCode);
    const script = document.createElement('script');
    script.textContent = fullCode;
    document.head.appendChild(script);
    // let getN = new Function(fullCode);
    // this.nfunction = getN();
  }

  async initAsync() {
    const html = await Http.get({
      url: constants.URLS.YT_MOBILE,
      params: { hl: localStorage.getItem("language") || "en", },
    }).catch((error) => error);
    // Get url of base.js file
    let baseJsUrl =
      constants.URLS.YT_MOBILE +
      getBetweenStrings(html.data, '"jsUrl":"', '","');
    // const baseJsUrl =
    //   "https://m.youtube.com//s//player//******//player-plasma-****.vflset//base.js";
    // baseJsUrl =
    //   "https://m.youtube.com/s/player/22f02d3d/player_ias.vflset/uk_UA/base.js";
    // baseJsUrl =
    //   "https://m.youtube.com/s/player/20830619/player_ias.vflset/uk_UA/base.js";
    // baseJsUrl =
    //   "https://m.youtube.com/s/player/377ca75b/player_ias.vflset/uk_UA/base.js";
    // if (baseJsUrl.indexOf("player-plasma") > 0) {
      // baseJsUrl = baseJsUrl.replace(".vflset", "").replace("player-plasma-ias-phone-", "player_ias.vflset/")
    // }

    // Get base.js content
    // 377ca75b
    const baseJs = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);
    await this.makeDecipherFunction(baseJs);

    console.warn("one");
    await this.getNFunction(baseJs);
    console.warn("two");
    // await this.getPOTFunction(baseJs);
    console.warn("three");
   const regex = /\/player\/([a-f0-9]{8})\/player/;
    const match = baseJsUrl.match(regex);
    if (match) {
      localStorage.setItem("baseJsVersion", match[1]);
    }
    try {
      if (html instanceof Error && this.checkErrorCallback)
        this.ErrorCallback(html.message, true);

      try {
        const data = JSON.parse(
          "{" + getBetweenStrings(html.data, "ytcfg.set({", ");")
        );
        // console.warn(data);
        this.visitorData = data.VISITOR_DATA || data.EOM_VISITOR_DATA;
        if (data.INNERTUBE_CONTEXT) {
          this.key = data.INNERTUBE_API_KEY;
          this.context = data.INNERTUBE_CONTEXT;
          this.logged_in = data.LOGGED_IN;

          if (this.recommendationsFix) {
            console.log("Applying patch for Emulators (recommendation page fix)");
            this.context.client.userAgent =  constants.YT_API_VALUES.USER_AGENT;
          }

          this.context.client = constants.INNERTUBE_CLIENT(this.context.client);
          this.header = constants.INNERTUBE_HEADER(this.context.client);
        }
      } catch (err) {
        console.log(err);
        if (this.checkErrorCallback) {
          this.ErrorCallback(html.data, true);
          this.ErrorCallback(err, true);
        }
        if (this.retry_count < 10) {
          this.retry_count += 1;
          if (this.checkErrorCallback)
            this.ErrorCallback(
              `retry count: ${this.retry_count}`,
              false,
              `An error occurred while trying to init the innertube API. Retrial number: ${this.retry_count}/10`
            );
          await delay(5000);
          await this.initAsync();
        } else {
          if (this.checkErrorCallback)
            this.ErrorCallback(
              "Failed to retrieve Innertube session",
              true,
              "An error occurred while retrieving the innertube session. Check the Logs for more information."
            );
        }
      }
    } catch (error) {
      this.ErrorCallback(error, true);
      console.error(error);
    }
  }

  static async createAsync(ErrorCallback) {
    const created = new Innertube(ErrorCallback);

    await created.initAsync();
    return created;
  }

  //--- API Calls ---//

  async browseAsync(action_type, args = {}) {
    let data = {
      context: {
        client: constants.INNERTUBE_CLIENT(this.context.client),
      },
    };

    switch (action_type) {
      case "recommendations":
        args.browseId = "FEwhat_to_watch";
        //args.browseId = "FEtrending";
        break;
      case "trending":
        // args.browseId = "FEwhat_to_watch";
        args.browseId = "FEtrending";
        break;
      case "playlist":
      case "aboutChannelInfo":
        data = {
          context: {
            client: constants.INNERTUBE_CLIENT_FOR_CHANNEL(this.context.client),
          },
        };
        data.context.client = {
          ...data.context.client,
          clientFormFactor: "LARGE_FORM_FACTOR",
        };
        data.context = {
          ...data.context,
          request: constants.INNERTUBE_REQUEST(),
        };
        break;
      case "channel":
        data = {
          context: {
            client: constants.INNERTUBE_CLIENT_FOR_CHANNEL(this.context.client),
          },
        };
        data.context.client = {
          ...data.context.client,
          clientFormFactor: "LARGE_FORM_FACTOR",
        };
        data.context = {
          ...data.context,
          request: constants.INNERTUBE_REQUEST(),
        };
        if (args && args.browseId) {
          break;
        } else {
          throw new ReferenceError("No browseId provided");
        }
      default:
    }
    data = { ...data, ...args };

    console.log(data);

    const response = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/browse?key=${this.key}`,
      data: data,
      headers: { "Content-Type": "application/json" },
    }).catch((error) => error);
    console.log(response);

    if (response instanceof Error)
      return {
        success: false,
        status_code: response.status,
        message: response.message,
      };

    return {
      success: true,
      status_code: response.status,
      data: response.data,
    };
  }

  async getContinuationsAsync(continuation, type, contextAdditional = {}) {
    let data = {
      context: { ...contextAdditional },
      continuation: continuation,
    };
    if (contextAdditional.client ? contextAdditional.client.clientName === "MWEB" : false) {
      data.context.client = {
        ...constants.INNERTUBE_VIDEO(this.context.client),
      };
      data.context.client.clientName = contextAdditional.client.clientName;
      data.context.client.clientVersion = contextAdditional.client.clientVersion;
    }
    else {
      data.context.client = {
        ...constants.INNERTUBE_CLIENT(this.context.client),
      };
    }
    let url;
    switch (type.toLowerCase()) {
      case "browse":
        url = `${constants.URLS.YT_BASE_API}/browse?key=${this.key}`;
        break;
      case "search":
        url = `${constants.URLS.YT_BASE_API}/search?key=${this.key}`;
        break;
      case "next":
        url = `${constants.URLS.YT_BASE_API}/next?key=${this.key}`;
        break;
      default:
        throw "Invalid type";
    }

    const response = await Http.post({
      url: url,
      data: data,
      headers: { "Content-Type": "application/json" },
    }).catch((error) => error);
    if (response instanceof Error) {
      return {
        success: false,
        status_code: response.status,
        message: response.message,
      };
    }
    return {
      success: true,
      status_code: response.status,
      data: response.data,
    };
  }

  async getCaptions(id) {
    let data = {
      context: {
        client: constants.INNERTUBE_TECHNICAL(this.context.client),
      },
      videoId: id,
    };
    let response = "";

    const clientConfigs  = constants.clientConfigs;
    for (const config of clientConfigs) {
      data.context.client.clientName = config.CLIENTNAME;
      data.context.client.clientVersion = config.VERSION_WEB;
      console.warn("Trying with client config - ", data.context.client);
      // this.context.client = data.context.client;
      if (config.clientScreen === "EMBED" && config.CLIENTNAME === "WEB_EMBEDDED_PLAYER") {
        data.context.thirdParty = {
          "embedUrl": "https://www.youtube.com/embed/" + id,
        }
      }
      response = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
        data: {
          ...data,
        },
        headers: constants.INNERTUBE_NEW_HEADER(data.context.client),
      }).catch((error) => error);

      if (response?.data?.playabilityStatus?.status !== "UNPLAYABLE" &&
        response?.data?.playabilityStatus !== "LOGIN_REQUIRED" && response?.data?.playabilityStatus?.status !== "ERROR") {
        break;
      }

    }
    return response.data;
  }


  async getVidAsync(id) {
    let data = {
      context: {
        client: constants.INNERTUBE_VIDEO(this.context.client),
      },
      videoId: id,
    };
    let dataForNext = {
      context: {
        client: {
          ...constants.INNERTUBE_VIDEO(this.context.client),
          clientName: constants.YT_API_VALUES.CLIENT_WEB_M,
          clientVersion: constants.YT_API_VALUES.VERSION_WEB,
          gl: this.context.client.gl,
          hl: this.context.client.hl,
          remoteHost: this.context.client.remoteHost,
        },
      },
      videoId: id,
    };

    const responseNext = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/next?key=${this.key}`,
      data: {
        ...dataForNext,
      },
      headers: constants.INNERTUBE_HEADER(this.context.client),
    }).catch((error) => error);

    // this.pot = this.getPot(this.visitorData, 2);
    let response = "";

    const clientConfigs  = constants.clientConfigs;
    for (const config of clientConfigs) {
      if (this.recommendationsFix) {
        console.log("Applying patch for Emulators (recommendation page fix)");
        data.context.client.userAgent = config.CLIENTNAME;
      }
      data.context.client.clientName = config.CLIENTNAME;
      data.context.client.clientVersion = config.VERSION_WEB;
      data.context.client.clientScreen = config.clientScreen;
      config.deviceMake ? data.context.client.deviceMake = config.deviceMake : ""
      config.deviceModel ? data.context.client.deviceModel = config.deviceModel : ""
      config.browserName ? data.context.client.browserName = config.browserName : ""
      config.browserVersion ? data.context.client.browserVersion = config.browserVersion : ""
      config.platform ? data.context.client.platform = config.platform : ""
      config.USER_AGENT ? data.context.client.userAgent = config.USER_AGENT : ""
      console.warn("Trying with client config - ", data.context.client);
      if (config.clientScreen === "EMBED" && config.CLIENTNAME === "WEB_EMBEDDED_PLAYER") {
        data.context.thirdParty = {
          "embedUrl": "https://www.youtube.com/embed/" + id,
        }
      }
      // this.context.client = data.context.client;
      response = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
        data: {
          ...data,
          ...{
            playerParams: this.playerParams,
            contentCheckOk: false,
            racyCheckOk: false,
            // serviceIntegrityDimensions: {
            //   poToken: this.pot
            // },
            playbackContext: {
              contentPlaybackContext: {
                currentUrl: "/watch?v=" + id + "&pp=" + this.playerParams,
                vis: 0,
                splay: false,
                autoCaptionsDefaultOn: false,
                autonavState: "STATE_NONE",
                html5Preference: "HTML5_PREF_WANTS",
                signatureTimestamp: this.signatureTimestamp,
                referer: "https://m.youtube.com/",
                lactMilliseconds: "-1",
                watchAmbientModeContext: {
                  watchAmbientModeEnabled: true,
                },
              },
            },
          },
        },
        headers: constants.INNERTUBE_NEW_HEADER(data.context.client),
      }).catch((error) => error);

      if (response?.data?.playabilityStatus?.status !== "UNPLAYABLE" &&
        response?.data?.playabilityStatus !== "LOGIN_REQUIRED") {
        break;
      }

    }
    if (response.error) {

      return {
        success: false,
        status_code: response.status,
        message: response.message,
      };}

    else if (responseNext.error)
      return {
        success: false,
        status_code: responseNext.status,
        message: responseNext.message,
      };

    return {
      success: true,
      status_code: response.status,
      data: { output: response.data, outputNext: responseNext.data },
    };
  }

  async searchAsync(query) {
    let data = { context: this.context, query: query };

    const response = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/search?key=${this.key}`,
      data: data,
      headers: { "Content-Type": "application/json" },
    }).catch((error) => error);

    if (response instanceof Error)
      return {
        success: false,
        status_code: response.status,
        message: response.message,
      };

    return {
      success: true,
      status_code: response.status,
      data: response.data,
    };
  }

  async getEndPoint(url, skipCheck = false) {
    let data;
    let response;
    if (!skipCheck) {
      data = { context: this.context, url: url };

      response = await Http.get({
        // url: `${url}/navigation/resolve_url?key=${this.key}`,
        url: `${url}`,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }).catch(() => {

        // console.warn(browseId);
      });
      const html = response.data; // Assuming data property holds the HTML content

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const metaTags = doc.querySelectorAll('meta[itemprop="identifier"]');

      let browseId;
      if (metaTags.length > 0) {
        browseId = metaTags[0].content;
      }
      else {
        let match;
        let regex = /{"browseId":"([A-z0-9-]+)"}/gm;
        while ((match = regex.exec(html)) !== null) {
          browseId = match[1];
        }

      }
      data.context = {
        ...data.context,
        request: constants.INNERTUBE_REQUEST(),
      };
      data = {
        ...data,
        browseId: browseId,
        context: {
          client: constants.INNERTUBE_CLIENT_FOR_CHANNEL(this.context.client),
        },
      };
      data.context.client = {
        ...data.context.client,
        clientFormFactor: "LARGE_FORM_FACTOR",
      };
      response = await Http.post({
        // url: `${constants.URLS.YT_BASE_API}/navigation/resolve_url?key=${this.key}`,
        url: `${constants.URLS.YT_BASE_API}/browse?key=${this.key}`,
        data: data,
        headers: { "Content-Type": "application/json" },
      }).catch((error) => error);

      if (response instanceof Error)
        return {
          success: false,
          status_code: response.status,
          message: response.message,
        };
    }
    else {
      data = { context: this.context, browseId: url };
      data.context = {
        ...data.context,
        request: constants.INNERTUBE_REQUEST(),
      };
      data = {
        ...data,
        browseId: url,
        context: {
          client: constants.INNERTUBE_CLIENT_FOR_CHANNEL(this.context.client),
        },
      };
      data.context.client = {
        ...data.context.client,
        clientFormFactor: "LARGE_FORM_FACTOR",
      };
      // console.warn("DATA" , data);
      response = await Http.post({
        // url: `${constants.URLS.YT_BASE_API}/navigation/resolve_url?key=${this.key}`,
        url: `${constants.URLS.YT_BASE_API}/browse?key=${this.key}`,
        data: data,
        headers: { "Content-Type": "application/json" },
      }).catch((error) => error);

      if (response instanceof Error)
        return {
          success: false,
          status_code: response.status,
          message: response.message,
        };
    }

    return {
      success: true,
      status_code: response.status,
      data: response.data,
    };
  }

  // WARNING: This is tracking the user's activity, but is required for recommendations to properly work
  async apiStats(params, url) {
    console.warn(params);
    params = {
      ...params,
      ...{
        ver: 2,
        c: constants.YT_API_VALUES.CLIENTNAME.toLowerCase(),
        cbrver: constants.YT_API_VALUES.VERSION,
        cver: constants.YT_API_VALUES.VERSION,
      },
    };
    const queryParams = new URLSearchParams(params);
    const urlWithParams = url + "&" + queryParams.toString();

    await Http.get({
      url: urlWithParams,
      headers: this.header,
    });
  }

  // Static methods

  static async getThumbnail(id, resolution) {
    if (resolution === "max" || resolution === "resmax") {
      let maxResUrl = `https://img.youtube.com/vi/${id}/maxresdefault.jpg`;
      try {
        let xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';
        return new Promise((resolve, reject) => {
          xhr.open('GET', maxResUrl, true);
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(URL.createObjectURL(xhr.response));
            } else {
              resolve(`https://img.youtube.com/vi/${id}/mqdefault.jpg`);
            }
          };
          xhr.send();
        });
      } catch (error) {
        return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
      }
    }
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  }

  // Simple Wrappers
  async getRecommendationsAsync(recommendationsType = "recommendations") {
    const rec = await this.browseAsync(recommendationsType);
    return rec;
  }
  async getChannelAsync(url, tab="main") {
    const channelEndpoint = await this.getEndPoint(url, true);
    if (
      channelEndpoint.success &&
      channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs[1].tabRenderer.endpoint?.browseEndpoint
    ) {
      switch (tab) {
        case "main":
          return await this.browseAsync(
            "channel",
            channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs[1].tabRenderer.endpoint?.browseEndpoint
          );
        case "community":
          if (channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs.length <= 2) {
            // console.warn("Community null")
            return null;
          }
          return await this.browseAsync(
            "channel",
            channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs[channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs.length-2].tabRenderer.endpoint?.browseEndpoint
          );
        case "videos":
          return await this.browseAsync(
            "channel",
            channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs[1].tabRenderer.endpoint?.browseEndpoint
          );
        case "aboutChannelInfo":
          return await this.browseAsync(
            "channel",
            channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs[channelEndpoint.data.contents.singleColumnBrowseResultsRenderer.tabs.length-2].tabRenderer.endpoint?.browseEndpoint
          );
      }

    } else {
      throw new ReferenceError("Cannot find channel");
    }
  }

  async VidInfoAsync(id) {
    let response = await this.getVidAsync(id);

    if (
      response.success == false ||
      response.data.output?.playabilityStatus?.status == ("ERROR" || undefined)
    )
      throw new Error(
        `Could not get information for video: ${
          response.status_code ||
          response.data.output?.playabilityStatus?.status
        } - ${
          response.message || response.data.output?.playabilityStatus?.reason
        }`
      );
    const responseInfo = response.data.output;
    const responseNext = response.data.outputNext;
    let details = responseInfo.videoDetails;

    const publishDate =
      responseInfo?.microformat?.playerMicroformatRenderer?.publishDate;
    let resolutions = responseInfo.streamingData;
    let hls = responseInfo.streamingData?.hlsManifestUrl ? responseInfo.streamingData?.hlsManifestUrl : null;
    let dash = responseInfo.streamingData?.dashManifestUrl ? responseInfo.streamingData?.dashManifestUrl : null;

    // let hls = responseInfo.streamingData?.hlsManifestUrl && responseInfo.videoDetails.isLiveContent ? responseInfo.streamingData?.hlsManifestUrl : null;
    // let dash = responseInfo.streamingData?.dashManifestUrl && responseInfo.videoDetails.isLiveContent ? responseInfo.streamingData?.dashManifestUrl : null;
    if (details.isPostLiveDvr) {
      // hls = null;
      // dash = null;
    }
    // console.warn(hls)
    const columnUI =
      responseNext.contents.singleColumnWatchNextResults.results.results;
    const vidMetadata = columnUI.contents.find(
      (content) => content.slimVideoMetadataSectionRenderer
    ).slimVideoMetadataSectionRenderer;

    // const recommendations = columnUI?.contents.find(
    //   (content) => content?.itemSectionRenderer?.targetId == "watch-next-feed"
    // )?.itemSectionRenderer;
    const recommendations = {contents: columnUI?.contents
      ?.filter(c => c.itemSectionRenderer?.contents)
      ?.flatMap(c =>
        c.itemSectionRenderer.contents.filter(
          item => !item.videoMetadataCarouselViewModel &&
            !item.compactRadioRenderer
        )
      )}

    console.warn(recommendations)
    if (details.title == null) {
      vidMetadata?.contents.forEach((content) => {
          let text = content?.slimVideoInformationRenderer?.title.runs[0].text;
          if (text !== undefined) {
            details.title = text;
            return;
          }
        });
    }
    let metadata = {};
    vidMetadata?.contents.forEach((content) => {
      let likesCount = content?.slimVideoActionBarRenderer?.buttons[0].slimMetadataButtonRenderer.button.segmentedLikeDislikeButtonViewModel.likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel.toggleButtonViewModel.defaultButtonViewModel.buttonViewModel.accessibilityText;

      if (likesCount !== undefined) {
        likesCount = likesCount.replaceAll(/\D+/gm, "")
        likesCount = parseInt(likesCount);
        metadata.likes = likesCount.toLocaleString();
        return;
      }
    });

    const ownerData = vidMetadata.contents.find(
      (content) => content.slimOwnerRenderer
    )?.slimOwnerRenderer;
    let isLive = false;
    const captions = responseInfo.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    captions?.unshift({
      baseUrl: null,
      name: {
        runs: [{text: "Disable captions"}]
      }
    })
    try {
      console.log(vidMetadata.contents);
      this.playerParams =
        ownerData.navigationEndpoint.watchEndpoint.playerParams;
    } catch (e) {}
    // Deciphering urls
    resolutions = resolutions?.formats ? resolutions?.formats.concat(resolutions.adaptiveFormats) : resolutions?.adaptiveFormats;
    resolutions?.forEach((source) => {
      if (source.isLive) {
        isLive = true;
      }
        if (source.signatureCipher) {
          const params = new Proxy(
            new URLSearchParams(source.signatureCipher),
            {
              get: (searchParams, prop) => searchParams.get(prop),
            }
          );
          if (params.s) {
            let cipher = decodeURIComponent(params.s);
            // console.warn(cipher)
            let decipheredValue;
            try {
              decipheredValue = this.decodeUrl(cipher);

              if (decipheredValue === undefined || decipheredValue === true || decipheredValue === false) {
                decipheredValue = this.decodeUrl(parseInt(this.decodeUrlFirstArg), cipher);
              }
            }catch (e) {
               decipheredValue = this.decodeUrl(parseInt(this.decodeUrlFirstArg), cipher);
            }
            // console.log("decipheredValue", decipheredValue);
            source["url"] = (params.url + "&sig=" + decipheredValue).replace(
              /&amp;/g,
              "&"
            );
          }
        }



        var searchParams = new URLSearchParams(source.url);

        //Iterate the search parameters.
        let n = searchParams.get("n");
        //let clen = searchParams.get("clen");
        let nValue = "";
        if (n !== null) {
          try {
            nValue = "&n=" + this.nfunction(n)
            if (nValue === undefined) {
              nValue = "&n=" + window[this.nfunction](parseInt(this.nfunctionFirstArg), n)
            }
          }
           catch (e) {
             // nValue = "&n=" + this.nfunction(1, n)
             nValue = "&n=" + window[this.nfunction](parseInt(this.nfunctionFirstArg), n.toString())
           }
        }
        searchParams.delete("n");

        // For some reasons, searchParams.delete not removes &n in music videos
        source["url"] = source["url"].replace(/&n=[^&]*/g, "");
              source["url"] = source["url"] + nValue;
        // source["url"] = source["url"] + "&alr=yes";
        source["url"] = source["url"] + "&cver=" + constants.YT_API_VALUES.VERSION_WEB;
        // source["url"] = source["url"] + "&ump=1";
        // source["url"] = source["url"] + "&srfvp=1";
        source["url"] = source["url"] + "&cpn=" + getCpn();
        // source["url"] = source["url"] + "&pot=" + encodeURIComponent(this.pot);
        // source["url"] = source["url"] + "&range=0-" + source.contentLength;
        if (searchParams.get("mime").indexOf("audio") < 0) {
          // source["url"] = source["url"] + "&range=0-";
          // source["url"] = source["url"] + "&alr=yes";
        }
      });
    const vidData = {
      id: details.videoId,
      title: details.title,
      isLive: details.isLiveContent,
      channelName: ownerData?.title.runs[0].text,
      channelSubs: ownerData?.collapsedSubtitle?.runs[0]?.text,
      channelUrl: rendererUtils.getNavigationEndpoints(
        ownerData.navigationEndpoint
      ),
      channelImg: ownerData?.thumbnail?.thumbnails[0].url,
      captions: captions,
      endscreen: responseInfo.endscreen,
      storyboards: responseInfo.storyboards.playerStoryboardSpecRenderer.spec,
      availableResolutions: resolutions.formats ? resolutions.formats : resolutions,
      availableResolutionsAdaptive: resolutions?.adaptiveFormats ? resolutions.adaptiveFormats : resolutions,
      hls: hls,
      dash: dash,
      metadata: {
        publishDate: publishDate,
        contents: vidMetadata.contents,
        description: details.shortDescription,
        thumbnails: details.thumbnails?.thumbnails,
        isPrivate: details.isPrivate,
        viewCount: details.viewCount,
        lengthSeconds: details.lengthSeconds,
        isLive: isLive,
        likes: metadata.likes,
      },
      renderedData: {
        description: responseNext.engagementPanels
          .find(
            (panel) =>
              panel.engagementPanelSectionListRenderer.panelIdentifier ==
              "video-description-ep-identifier"
          )
          .engagementPanelSectionListRenderer.content.structuredDescriptionContentRenderer.items.find(
            (item) => item?.expandableVideoDescriptionBodyRenderer
          )?.expandableVideoDescriptionBodyRenderer || null,
        recommendations: recommendations,
        recommendationsContinuation:
          recommendations?.contents[recommendations.contents.length - 1]
            .continuationItemRenderer?.continuationEndpoint.continuationCommand
            .token,
      },
      engagementPanels: responseNext.engagementPanels,
      commentData: columnUI.contents
        .find((content) => content.itemSectionRenderer?.contents)
        ?.itemSectionRenderer.contents[0].videoMetadataCarouselViewModel,
      playbackTracking: responseInfo.playbackTracking,
      commentContinuation: responseNext.engagementPanels
        .find(
          (panel) =>
            panel.engagementPanelSectionListRenderer.panelIdentifier ==
            "engagement-panel-comments-section"
        )
        ?.engagementPanelSectionListRenderer.content.sectionListRenderer.contents.find(
          (content) => content.itemSectionRenderer
        )
        ?.itemSectionRenderer.contents.find(
          (content) => content.continuationItemRenderer
        )?.continuationItemRenderer.continuationEndpoint.continuationCommand
        .token,
    };

    return vidData;
  }

  async getSearchAsync(query) {
    const search = await this.searchAsync(query);
    if (search.success == false)
      throw new Error(
        `Could not get search results: ${search.status_code} - ${search.message}`
      );
    console.log(search.data);
    return search.data;
  }
}

export default Innertube;
