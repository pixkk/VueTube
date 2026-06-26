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
import {
  collectDependencies,
  collectPrototypeMethods, ensureVarDeclaration, findDecipherFunction,
  findGlobalArray,
  findMethodByName,
  getUndeclaredMethods
} from "@/plugins/ast/ast";

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
      url: constants.URLS.YT_EMBED,
      params: { hl: localStorage.getItem("language") || "en", },
    }).catch((error) => error);
    // Get url of base.js file
    let baseJsUrl =
      constants.URLS.YT_MOBILE +
      getBetweenStrings(html.data, '"jsUrl":"', '","');

    // if (baseJsUrl.indexOf("player-plasma") > 0) {
    // baseJsUrl = baseJsUrl.replace(".vflset", "").replace("player-plasma-ias-phone-", "player_ias.vflset/")
    // }

      baseJsUrl = baseJsUrl.replace(
        /player_embed_es6\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
        'player-plasma-ias-phone-$1.vflset/base.js'
      )
      baseJsUrl = baseJsUrl.replace(
        /player_es6\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
        'player-plasma-ias-phone-$1.vflset/base.js'
      )
      baseJsUrl = baseJsUrl.replace(
        /player_embed\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
        'player-plasma-ias-phone-$1.vflset/base.js'
      )
    // baseJsUrl = baseJsUrl.replace("player_es6", "player_ias");
    // baseJsUrl = baseJsUrl.replace("player_embed_es6", "player_ias");
    // baseJsUrl = "https://m.youtube.com/s/player/74edf1a3/player_ias.vflset/en_US/base.js";
    // Get base.js content
    // 377ca75b
    const baseJs = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);

    await this.initTimeStamp(baseJs);
    await this.makeDecipherFunctionWithAst(baseJs);

    console.warn("one");

    await this.getNFunctionAst(baseJs);
    console.warn("two");

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
      context: this.context,
      // context: {
      //   client: constants.INNERTUBE_TECHNICAL(this.context.client),
      // },
      videoId: id,
    };
    let response = "";

    const clientConfigs  = constants.clientConfigs;
    for (const config of clientConfigs) {
      if (config.CLIENTNAME !== "ANDROID_VR") continue
      data.context.client.clientName = config.CLIENTNAME;
      data.context.client.clientVersion = config.VERSION_WEB;
      console.warn("Trying with client config - ", data.context.client);
      if (data.context.client.clientName === "TVHTML5") continue;
      // this.context.client = data.context.client;
      if (config.clientScreen === "EMBED" && config.CLIENTNAME === "WEB_EMBEDDED_PLAYER") {
        data.context.thirdParty = {
          "embedUrl": constants.URLS.YT_EMBED + id,
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
        response?.data?.playabilityStatus?.status !== "LOGIN_REQUIRED" &&
        response?.data?.playabilityStatus?.status !== "ERROR") {
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
          "embedUrl": constants.URLS.YT_EMBED + id,
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
    let ustreamerConfig = responseInfo?.playerConfig?.mediaCommonConfig?.mediaUstreamerRequestConfig?.videoPlaybackUstreamerConfig || null;
    let serverAbrStreamingUrl = responseInfo?.streamingData?.serverAbrStreamingUrl || null;
    if (serverAbrStreamingUrl) {
      try {
        const sabrParams = new URLSearchParams(new URL(serverAbrStreamingUrl).search);
        const sabrN = sabrParams.get("n");
        if (sabrN) {
          const sabrNDecoded = this.nfunction(sabrN);
          serverAbrStreamingUrl = serverAbrStreamingUrl.replace(/&n=[^&]*/, "&n=" + sabrNDecoded);
        }
      } catch (e) {
        console.warn("[SABR] Failed to decode n param in serverAbrStreamingUrl", e);
      }
    }
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
            // nValue = "&n=" + window[this.nfunction](parseInt(this.nfunctionFirstArg), n)
          }
        }
        catch (e) {
          // nValue = "&n=" + this.nfunction(1, n)
          // nValue = "&n=" + window[this.nfunction](parseInt(this.nfunctionFirstArg), n.toString())
        }
      }
      searchParams.delete("n");

      try {
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
      }catch (e) {
        console.error(e)
        console.error(source)
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
        ustreamerConfig: ustreamerConfig,
        serverAbrStreamingUrl: serverAbrStreamingUrl,
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
    // let decipherFunctionRegex = /;[A-z0-9$]+\.set\("alr","yes"\);[A-z0-9$]+&&\([A-z0-9$]+=([A-z0-9$]+)\(([0-9]+).*decodeURIComponent\([A-z0-9]+\)\),/gm;
    let parsedBaseJs = acorn.parse(baseJs.data, {ecmaVersion: 2020})
    let decipherFunctionRegex = /;[A-z0-9$]+\.set\("alr","yes"\);.*?([A-z0-9$]+)\(([0-9]+),([0-9]+),([A-z0-9$]+\(.*?([A-z0-9$]+)\))\),/gm;
    let decipherFunction = decipherFunctionRegex.exec(baseJs.data);

    let decipherFunctionSecondArg = decipherFunction[3];
    let decipherFunctionLastArgOfThirdPart = decipherFunction[5];
    let decipherFunctionThirdPart = decipherFunction[4].replaceAll(decipherFunctionLastArgOfThirdPart, "sigValue");

    let decipherFunctionFirstArg = decipherFunction[2];
    let decipherFunctionName = decipherFunction[1];

    // console.warn("decipherFunction", decipherFunction);
    // console.warn("decipherFunctionSecondArg", decipherFunctionSecondArg);
    // console.warn("decipherFunctionThirdPart", decipherFunctionThirdPart);
    // console.warn("decipherFunctionFirstArg", decipherFunctionFirstArg);
    // console.warn("decipherFunctionName", decipherFunctionName);
    let globalArray = findGlobalArray(parsedBaseJs);

    let startFunc = findDecipherFunction(parsedBaseJs, decipherFunctionName)
    let additionalCode = collectDependencies(generate(startFunc), decipherFunctionName, parsedBaseJs)
    let {r, url, gph, gphProtoMethods} = this.generateResultString(globalArray, startFunc, additionalCode, baseJs, parsedBaseJs);

    let prePart = "let newObjectWithUrlObject = new " + gph + "('"+url + "', true); \n";
      // "\n newObjectWithUrlObject['set']('n', nValue);\n";
    let finalPart =
      r +
      gphProtoMethods +
      "\nvar decodeUrl=function(sigValue) { " + prePart + " return " + decipherFunctionName + "(" + decipherFunctionFirstArg + "," + decipherFunctionSecondArg + "," + decipherFunctionThirdPart + "); };" +
      "\nreturn decodeUrl;";
    // const finalPart =
    //   "var g = {};\n var " + globalArray.globalArrayName + "=" + JSON.stringify(globalArray.globalArrayData)+ "; var decodeUrl=function(nValue) { return " + decipherFunctionName + "(" + decipherFunctionFirstArg + "," + decipherFunctionSecondArg + ", nValue); };" + generate(startFunc) + "; \n" + additionalCode + "\nreturn decodeUrl;";
    console.warn(finalPart);
    let decodeUrlFunction = new Function(finalPart);
    this.decodeUrl = decodeUrlFunction();
  }


  async getNFunctionAst(baseJs) {
    let parsedBaseJs = acorn.parse(baseJs.data, {ecmaVersion: 2020});
    let func = /\]\]=([A-z0-9$]+)\(([0-9]+),([0-9]+),[A-z0-9$]+\)\);/.exec(baseJs.data);

    let funcArgs = func[2] + "," + func[3];
    let funcName = func[1];

    let globalArray = findGlobalArray(parsedBaseJs);
    let startFunc = findMethodByName(parsedBaseJs, funcName);
    let additionalCode = collectDependencies(generate(startFunc), funcName, parsedBaseJs)

    let {r, url, gph, gphProtoMethods} = this.generateResultString(globalArray, startFunc, additionalCode, baseJs, parsedBaseJs);

    let prePart = "let newObjectWithUrlObject = new " + gph + "('"+url + "', true); \n" + "\n" +
      "\n newObjectWithUrlObject['set']('n', nValue);\n";
    let finalPart =
      r +
      gphProtoMethods +
      "\nvar nFunction=function(nValue) { " + prePart + " return /&n=([A-z0-9-]+)/.exec(" + funcName + "(" + funcArgs + ", newObjectWithUrlObject))[1]; };" +
      "\nreturn nFunction;";
    // finalPart = finalPart.replaceAll(/throw .*;/g, "1===1");
    // console.warn(finalPart);
    let nFunction = new Function(finalPart);
    this.nfunction = nFunction();
  }

  generateResultString(globalArray, startFunc, additionalCode, baseJs, parsedBaseJs) {
    let r = "var g = {}; \n var " + globalArray.globalArrayName + "=" + JSON.stringify(globalArray.globalArrayData) + ";\n" + generate(startFunc) + "\n" + additionalCode + "\n";
    let url = "https://youtube.com/watch?v=abcd123-";

    let firstPoint = /=new (g.[A-z0-9$]+)\([A-z0-9$]+,.*?\);[A-z0-9$]+\.set\("alr","yes"\);/.exec(baseJs.data);
    let gph = firstPoint[1];

    // Explicitly include the constructor definition
    const ctorNode = findMethodByName(parsedBaseJs, gph);
    const ctorCode = ctorNode
      ? ensureVarDeclaration(ctorNode, generate(ctorNode).replace("};;", "};").replace("};\n;", "};\n"))
      : "";

    const protoMethodsCode = collectPrototypeMethods(
      parsedBaseJs,
      gph,
      globalArray.globalArrayData,
      globalArray.globalArrayName
    ).map(n => {
      const rawCode = generate(n).replace("};;", "};").replace("};\n;", "};\n");
      return ensureVarDeclaration(n, rawCode);
    }).join("\n");

    // Collect deps for constructor + prototype methods (e.g. g.** used in clone())
    // These may not be in **'s dep chain and would otherwise be missing at runtime
    const gphDeps = collectDependencies(ctorCode + "\n" + protoMethodsCode, gph, parsedBaseJs);

    let gphProtoMethods = gphDeps + "\n" + ctorCode + "\n" + protoMethodsCode;
    return {r, url, gph, gphProtoMethods};
  }

  // --- SABR (Server Adaptive Bitrate) ---

  async streamSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, isAudio = false, videoItag = null, audioItag = null, maxRequests = 1, signal, onChunk, onTotalDuration }) {
    const clientName = this.context?.client?.clientName || 'WEB';
    const clientVersion = this.context?.client?.clientVersion || '2.20240101.00.00';
    let url = serverAbrStreamingUrl;
    let rn = 1;
    let redirectCount = 0;
    let emptyCount = 0;
    let playbackCookieBytes = null;
    let playerTimeMs = 0;
    let totalDurationMs = 0;
    let initAppended = false;
    for (let i = 0; i < maxRequests; i++) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const body = sabrBuildRequest({ ustreamerConfigB64: videoPlaybackUstreamerConfig, clientName, clientVersion, itag, playerTimeMs, playbackCookieBytes, isAudio, videoItag, audioItag });
      const rawBytes = await sabrFetch(url, body, rn++, signal);
      const parts = [...sabrParseUMP(rawBytes)];
      const redirectPart = parts.find(p => p.partId === 43);
      if (redirectPart) {
        if (++redirectCount > 10) throw new Error('SABR_TOO_MANY_REDIRECTS');
        const newUrl = sabrParseRedirect(redirectPart.data);
        if (newUrl) { url = newUrl; rn = 1; }
        continue;
      } else {
        redirectCount = 0;
      }
      const errorPart = parts.find(p => p.partId === 44);
      if (errorPart) throw new Error('SABR_ERROR');
      // Extract total duration from FORMAT_INITIALIZATION_METADATA on first response
      if (totalDurationMs === 0) {
        const fimPart = parts.find(p => p.partId === 42);
        if (fimPart) {
          const f = sabrParseProtoVarintFields(fimPart.data);
          const units = f[9] || 0;
          const scale = f[10] || 1;
          if (units > 0 && scale > 0) {
            totalDurationMs = Math.round(units / (scale / 1000));
            console.log('[SABR] itag', itag, 'totalDurationMs:', totalDurationMs, 'units:', units, 'scale:', scale);
            onTotalDuration?.(totalDurationMs);
          }
        }
      }
      const policyPart = parts.find(p => p.partId === 35);
      if (policyPart) {
        const policy = sabrParseNextRequestPolicy(policyPart.data);
        if (policy.playbackCookie) playbackCookieBytes = policy.playbackCookie;
        if (policy.backoffTimeMs > 0) await new Promise(r => setTimeout(r, policy.backoffTimeMs));
      }
      const segments = sabrExtractMedia(parts, itag);
      const relevant = segments.filter(s => s.itag === itag);
      for (const seg of relevant) {
        if (seg.isInitSeg) {
          if (initAppended) continue;  // SABR resends init with every request — skip duplicates
          initAppended = true;
        }
        if (playerTimeMs === 0 && seg.durationMs > 0) console.log('[SABR] itag', itag, 'first seg durationMs:', seg.durationMs);
        playerTimeMs += seg.durationMs;
        await onChunk(seg.data, seg.durationMs);
      }
      // Count empty only when no segments at all (not when segments of other itags came)
      const hasOwnMedia = relevant.length > 0;
      const hasAnyMedia = segments.length > 0;
      if (!hasOwnMedia) {
        if (!hasAnyMedia && ++emptyCount >= 5) break;
      } else {
        emptyCount = 0;
      }
      // Stop when all content is downloaded
      if (totalDurationMs > 0 && playerTimeMs >= totalDurationMs) {
        console.log('[SABR] itag', itag, 'done: playerTimeMs', playerTimeMs, '>= totalDurationMs', totalDurationMs);
        break;
      }
    }
  }

  async downloadSabrFormat({ serverAbrStreamingUrl, videoPlaybackUstreamerConfig, itag, maxRequests = 20 }) {
    const clientName = this.context?.client?.clientName || 'WEB';
    const clientVersion = this.context?.client?.clientVersion || '2.20240101.00.00';

    let url = serverAbrStreamingUrl;
    let rn = 1;
    let emptyCount = 0;
    let redirectCount = 0;
    let playbackCookieBytes = null;
    let playerTimeMs = 0;
    let totalDurationMs = 0;
    const allSegments = [];

    for (let i = 0; i < maxRequests; i++) {
      const body = sabrBuildRequest({
        ustreamerConfigB64: videoPlaybackUstreamerConfig,
        clientName,
        clientVersion,
        itag,
        playerTimeMs,
        playbackCookieBytes,
      });

      const rawBytes = await sabrFetch(url, body, rn++);
      const parts = [...sabrParseUMP(rawBytes)];

      const redirectPart = parts.find(p => p.partId === 43);
      if (redirectPart) {
        if (++redirectCount > 10) throw new Error('SABR_TOO_MANY_REDIRECTS');
        const newUrl = sabrParseRedirect(redirectPart.data);
        if (newUrl) { url = newUrl; rn = 1; }
        continue;
      }
      redirectCount = 0;

      const errorPart = parts.find(p => p.partId === 44);
      if (errorPart) throw new Error('SABR_ERROR');

      // Extract total duration from FORMAT_INITIALIZATION_METADATA on first response
      if (totalDurationMs === 0) {
        const fimPart = parts.find(p => p.partId === 42);
        if (fimPart) {
          const f = sabrParseProtoVarintFields(fimPart.data);
          const units = f[9] || 0;
          const scale = f[10] || 1;
          if (units > 0 && scale > 0) totalDurationMs = Math.round(units / (scale / 1000));
        }
      }

      const policyPart = parts.find(p => p.partId === 35);
      if (policyPart) {
        const policy = sabrParseNextRequestPolicy(policyPart.data);
        if (policy.playbackCookie) playbackCookieBytes = policy.playbackCookie;
        if (policy.backoffTimeMs > 0) await new Promise(r => setTimeout(r, policy.backoffTimeMs));
      }

      const segments = sabrExtractMedia(parts, itag);
      for (const seg of segments) playerTimeMs += seg.durationMs;
      allSegments.push(...segments);

      const hasMedia = segments.length > 0;
      if (!hasMedia) {
        if (++emptyCount >= 3) break;
      } else {
        emptyCount = 0;
      }

      // Stop when all content is downloaded
      if (totalDurationMs > 0 && playerTimeMs >= totalDurationMs) break;
    }

    return sabrConcat(allSegments.map(s => s.data));
  }
}

