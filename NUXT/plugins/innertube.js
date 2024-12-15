//⚠️🚧 WARNING: THIS FILE IS IN MAINTENANCE MODE 🚧⚠️
// DO NOT ADD NEW FEATURES TO THIS FILE. INNERTUBE.JS IS NOW A SEPARATE LIBRARY
// contribute to the library here: https://github.com/VueTubeApp/Vuetube-Extractor

// Code specific to working with the innertube API
// https://www.youtube.com/youtubei/v1

import { Http } from "@capacitor-community/http";
import { getBetweenStrings, delay } from "./utils";
import rendererUtils from "./renderers";
import constants, { YT_API_VALUES } from "./constants";

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
  }

  checkErrorCallback() {
    return typeof this.ErrorCallback === "function";
  }

  async makeDecipherFunction(baseJs) {
    // Example:
    //;var IF={k4:function(a,b){var c=a[0];a[0]=a[b%a.length];a[b%a.length]=c},
    // VN:function(a){a.reverse()},
    // DW:function(a,b){a.splice(0,b)}};
    let isMatch;
    if (
      /;var [A-Za-z$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\(a\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\};/.exec(
        baseJs.data
      )
    ) {
      isMatch =
        /;var [A-Za-z$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\(a\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\};/.exec(
          baseJs.data
        );
    } else if (
      /var [A-z0-9$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\([A-z0-9],[A-z0-9]\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\}\;/.exec(
        baseJs.data
      )
    ) {
      isMatch =
        /var [A-z0-9$]+=\{[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\},\n[A-Za-z0-9]+:function\([A-z0-9],[A-z0-9]\)\{[^}]*\},\n[A-Za-z0-9]+:function\([^)]*\)\{[^}]*\}\}\;/.exec(
          baseJs.data
        );
    }

    if (isMatch) {
      const firstPart = isMatch[0];

      if (
        /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return [A-z0-9$]\.join\(""\)\};/.exec(
          baseJs.data
        )
      ) {
        isMatch =
          /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return [A-z0-9$]\.join\(""\)\};/.exec(
            baseJs.data
          );
      } else if (
        /{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/.exec(
          baseJs.data
        )
      ) {
        isMatch =
          /{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/.exec(
            baseJs.data
          );
      } else if (
        /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/.exec(
          baseJs.data
        )
      ) {
        isMatch =
          /\{[A-Za-z$]=[A-z0-9$]\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return +[A-z0-9$]\.join\(""\)};/.exec(
            baseJs.data
          );
      } else if (/\{a=a\.split\(""[^"]*""\)\};/i.exec(baseJs.data)) {
        // 10.07.2023
        isMatch = /\{a=a\.split\(""[^"]*""\)\};/i.exec(baseJs.data);
      } else {
        isMatch =
          /\{a=a\.split\(""\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);[A-z0-9$]+\.[A-Za-z0-9]+\([^)]*\);return a\.join\(""\)\};/.exec(
            baseJs.data
          );
      }
      if (!isMatch) {
        console.warn(
          "The second part of decipher string does not match the regex pattern."
        );
      }
      // Example:
      // {a=a.split("");IF.k4(a,4);IF.VN(a,68);IF.DW(a,2);IF.VN(a,66);IF.k4(a,19);IF.DW(a,2);IF.VN(a,36);IF.DW(a,2);IF.k4(a,41);return a.join("")};

      // Get second part of decipher function
      // console.warn(firstPart);
      // console.warn(isMatch[0]);

      let functionArg = "";
      const match = isMatch[0].match(/(\w+)\.join\(\s*""\s*\)/);

      if (match) {
        functionArg = match[1];
      }


      const secondPart =
        "var decodeUrl=function("+functionArg+")" + isMatch[0] + "return decodeUrl;";
      // console.warn(secondPart);
      let decodeFunction = firstPart + secondPart;
      let decodeUrlFunction = new Function(decodeFunction);
      // console.warn(decodeFunction);
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
    let firstFunction = /[A-Za-z0-9]+=function\([A-Za-z0-9]+\)\{for\([^)]*\)\{[^}]*\}return [A-Za-z0-9]+\};/gm.exec(baseJs.data);
    let firstFunctionName = "";

    /**
     * Modification result from firstFunction
     * @type {RegExpExecArray}
     */
    let secondFunction = /[A-z0-9]+\.prototype\.[A-z0-9]+=function\([A-z0-9]+\)\{var [A-z0-9]+=[A-z0-9]+\(\);[^}]*return [A-z0-9]+\}/m.exec(baseJs.data);
    let secondFunctionName = "";

    let thirdFunction = /function\([^)]*\)\{[A-Za-z0-9]+===void 0\&\&\([A-z0-9]+\=0\)\;.*?join\(""\)\};/m.exec(baseJs.data);
    let fourthFunction = /[A-z0-9]+=function\(\)\{if[^₴]*\"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\"\.split\(""\),[^₴]*\)\}\}\}\}\;/.exec(baseJs.data)[0].match(/^.*?}};/);

    let resultF = "";
    if (firstFunction) {
      firstFunctionName = firstFunction[0].match(/^([a-zA-Z0-9_$]+)\s*=\s*function/)[1];

      // console.log(firstFunction[0]);
      // console.log(firstFunctionName);
      // console.log(firstFunctionName);
      // console.log(firstFunctionName);
      if (secondFunction) {
        // console.log(secondFunction[0]);
        let optimizedSecondFunc = secondFunction[0];


        optimizedSecondFunc = optimizedSecondFunc.replace(/var\s+([A-z0-9]+)=([A-z0-9]+)\(\);/g, firstFunction[0]+'\nvar $1='+firstFunctionName+'($2);');
        optimizedSecondFunc = optimizedSecondFunc.replace(/if\([^)]*\)throw new [A-Za-z0-9._]+\([0-9]+,"[^"]*"\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/this\.logger\.[A-Za-z0-9]+\([^)]*\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/this\.[A-Za-z0-9]+\.[A-Za-z0-9]+\([^)]*\);/g, '');
        optimizedSecondFunc = optimizedSecondFunc.replace(/^.*?prototype\./, '');

        optimizedSecondFunc = optimizedSecondFunc.replace(/var ([A-z0-9]+)\=[A-z0-9]+\(([A-z0-9]+)\)/, 'var $1='+firstFunctionName+'($2)\n');


        // console.log(optimizedSecondFunc);
        secondFunctionName = optimizedSecondFunc.match(/^([a-zA-Z0-9_$]+)\s*=\s*function/)[1];




        if (thirdFunction) {
          let functionNameForInserting = /[A-z0-9$]+\(\)/.exec(thirdFunction[0])[0];
          // let thirdFunction[0] = thirdFunction[0].replace(functionForInserting + "=", secondFunctionName);
          // console.log(functionNameForInserting);
          // console.log(fourthFunction[0]);
          // console.log(thirdFunction[0]);
          let inFFKV = fourthFunction[0].match(/([A-z0-9]+)\[[A-z0-9]+\]\=[A-z0-9]+/)[1];
          // console.warn(inFFKV);
          let fourthFunctionKeyValue = fourthFunction[0].match(/if\(\![A-z0-9$]+\)/)[0].replace("if(!", "").replace(")", "");
          // console.warn(fourthFunctionKeyValue);
          let modifiedThirdFunction = thirdFunction[0].replace(functionNameForInserting, "var "+ inFFKV +"={};\nvar "+fourthFunctionKeyValue+"=null;\n"+"var "+optimizedSecondFunc+";\n"+fourthFunction[0]+"\n"+functionNameForInserting+";\n");


          //
          // console.warn(modifiedThirdFunction);
          let fourthFunctionTwoKeyValue = modifiedThirdFunction.match(/[A-Za-z0-9$]+\[[A-Za-z0-9$]+\]=[A-Za-z0-9$]+;/)[0].split('[')[0];
          // console.warn(fourthFunctionTwoKeyValue);

          modifiedThirdFunction = modifiedThirdFunction.replace(functionNameForInserting+";\n", functionNameForInserting+";\nvar "+fourthFunctionTwoKeyValue+"="+secondFunctionName+"("+fourthFunctionTwoKeyValue+")\n");

          modifiedThirdFunction = modifiedThirdFunction.replace("var "+fourthFunctionKeyValue+"=null;\n", "var "+fourthFunctionKeyValue+"=null;\n");

          // console.warn(modifiedThirdFunction);
          resultF = modifiedThirdFunction;
        }


        else {

        }
        const match = resultF.match(/function\s*\(([^)]+)\)/);
        let functionArg = "";
        if (match) {
          // console.error(match);
          // functionArg = match[1].trim();
        }

        // let challenge_name = "CHALLENGE_NAME";
        const fullCode =
          "var getPot=" + resultF + " return getPot;";
        // console.error(fullCode);

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
        `var ${challenge_name.replace("$", "\\$")}\\s*=\\s*\\[(.+?)\\]\\s*[,;]`
      ).exec(baseJs.data)[1];

      if (challenge_name) {
        challenge_name = new RegExp(
          `${challenge_name}\\s*=\\s*function\\s*\\(([\\w$]+)\\)\\s*{(.+?}\\s*return\\ [\\w$]+.join\\(""\\))};`,
          "s"
        ).exec(baseJs.data)[2];
      }
    }else {
      challenge_name = /[A-z0-9$]=String\.fromCharCode\(110\),[A-z0-9$]=[A-z0-9$]\.get\([A-z0-9$]\)\)&&\([A-z0-9$]=[A-Za-z0-9]+\[0\]\([A-z0-9$]\),[A-z0-9$]\.set\([A-z0-9$],[A-z0-9$]\)/i.exec(baseJs.data);

      if (challenge_name === null) {

        challenge_name = /[A-z0-9$]=[A-Za-z0-9]+\[0\]\([A-z0-9$]\)/i.exec(baseJs.data);
      }
      else {
        challenge_name = /[A-z0-9$]=[A-Za-z0-9]+\[0\]\([A-z0-9$]\)/i.exec(challenge_name[0]);
      }

      challenge_name = challenge_name[0].replace(/^.*?=\s*(\w+)\s*\[.*$/, "$1");

      challenge_name = new RegExp(
        `var ${challenge_name}=[[A-Za-z0-9$]+];`).exec(baseJs.data)[0];

      challenge_name = challenge_name.replace(/^[^\[]*\[|\][^\]]*$/g, '')

      challenge_name = challenge_name.replace("$", "\\$");

      let res = new RegExp(`${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(""\\)}`, 'g').exec(baseJs.data);


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

    fullCode = fullCode.replace(/if\(typeof [A-Za-z0-9]+==="undefined"\)return [A-Za-z0-9]+;/g, "");
    // console.warn(fullCode);
    // console.warn(fullCode);
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
    const baseJsUrl =
      constants.URLS.YT_MOBILE +
      getBetweenStrings(html.data, '"jsUrl":"', '","');
    // const baseJsUrl =
    //   "https://m.youtube.com//s//player//5bdfe6d5//player-plasma-ias-tablet-ru_RU.vflset//base.js";
    // Get base.js content
    const baseJs = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);
    await this.makeDecipherFunction(baseJs);
    await this.getNFunction(baseJs);
    await this.getPOTFunction(baseJs);
    try {
      if (html instanceof Error && this.checkErrorCallback)
        this.ErrorCallback(html.message, true);

      try {
        const data = JSON.parse(
          "{" + getBetweenStrings(html.data, "ytcfg.set({", ");")
        );
        // console.warn(data);
        this.visitorData = data.VISITOR_DATA;
        if (data.INNERTUBE_CONTEXT) {
          this.key = data.INNERTUBE_API_KEY;
          this.context = data.INNERTUBE_CONTEXT;
          this.logged_in = data.LOGGED_IN;

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
    }
  }

  static async createAsync(ErrorCallback) {
    const created = new Innertube(ErrorCallback);
    await created.initAsync();
    return created;
  }

  //--- API Calls ---//

  async browseAsync(action_type, args = {}) {

    console.log(args);
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
    const responseNext = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/next?key=${this.key}`,
      data: {
        ...data,
        ...{
          context: {
            client: {
              clientName: constants.YT_API_VALUES.CLIENT_WEB_M,
              clientVersion: constants.YT_API_VALUES.VERSION_WEB,
              gl: this.context.client.gl,
              hl: this.context.client.hl,
              remoteHost: this.context.client.remoteHost,
            },
          },
        },
      },
      headers: constants.INNERTUBE_HEADER(this.context.client),
    }).catch((error) => error);

    this.pot = this.getPot(this.visitorData, 2);
    let response = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
      data: {
        ...data,
        ...{
          playerParams: this.playerParams,
          contentCheckOk: false,
          racyCheckOk: false,
          // mwebCapabilities: {
          //   mobileClientSupportsLivestream: true,
          // },

          serviceIntegrityDimensions: {
            poToken: this.pot
          },
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
      // headers: constants.INNERTUBE_HEADER(this.context.client),
      headers: constants.INNERTUBE_NEW_HEADER(this.context.client),
    }).catch((error) => error);

    if (response.data.playabilityStatus.status === "UNPLAYABLE") {
      data.context.client.clientName = "ANDROID_VR";
      data.context.client.clientVersion = "1.37";
      response = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
        data: {
          ...data,
          ...{
            playerParams: this.playerParams,
            contentCheckOk: false,
            racyCheckOk: false,
            // mwebCapabilities: {
            //   mobileClientSupportsLivestream: true,
            // },

            serviceIntegrityDimensions: {
              poToken: this.pot
            },
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
        // headers: constants.INNERTUBE_HEADER(this.context.client),
        headers: constants.INNERTUBE_NEW_HEADER(this.context.client),
      }).catch((error) => error);

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
    const details = responseInfo.videoDetails;
    const publishDate =
      responseInfo?.microformat?.playerMicroformatRenderer?.publishDate;
    // const columnUI =
    //   responseInfo[3].response?.contents.singleColumnWatchNextResults?.results
    //     ?.results;
    let resolutions = responseInfo.streamingData;
    let hls = responseInfo.streamingData?.hlsManifestUrl ? responseInfo.streamingData?.hlsManifestUrl : null;
    let dash = responseInfo.streamingData?.dashManifestUrl ? responseInfo.streamingData?.dashManifestUrl : null;
    // console.warn(hls)
    const columnUI =
      responseNext.contents.singleColumnWatchNextResults.results.results;
    const vidMetadata = columnUI.contents.find(
      (content) => content.slimVideoMetadataSectionRenderer
    ).slimVideoMetadataSectionRenderer;

    const recommendations = columnUI?.contents.find(
      (content) => content?.itemSectionRenderer?.targetId == "watch-next-feed"
    ).itemSectionRenderer;

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
    resolutions = resolutions.formats ? resolutions.formats.concat(resolutions.adaptiveFormats) : resolutions.adaptiveFormats;
    // console.warn(resolutions);
    resolutions.forEach((source) => {
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


        function generateCPN() {
          const CPN_ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
          let cpn = '';
          for (let i = 0; i < 16; i++) {
            cpn += CPN_ALPHABET[Math.floor(Math.random() * 64)];
          }
          return cpn;
        }

        const cpn = generateCPN();
        // console.log(cpn);

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
        source["url"] = source["url"] + "&cpn=" + generateCPN();
        // console.log(this.visitorData);
        // console.log(this.pot);
        source["url"] = source["url"] + "&pot=" + encodeURIComponent(this.pot);
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
      channelName: details.author,
      channelSubs: ownerData?.collapsedSubtitle?.runs[0]?.text,
      channelUrl: rendererUtils.getNavigationEndpoints(
        ownerData.navigationEndpoint
      ),
      channelImg: ownerData?.thumbnail?.thumbnails[0].url,
      captions: captions,
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
        // likes: parseInt(
        //   vidMetadata.contents
        //     .find((content) => content.slimVideoActionBarRenderer)
        //     .slimVideoActionBarRenderer.buttons.find(
        //       (button) => button.slimMetadataToggleButtonRenderer.isLike
        //     )
        //     .slimMetadataToggleButtonRenderer.button.toggleButtonRenderer.defaultText.accessibility.accessibilityData.label.replace(
        //       /\D/g,
        //       ""
        //     )
        // ), // Yes. I know.
        likes: "broken",
        // NOTE: likes are pulled from RYD for now untill extractor is fixed
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
          recommendations.contents[recommendations.contents.length - 1]
            .continuationItemRenderer?.continuationEndpoint.continuationCommand
            .token,
      },
      engagementPanels: responseNext.engagementPanels,
      commentData: columnUI.contents
        .find((content) => content.itemSectionRenderer?.contents)
        ?.itemSectionRenderer.contents.find(
          (content) => content.commentsEntryPointHeaderRenderer
        )?.commentsEntryPointHeaderRenderer,
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
