//⚠️🚧 WARNING: THIS FILE IS IN MAINTENANCE MODE 🚧⚠️
// NEW FEATURES FROM THIS FILE WILL BE TRASFERRED TO INNERTUBE.JS - A SEPARATE LIBRARY
// New library: https://github.com/pixkk/Vuetube-Extractor (currently is not active)

// Code specific to working with the innertube API
// https://www.youtube.com/youtubei/v1

import {Http} from "@capacitor-community/http";
import {delay, getBetweenStrings, getCpn} from "./utils";
import rendererUtils from "./renderers";
import constants from "./constants";
import * as acorn from "acorn";
import {generate} from "astring";
import {findDecipherFunction, findGlobalArray, findMethodByName, getUndeclaredMethods} from "@/plugins/ast/ast";

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

  async initTimeStamp(baseJs) {
    let signatureIntValue = /.sts="[0-9]+";/.exec(baseJs.data);
    // Get signature timestamp
    this.signatureTimestamp = parseInt(
      signatureIntValue[0].replace(/\D/g, "")
    );
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
    //   "https://m.youtube.com/s/player/3062cec8/player_ias.vflset/uk_UA/base.js";
    // baseJsUrl =
    //   "https://m.youtube.com/s/player/20830619/player_ias.vflset/uk_UA/base.js";
    //  baseJsUrl =
       // "https://m.youtube.com/s/player/c80790c5/player_ias.vflset/uk_UA/base.js";
       // "https://m.youtube.com/s/player/6e4dbefe/player_ias.vflset/uk_UA/base.js";
    // if (baseJsUrl.indexOf("player-plasma") > 0) {
      // baseJsUrl = baseJsUrl.replace(".vflset", "").replace("player-plasma-ias-phone-", "player_ias.vflset/")
    // }
    baseJsUrl = baseJsUrl.replace("player_es6", "player_ias");

    // Get base.js content
    // 377ca75b
    const baseJs = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);
    // await this.makeDecipherFunction(baseJs);
    await this.initTimeStamp(baseJs);
    await this.makeDecipherFunctionWithAst(baseJs);

    console.warn("one");
    // await this.getNFunction(baseJs);
    await this.getNFunctionAst(baseJs);
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
      if (data.context.client.clientName === "TVHTML5") continue;
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
            // TODO: fix embedded config
            // serializedThirdPartyEmbedConfig: {
            //   enc: "value_for_embedded_video",
            // },
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
        response?.data?.playabilityStatus?.status !== "LOGIN_REQUIRED" &&
        response?.data?.playabilityStatus?.status !== "ERROR") {
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

              // if (decipheredValue === undefined || decipheredValue === true || decipheredValue === false) {
              //   decipheredValue = this.decodeUrl(parseInt(this.decodeUrlFirstArg), cipher);
              // }
            }catch (e) {
               // decipheredValue = this.decodeUrl(parseInt(this.decodeUrlFirstArg), cipher);
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
          recommendations?.contents[recommendations.contents.length - 1] ? recommendations?.contents[recommendations.contents.length - 1].continuationItemRenderer?.continuationEndpoint.continuationCommand.token : null,
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

  async makeDecipherFunctionWithAst(baseJs) {
    let decipherFunctionRegex = /;[A-z0-9$]+\.set\("alr","yes"\);[A-z0-9$]+&&\([A-z0-9$]+=([A-z0-9$]+)\(([0-9]+).*decodeURIComponent\([A-z0-9]+\)\),/gm;
    let decipherFunction = decipherFunctionRegex.exec(baseJs.data);

    let decipherFunctionFirstArg = decipherFunction[2];
    let decipherFunctionName = decipherFunction[1];

    let parsedBaseJs = acorn.parse(baseJs.data, {ecmaVersion: 2020})

    let globalArray = findGlobalArray(parsedBaseJs);

    let funcCode = findDecipherFunction(parsedBaseJs, decipherFunctionName)
    let unDeclared = getUndeclaredMethods(funcCode, decipherFunctionName);
    let additionalCode = "\n";
    unDeclared.forEach(name => {
      let method = findMethodByName(parsedBaseJs, name);
      if (method === null) return
      additionalCode += generate(method) + "\n";
    })
    const finalPart =
      "\n var " + globalArray.globalArrayName + "=" + JSON.stringify(globalArray.globalArrayData)+ "; var decodeUrl=function(nValue) { return " + decipherFunctionName + "(" + decipherFunctionFirstArg + ", nValue); };" + generate(funcCode) + additionalCode + "\nreturn decodeUrl;";
    let decodeUrlFunction = new Function(finalPart);
    this.decodeUrl = decodeUrlFunction();
  }

  async getNFunctionAst(baseJs) {
    let parsedBaseJs = acorn.parse(baseJs.data, {ecmaVersion: 2020})
    let preChallengeName = /(?:\nvar [A-z0-9$]+=\[([A-z0-9$]+)\];|};([A-z0-9]+)=\[([A-z0-9]+)\];)/i.exec(baseJs.data);
    let additionalVarName = "";
    if (!preChallengeName[1]) {
      preChallengeName = preChallengeName[3]
      additionalVarName = preChallengeName[2]
    }
    else {
      preChallengeName = preChallengeName[1];
    }
    let preChallengeMethod = findMethodByName(parsedBaseJs, preChallengeName);
    let globalArray = findGlobalArray(parsedBaseJs);

    let preChallengeMethodCode = preChallengeMethod
    let challengeName = preChallengeMethodCode.expression.right.body.body[0].argument.callee.object.name;

    let firstArg = "";
    for (let i = 0; i < preChallengeMethodCode.expression.right.body.body[0].argument.arguments.length; i++) {
      if (preChallengeMethodCode.expression.right.body.body[0].argument.arguments[i].type === "Literal") {
        firstArg = preChallengeMethodCode.expression.right.body.body[0].argument.arguments[i].raw;
        break;
      }
    }
    let nFunctionCode = findMethodByName(parsedBaseJs, challengeName);
    let baseCode = generate(nFunctionCode);
    function collectDependencies(entryCode, challengeName) {
      let collectedCode = "";
      const processed = new Set();
      const queue = new Set(
        getUndeclaredMethods(acorn.parse(entryCode, { ecmaVersion: 2020 }), challengeName)
      );

      while (queue.size > 0) {
        const [name] = queue;
        queue.delete(name);

        if (name === preChallengeName || name === challengeName) continue;
        if (processed.has(name)) continue;

        const node = findMethodByName(parsedBaseJs, name);
        if (!node) continue;

        const code = generate(node).replace("};;", "};").replace("};\n;", "};\n");
        collectedCode += code + "\n";
        processed.add(name);

        const parsed = acorn.parse(entryCode + collectedCode, { ecmaVersion: 2020 });
        const newUndeclared = getUndeclaredMethods(parsed, challengeName);

        newUndeclared.forEach(n => {
          if (!processed.has(n)) queue.add(n);
        });
      }
      return collectedCode;
    }

    let additionalCode = collectDependencies(baseCode, challengeName)
      .replaceAll(preChallengeName, "nFunction");

    const finalPart =
      "\n var " + globalArray.globalArrayName + "=" + JSON.stringify(globalArray.globalArrayData) +
      ";\n var nFunction=function(nValue) { return " + challengeName + "(" + firstArg + ", nValue); };" +
      baseCode +
      additionalCode +
      "\nreturn nFunction;";

    let nFunction = new Function(finalPart);
    this.nfunction = nFunction();
  }
}
// function getUndeclaredMethodsJS(parsedBaseJs, undeclares, challengeName, preChallengeName) {
//   let additionalCode = "\n";
//   undeclares.forEach(name => {
//     let processed = findMethodByName(parsedBaseJs, name)
//     if (name === preChallengeName || name === challengeName || processed === null) return;
//     additionalCode += generate(processed) + ";\n";
//     additionalCode = additionalCode.replace("};;", "};").replace("};\n;", "};\n")
//   })
//   return additionalCode
// }
export default Innertube;