// --- SABR module-level helpers ---

function sabrConcat(arrays) {
  const totalLength = arrays.reduce((acc, a) => acc + a.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function sabrEncodeVarint(value) {
  const bytes = [];
  while (value > 0x7f) {
    bytes.push((value & 0x7f) | 0x80);
    value = Math.floor(value / 128);
  }
  bytes.push(value & 0x7f);
  return new Uint8Array(bytes);
}

// Protobuf-style varint — used for parsing protobuf message fields inside UMP parts
function sabrReadVarint(bytes, offset) {
  let value = 0, mul = 1, b;
  do {
    b = bytes[offset++];
    if (b === undefined) break;
    value += (b & 0x7f) * mul;
    mul *= 128;
  } while (b & 0x80);
  return { value, nextOffset: offset };
}

// UMP-specific varint — used for reading partType and partSize in the outer UMP frame
function umpReadVarint(bytes, offset) {
  const b0 = bytes[offset];
  if (b0 === undefined) return { value: -1, nextOffset: offset };
  let value, nextOffset;
  if (b0 < 128) {
    value = b0;
    nextOffset = offset + 1;
  } else if (b0 < 192) {
    const b1 = bytes[offset + 1];
    if (b1 === undefined) return { value: -1, nextOffset: offset };
    value = (b0 & 0x3f) + 64 * b1;
    nextOffset = offset + 2;
  } else if (b0 < 224) {
    const b1 = bytes[offset + 1], b2 = bytes[offset + 2];
    if (b1 === undefined || b2 === undefined) return { value: -1, nextOffset: offset };
    value = (b0 & 0x1f) + 32 * (b1 + 256 * b2);
    nextOffset = offset + 3;
  } else if (b0 < 240) {
    const b1 = bytes[offset + 1], b2 = bytes[offset + 2], b3 = bytes[offset + 3];
    if (b1 === undefined || b2 === undefined || b3 === undefined) return { value: -1, nextOffset: offset };
    value = (b0 & 0x0f) + 16 * (b1 + 256 * (b2 + 256 * b3));
    nextOffset = offset + 4;
  } else {
    const b1 = bytes[offset + 1], b2 = bytes[offset + 2], b3 = bytes[offset + 3], b4 = bytes[offset + 4];
    if (b1 === undefined || b2 === undefined || b3 === undefined || b4 === undefined) return { value: -1, nextOffset: offset };
    value = b1 + 256 * (b2 + 256 * (b3 + 256 * b4));
    nextOffset = offset + 5;
  }
  return { value, nextOffset };
}

function sabrPbLenDelim(fieldNumber, data) {
  return sabrConcat([sabrEncodeVarint((fieldNumber << 3) | 2), sabrEncodeVarint(data.length), data]);
}

function sabrPbVarint(fieldNumber, value) {
  return sabrConcat([sabrEncodeVarint((fieldNumber << 3) | 0), sabrEncodeVarint(value)]);
}

function sabrPbString(fieldNumber, str) {
  return sabrPbLenDelim(fieldNumber, new TextEncoder().encode(str));
}

function sabrBase64Decode(str) {
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}

// Maps InnerTube client name strings to the int32 values used in SABR ClientInfo
const SABR_CLIENT_NAME_IDS = {
  WEB: 1, MWEB: 2, ANDROID: 3, IOS: 5, TVHTML5: 7,
  ANDROID_MUSIC: 21, WEB_MUSIC_EMBEDDED_PLAYER: 39,
  WEB_EMBEDDED_PLAYER: 56, WEB_CREATOR: 62, ANDROID_VR: 28,
};

function sabrBuildRequest({ ustreamerConfigB64, clientName, clientVersion, itag, playerTimeMs = 0, playbackCookieBytes = null, isAudio = false, videoItag = null, audioItag = null }) {
  const ustreamerBytes = sabrBase64Decode(ustreamerConfigB64);

  const isAudioFormat = typeof isAudio === 'boolean' ? isAudio : [139, 140, 141, 171, 172, 249, 250, 251, 256, 258, 327, 338].includes(itag);

  // field 1: client_abr_state
  //   field 28: player_time_ms (int64)
  //   field 40: enabled_track_types_bitfield (int32) - 1 for AUDIO_ONLY, 2 for VIDEO_ONLY
  const clientAbrStateInner = sabrConcat([
    sabrPbVarint(28, playerTimeMs),
    sabrPbVarint(40, isAudioFormat ? 1 : 2)
  ]);
  const clientAbrState = sabrPbLenDelim(1, clientAbrStateInner);

  // field 2: selected_format_ids { field 1: itag }
  const formatIds = sabrPbLenDelim(2, sabrPbVarint(1, itag));

  // field 4: player_time_ms (int64)
  const playerTime = sabrPbVarint(4, playerTimeMs);

  // field 5: video_playback_ustreamer_config (bytes)
  const ustreamerField = sabrPbLenDelim(5, ustreamerBytes);

  // field 16 (tag 130): preferred_audio_format_ids { field 1: itag }
  // field 17 (tag 138): preferred_video_format_ids { field 1: itag }
  const preferredFormats = [];
  const finalAudioItag = audioItag || (isAudioFormat ? itag : null);
  if (finalAudioItag) {
    preferredFormats.push(sabrPbLenDelim(16, sabrPbVarint(1, finalAudioItag)));
  }
  const finalVideoItag = videoItag || (!isAudioFormat ? itag : null);
  if (finalVideoItag) {
    preferredFormats.push(sabrPbLenDelim(17, sabrPbVarint(1, finalVideoItag)));
  }
  const preferredFormat = sabrConcat(preferredFormats);

  // field 19: streamer_context {
  //   field 1: client_info { field 16: client_name, field 17: client_version }
  //   field 3: playback_cookie (bytes, from previous NextRequestPolicy)
  // }
  const clientNameId = SABR_CLIENT_NAME_IDS[clientName] || 1;
  const clientInfo = sabrConcat([
    sabrPbVarint(16, clientNameId),
    sabrPbString(17, clientVersion),
  ]);
  const streamerContextInner = playbackCookieBytes
    ? sabrConcat([sabrPbLenDelim(1, clientInfo), sabrPbLenDelim(3, playbackCookieBytes)])
    : sabrPbLenDelim(1, clientInfo);
  const streamerContext = sabrPbLenDelim(19, streamerContextInner);

  return sabrConcat([clientAbrState, formatIds, playerTime, ustreamerField, preferredFormat, streamerContext]);
}

async function sabrFetch(sabrUrl, body, requestNumber = 1, signal) {
  const url = new URL(sabrUrl);
  url.searchParams.set('rn', String(requestNumber));
  const response = await fetch(url.toString(), {
    method: 'POST',
    body: body,
    signal,
    headers: {
      'content-type': 'application/x-protobuf',
      'accept': 'application/vnd.yt-ump',
      'accept-encoding': 'identity',
    },
  });
  if (!response.ok) throw new Error(`SABR HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

function* sabrParseUMP(rawBytes) {
  let offset = 0;
  while (offset < rawBytes.length) {
    const { value: partId, nextOffset: o1 } = umpReadVarint(rawBytes, offset);
    if (partId < 0) break;
    const { value: size, nextOffset: o2 } = umpReadVarint(rawBytes, o1);
    if (size < 0) break;
    const data = rawBytes.slice(o2, o2 + size);
    offset = o2 + size;
    yield { partId, data };
  }
}

function sabrParseProtoVarintFields(data) {
  const fields = {};
  let offset = 0;
  while (offset < data.length) {
    const { value: tag, nextOffset: o1 } = sabrReadVarint(data, offset);
    if (o1 <= offset) break;
    const fieldNumber = tag >> 3, wireType = tag & 7;
    offset = o1;
    if (wireType === 0) {
      const { value, nextOffset } = sabrReadVarint(data, offset);
      if (nextOffset <= offset) break;
      offset = nextOffset;
      fields[fieldNumber] = value;
    } else if (wireType === 2) {
      const { value: len, nextOffset } = sabrReadVarint(data, offset);
      if (nextOffset <= offset) break;
      fields[fieldNumber] = data.slice(nextOffset, nextOffset + len);
      offset = nextOffset + len;
    } else if (wireType === 1) { offset += 8; }
    else if (wireType === 5) { offset += 4; }
    else break;
  }
  return fields;
}

function sabrParseMediaHeader(data) {
  const f = sabrParseProtoVarintFields(data);
  // field 1 = headerId, field 3 = itag, field 9 = sequenceNumber, field 12 = durationMs
  // field 8 (tag 64) = isInitSeg bool
  // field 15 = timeRange (bytes)
  let durationMs = f[12] || 0;
  const isInitSeg = !!f[8];
  
  if (!durationMs && f[15]) {
    try {
      const tr = sabrParseProtoVarintFields(f[15]);
      const durationTicks = tr[2] || 0;
      const timescale = tr[3] || 1000;
      if (durationTicks > 0 && timescale > 0) {
        durationMs = Math.round(durationTicks / (timescale / 1000));
      }
    } catch (e) {
      console.error('[SABR] failed to parse timeRange:', e);
    }
  }

  // Fallback for media segments to prevent infinite looping if duration is still missing
  if (!isInitSeg && !durationMs) {
    durationMs = 5000;
  }

  return { headerId: f[1] || 0, itag: f[3] || 0, sequenceNumber: f[9] || 0, durationMs, isInitSeg };
}

function sabrExtractMedia(parts, itagHint) {
  const headers = new Map();  // headerId -> MediaHeader
  const buffers = new Map();  // headerId -> Uint8Array[]
  const segments = [];

  for (const { partId, data } of parts) {
    if (partId === 20) {
      // MEDIA_HEADER: start accumulating a new segment
      const h = sabrParseMediaHeader(data);
      headers.set(h.headerId, h);
      buffers.set(h.headerId, []);
    } else if (partId === 21) {
      // MEDIA: accumulate bytes (one segment may arrive in many 32768-byte parts)
      const headerId = data[0];
      const buf = buffers.get(headerId);
      if (buf) buf.push(data.slice(1));
    } else if (partId === 22) {
      // MEDIA_END: finalize the segment — emit one complete entry
      const headerId = data.length > 0 ? data[0] : 0;
      const header = headers.get(headerId);
      const buf = buffers.get(headerId);
      if (header && buf) {
        segments.push({ itag: header.itag, durationMs: header.durationMs, isInitSeg: header.isInitSeg, data: sabrConcat(buf) });
      }
      headers.delete(headerId);
      buffers.delete(headerId);
    }
  }

  return segments;
}

function sabrParseRedirect(data) {
  const f = sabrParseProtoVarintFields(data);
  const urlBytes = f[1];
  return urlBytes instanceof Uint8Array ? new TextDecoder().decode(urlBytes) : null;
}

function sabrParseNextRequestPolicy(data) {
  const f = sabrParseProtoVarintFields(data);
  // field 4 = backoffTimeMs (varint), field 7 = playbackCookie (bytes)
  return { backoffTimeMs: f[4] || 0, playbackCookie: f[7] instanceof Uint8Array ? f[7] : null };
}

export default Innertube;
