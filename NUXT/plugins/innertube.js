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
    let regex = new RegExp(`(${secretArrayName.replace("$", "\\$")})\\[([0-9]+)\\]`, 'gm');
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
    if (firstPart0.exec(baseJs.data)) {
      isMatch = firstPart0.exec(baseJs.data);
    } else if (firstPart1.exec(baseJs.data)) {
      isMatch = firstPart1.exec(baseJs.data);
    }

    if (isMatch) {
      let firstPart = isMatch[0];
      let helpDecipher;
      let secondPart0 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return [A-z0-9$]\.join\(""\)\};/;
      let secondPart1 = /{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart2 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart3 = /\{[A-Za-z]=[A-Za-z]\.split\(""[^"]*""\)\};/i;
      let secondPart4 = /\{a=a\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return a\.join\(""\)\};/;
      let secondPart5 = /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/;
      let secondPart6 = /{[A-Za-z]=[A-Za-z]\.split\(""\);.*return [A-Za-z]\.join\(""\)};/;
      let secondPart7 = /{[A-Za-z]=[A-Za-z]\.split\(.*\);return [A-Za-z]\.join\(.*\)};/;
      let secondPart8 = /{[A-Za-z]=[A-Za-z]\[[A-Za-z$]+\[[0-9]+\]\]\([A-Za-z$]+\[[0-9]+\]\).*/;
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
      else {
        helpDecipher = secondPart8.exec(baseJs.data);
        if (helpDecipher) {
          isMatch[0] = this.processFunctionWithSecretArray(helpDecipher, helpDecipher[0], baseJs.data);
        }
      }

      if (!isMatch) {
        console.warn(
          "The second part of decipher string does not match the regex pattern."
        );
      }

      // Example:
      // {a=a.split("");IF.k4(a,4);IF.VN(a,68);IF.DW(a,2);IF.VN(a,66);IF.k4(a,19);IF.DW(a,2);IF.VN(a,36);IF.DW(a,2);IF.k4(a,41);return a.join("")};

      // Get third part of decipher function
      let functionArg = "";
      if (helpDecipher) {
        isMatch[0] = isMatch[0].replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
        firstPart = this.processFunctionWithKnownSecretArray(firstPart, baseJs.data);
        firstPart = firstPart.replace(/([A-z0-9$])\["([A-z0-9$]+)"\]/g, '$1.$2');
        firstPart = firstPart.replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
      }
      const match = isMatch[0].match(/(\w+)\.join\(\s*""\s*\)/);
      if (match) {
        functionArg = match[1];
      }

      const thirdPart =
        "var decodeUrl=function("+functionArg+")" + isMatch[0] + "return decodeUrl;";
      let decodeFunction = firstPart + thirdPart;
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

      // console.warn(res);
      res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return [A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\[[0-9]+\\]\\)};`, 'g').exec(baseJs.data);
      if (res == null) {
        res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(.*\\)};`, 'g').exec(baseJs.data);
        console.log(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(.*\\)}`);
      }
      // console.warn(res[0]);
      let helpDecipher = /return [A-Za-z]\.join\(.*\)}/.exec(
        res[0]
      );
      // console.warn(res[0]);
      // console.warn(helpDecipher);
      // 25.03.2025 - new update: additional array with some values.
      if (helpDecipher) {
          res[0] = this.processFunctionWithSecretArray(helpDecipher, res[0], baseJs.data);
      }
      challenge_name = res[0];
      const match = challenge_name.match(/function\s*\(([^)]+)\)/);

      if (match) {
        functionArg = match[1].trim();
      }

      var startIndex = challenge_name.indexOf('{');

        let trimmedCode = challenge_name.slice(startIndex).substring(1);
        var endIndex = trimmedCode.lastIndexOf('}');
          trimmedCode = trimmedCode.slice(0, endIndex);
          challenge_name = trimmedCode;
    }

    let fullCode =
      "var getN=function("+functionArg+"){" + challenge_name + "}; return getN;";

    fullCode = this.processFunctionWithKnownSecretArray(fullCode, baseJs.data);
    // console.warn(fullCode);
    fullCode = fullCode.replace(/if\(typeof [A-Za-z0-9_$]+==="undefined"\)return [A-Za-z0-9]+;/g, "");
    // console.warn(fullCode);
    let modify = /([A-z0-9$])\[\"([A-z0-9$]+)\"\]/g.exec(fullCode);
    if (modify) {
      fullCode = fullCode.replace(/([A-z0-9$])\["([A-z0-9$]+)"\]/g, '$1.$2');
      fullCode = fullCode.replace(/\[\"([A-z0-9$]+)\"\]/g, '.$1');
    }
    // console.warn(fullCode);
    let getN = new Function(fullCode);
    this.nfunction = getN();
  }

  async initAsync() {
    const html = await Http.get({
      url: constants.URLS.YT_MOBILE,
      params: { hl: "en" },
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
    // Get base.js content
    const regex = /\/player\/([a-f0-9]{8})\/player/;
    const match = baseJsUrl.match(regex);
    if (match) {
      localStorage.setItem("baseJsVersion", match[1]);
    }

    const baseJs = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);
    await this.makeDecipherFunction(baseJs);

    console.warn("one");
    await this.getNFunction(baseJs);
    console.warn("two");
    // await this.getPOTFunction(baseJs);
    console.warn("three");

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

  async getChannelHtml(channel_url){

    let data = {
      context: {
        client: constants.INNERTUBE_CLIENT(this.context.client),
      },
    };
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

    const response = await Http.get({
      url: `${channel_url}`,
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
      this.context.client = data.context.client;
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
      }).catch((error) => {

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
        // console.warn(html);
        // console.warn(regex.exec(html));
        while ((match = regex.exec(html)) !== null) {
          // console.warn(match);
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
  async getChannelVideosAsync(recommendationsType = "recommendations") {
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
    // const columnUI =
    //   responseInfo[3].response?.contents.singleColumnWatchNextResults?.results
    //     ?.results;
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

    const recommendations = columnUI?.contents.find(
      (content) => content?.itemSectionRenderer?.targetId == "watch-next-feed"
    )?.itemSectionRenderer;

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
    // console.warn(resolutions);
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
            let decipheredValue = this.decodeUrl(cipher);
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
          nValue = "&n=" + this.nfunction(n)
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
