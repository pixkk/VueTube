import constants from "@/plugins/constants";
import {getBetweenStrings} from "@/plugins/utils";

export async function makeDecipherFunction(baseJs) {
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
        `\\s${secondPart8Name.replaceAll("$", "\\$")}=function\\([^)]*\\)\\{[\\s\\S]*?return[\\s\\S]*?\\}\\s*;`
      ).exec(baseJs.data);
      //       console.warn(`${secondPart8Name.replaceAll("$", "\\$")}=function\\([^)]*\\)\\{[\\s\\S]*?return[\\s\\S]*?\\}\\s*;`)
      //       console.warn(secondPart8)
      if (!secondPart8) {
        secondPart8 = new RegExp(
          `\\s${secondPart8Name.replaceAll("$", "\\$")}=function\\(.*\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)};`
        ).exec(baseJs.data);

      }
      //     console.warn(`\\s${secondPart8Name.replaceAll("$", "\\$")}=function\\(.*\\){if\\(.*\\([A-Za-z$]+\\[[0-9]+\\]\\).*[\\s\\S]*?return (?:[A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\)|[A-z0-9$]+)};`);
      //    console.warn(`\\s${secondPart8Name.replaceAll("$", "\\$")}=function\\((.*,[A-z0-9]+)\\){.*}`);
      functionArg = new RegExp(
        `\\s${secondPart8Name.replaceAll("$", "\\$")}=function\\((.*,[A-z0-9]+)\\){.*}`
      ).exec(secondPart8[0])[1];
      helpDecipher = new RegExp(
        `{.*};`
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
    console.warn(decodeFunction)
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
export async function getPOTFunction(baseJs) {
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

export async function getNFunction(baseJs) {
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
    res = new RegExp(`\\s${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return [A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\([A-z0-9$]+\\[[0-9]+\\]\\)};`, 'g').exec(baseJs.data);
    // console.error(res);
    if (res == null) {
      res = new RegExp(`\\s${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return [A-z0-9$]+\\[[A-z0-9$]+\\[[0-9]+\\]\\]\\(.*\\)};`, 'g').exec(baseJs.data);
      // console.error(res);
      this.nfunctionFirstArg = /\(this,([0-9]+),.*\)/gm.exec(res[0])[1];
      // 24.09.2025
      newMethod = true;
    }
    if (res == null) {
      res = new RegExp(`\\s${challenge_name}=function\\([A-z0-9$]\\){[\\s\\S]*?return.*?\\.join\\(.*\\)};`, 'g').exec(baseJs.data);
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
          let subFuncBodyRegex = new RegExp(`(?:\\s|,)${subfunc[0].replace("$", "\\$")}=function\\(.*\\){[\\s\\S]*?};\\s`).exec(baseJs.data);
          if (subFuncBodyRegex[0].charAt(0) === ",") {
            subFuncBodyRegex[0] = subFuncBodyRegex[0].replace(",", "");
          }
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
              //    console.error(`(?:\\s|,)${subfunc[0].replace("$", "\\$")}=function\\(.*\\){[\\s\\S]*?};\\s`);
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
      funcBodyProcessed = this.addMissingFunctions(funcBodyProcessed, funcName, baseJs);

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
      console.warn(fullCode)
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

export function addMissingFunctions(funcBodyProcessed, funcName, baseJs) {
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
        if (arrayWithProcessedFunctions.indexOf(thFName) === -1) {
          if (thFName !== funcName) {
            let bodyOfAndOneFunct = new RegExp(`(?:\\s|,)${thFName}=function\\(.*\\){[\\s\\S]*?};\\s`).exec(baseJs.data)
            //console.warn(`(?:\\s|,)${thFName}=function\\(.*\\){[\\s\\S]*?};\\s`)
            if (bodyOfAndOneFunct[0].charAt(0) === ",") {
              bodyOfAndOneFunct[0] = bodyOfAndOneFunct[0].replace(",", "");
            }
            bodyOfAndOneFunct = this.processFunctionWithKnownSecretArray(bodyOfAndOneFunct[0], baseJs.data);
            //  console.warn(bodyOfAndOneFunct)
            funcBodyProcessed += "\n" + bodyOfAndOneFunct;
            arrayWithProcessedFunctions.push(thFName);
          }
        }
      }
    });
  }
  return funcBodyProcessed;
}

function processFunctionWithKnownSecretArray(functionBody, rootDocumentBody) {
  let splitDataFromSecretArray = this.getSecretArray(this.secretArrayName, rootDocumentBody);
  return this.decodeFunctionWithSecretArray(functionBody, splitDataFromSecretArray, this.secretArrayName);
}

function getSecretArray(secretArrayName, rootPageBody) {
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

function decodeFunctionWithSecretArray(functionBody, secretArray, secretArrayName) {
  let regex = new RegExp(`\\b(${secretArrayName.replace("$", "\\$")})\\[([0-9]+)\\]`, 'gm');
  functionBody = functionBody.replace(regex, (match, varName, index) => {
    return  '"' + secretArray[`${parseInt(index)}`].replace(/(["'\\])/g, '\\$1') +  '"';
  });
  return functionBody;
}
function processFunctionWithSecretArray(helpDecipher, functionBody, rootDocumentBody) {
  let secretArray = /\[([A-Za-z0-9$]+)\[[A-Za-z0-9$]+\]/.exec(helpDecipher[0]);
  let splitDataFromSecretArray;
  if (secretArray) {
    splitDataFromSecretArray = this.getSecretArray(secretArray[1], rootDocumentBody);
    this.secretArrayName = secretArray[1];
    return this.decodeFunctionWithSecretArray(functionBody, splitDataFromSecretArray, secretArray[1]);
  }
}
