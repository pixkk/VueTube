//⚠️🚧 WARNING: THIS FILE IS IN MAINTENANCE MODE 🚧⚠️
// NEW FEATURES FROM THIS FILE WILL BE TRANSFERRED TO INNERTUBE.JS - A SEPARATE LIBRARY
// New library: https://github.com/pixkk/Vuetube-Extractor (currently is not active)

// Code specific to working with the innertube API
// https://www.youtube.com/youtubei/v1

import {Http} from "@capacitor-community/http";
import {delay, getBetweenStrings, getCpn, getThumbnailUtil} from "./utils";
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
    this.recommendationsFix = !(JSON.parse(localStorage.getItem("recommendationsFix")) === false);
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
  saveBaseJSVersion(baseJsUrl) {
    const regex = /\/player\/([a-f0-9]{8})\/player/;
    const match = baseJsUrl.match(regex);
    if (match) {
      localStorage.setItem("baseJsVersion", match[1]);
    }
  }
  parseBaseJSUrl(html) {
    let baseJSUrl = constants.URLS.YT_MOBILE + getBetweenStrings(html, '"jsUrl":"', '","');
    baseJSUrl = baseJSUrl.replace(
      /player_embed_es6\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
      'player-plasma-ias-phone-$1.vflset/base.js'
    )
    baseJSUrl = baseJSUrl.replace(
      /player_es6\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
      'player-plasma-ias-phone-$1.vflset/base.js'
    )
    baseJSUrl = baseJSUrl.replace(
      /player_embed\.vflset\/([a-zA-Z_-]+)\/base\.js$/,
      'player-plasma-ias-phone-$1.vflset/base.js'
    )
    return baseJSUrl;
  }
  getYTConfig(html) {
    return JSON.parse(
      "{" + getBetweenStrings(html, "ytcfg.set({", ");")
    );
  }
  async initAsync() {
    const html = await Http.get({
      url: constants.URLS.YT_EMBED,
      params: { hl: localStorage.getItem("language") || "en", },
    }).catch((error) => error);
    // Get url of base.js file
    let baseJsUrl = this.parseBaseJSUrl(html.data);
    this.saveBaseJSVersion(baseJsUrl);
    // baseJsUrl = "https://m.youtube.com/s/player/74edf1a3/player_ias.vflset/en_US/base.js";
    // Get base.js content
    const baseJsContent = await Http.get({
      url: baseJsUrl,
    }).catch((error) => error);

    await this.initTimeStamp(baseJsContent);
    await this.makeDecipherFunctionWithAst(baseJsContent);

    console.warn("Decipher function created");
    await this.getNFunctionAst(baseJsContent);
    console.warn("N-function created");

    try {
      if (html instanceof Error && this.checkErrorCallback)
        this.ErrorCallback(html.message, true);

      try {
        const ytClient = this.getYTConfig(html.data);
        this.visitorData = ytClient.VISITOR_DATA || ytClient.EOM_VISITOR_DATA;
        if (ytClient.INNERTUBE_CONTEXT) {
          this.key = ytClient.INNERTUBE_API_KEY;
          this.context = ytClient.INNERTUBE_CONTEXT;
          this.logged_in = ytClient.LOGGED_IN;

          if (this.recommendationsFix) {
            console.log("Applying patch for Emulators (recommendation page fix)");
            this.context.client.userAgent = constants.YT_API_VALUES.USER_AGENT;
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
        if (this.retry_count < 3) {
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
    const isAuthed = !!localStorage.getItem("vt_active_access_token");
    let data = {
      context: {
        client: isAuthed
          ? constants.INNERTUBE_CLIENT_TV(this.context.client)
          : constants.INNERTUBE_CLIENT(this.context.client),
      },
    };
    switch (action_type) {
      case "recommendations":
        args.browseId = "FEwhat_to_watch";
        break;
      //   Trending was removed from the YT:
      //   https://support.google.com/youtube/thread/356702168/changes-to-discovering-trending-content-on-youtube
      // case "trending":
      //   args.browseId = "FEtrending";
      //   break;
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

    // console.log(data);

    const response = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/browse?key=${this.key}`,
      data: data,
      headers: constants.AUTHED_JSON_HEADER(),
    }).catch((error) => error);
    console.log(response);

    if (response instanceof Error || response.data.error)
      return {
        success: false,
        status_code: response.status,
        message: response.data.message,
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
    const isMweb = contextAdditional.client?.clientName === "MWEB";
    if (isMweb) {
      data.context.client = {
        ...constants.INNERTUBE_VIDEO(this.context.client),
        clientName: contextAdditional.client.clientName,
        clientVersion: contextAdditional.client.clientVersion,
      };
    } else {
      const isAuthed = !!localStorage.getItem("vt_active_access_token");
      data.context.client = isAuthed
        ? { ...constants.INNERTUBE_CLIENT_TV(this.context.client) }
        : { ...constants.INNERTUBE_CLIENT(this.context.client) };
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
      headers: isMweb
        ? constants.INNERTUBE_HEADER(this.context.client, true)
        : constants.AUTHED_JSON_HEADER(),
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
      if (config.CLIENTNAME !== "ANDROID_VR") continue;
      if (data.context.client.clientName === "TVHTML5") continue;
      data.context.client.clientName = config.CLIENTNAME;
      data.context.client.clientVersion = config.VERSION_WEB;
      console.warn("Trying with client config - ", data.context.client);
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

  async getVidAsync(id, reloadPlaybackContext = null, tvParams = null) {
    const isAuthed = !!localStorage.getItem("vt_active_access_token");
    let responseNext;
    let response = "";

    if (isAuthed) {
      const tvClient = constants.INNERTUBE_CLIENT_TV(this.context.client);
      const tvContext = {
        client: tvClient,
        user: { enableSafetyMode: false },
        request: { internalExperimentFlags: [], consistencyTokenJars: [] },
      };

      responseNext = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/next?key=${this.key}`,
        data: {
          context: tvContext,
          videoId: id,
          playlistId: `RD${id}`,
          playlistIndex: 0,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: { lactMilliseconds: "-1" },
          autonavState: "STATE_NONE",
          ...(tvParams ? { params: tvParams } : {}),
        },
        headers: constants.AUTHED_JSON_HEADER(),
      }).catch((error) => error);

      const [responsePlayer, responseNextMobile] = await Promise.all([
        Http.post({
          url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
          data: {
            context: tvContext,
            videoId: id,
            racyCheckOk: true,
            contentCheckOk: true,
            playbackContext: {
              ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
              contentPlaybackContext: {
                signatureTimestamp: this.signatureTimestamp,
                html5Preference: "HTML5_PREF_WANTS",
                lactMilliseconds: "-1",
                autonavState: "STATE_NONE",
              },
            },
          },
          headers: constants.AUTHED_JSON_HEADER(),
        }).catch((error) => error),
        Http.post({
          url: `${constants.URLS.YT_BASE_API}/next?key=${this.key}`,
          data: {
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
          },
          headers: constants.INNERTUBE_HEADER(this.context.client, true),
        }).catch((error) => error),
      ]);
      response = responsePlayer;
      responseNext.data._mobileNext = responseNextMobile.error ? null : responseNextMobile.data;
    } else {
      let data = {
        context: {
          client: constants.INNERTUBE_VIDEO(this.context.client),
        },
        videoId: id,
      };
      if (reloadPlaybackContext) {
        data.playbackContext = { reloadPlaybackContext };
      }

      responseNext = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/next?key=${this.key}`,
        data: {
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
        },
        headers: constants.INNERTUBE_HEADER(this.context.client),
      }).catch((error) => error);

      const clientConfigs = constants.clientConfigs;
      for (const config of clientConfigs) {
        if (this.recommendationsFix) {
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
          data.context.thirdParty = { "embedUrl": constants.URLS.YT_EMBED + id };
        }
        response = await Http.post({
          url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
          data: {
            ...data,
            playerParams: this.playerParams,
            contentCheckOk: false,
            racyCheckOk: false,
            playbackContext: {
              ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
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
                watchAmbientModeContext: { watchAmbientModeEnabled: true },
              },
            },
          },
          headers: constants.INNERTUBE_NEW_HEADER(data.context.client, false),
        }).catch((error) => error);

        if (response?.data?.playabilityStatus?.status !== "UNPLAYABLE" &&
          response?.data?.playabilityStatus?.status !== "LOGIN_REQUIRED" &&
          response?.data?.playabilityStatus?.status !== "ERROR") {
          break;
        }
      }
    }

    // For live streams, re-request as ANDROID_VR without auth to get HLS manifest. Temp solution.
    // TODO: use SABR from TV client
    if (response?.data?.videoDetails?.isLive) {
      const androidVrConfig = constants.clientConfigs.find(c => c.CLIENTNAME === "ANDROID_VR");
      const androidVrClient = {
        ...constants.INNERTUBE_VIDEO(this.context.client),
        clientName: androidVrConfig.CLIENTNAME,
        clientVersion: androidVrConfig.VERSION_WEB,
        clientScreen: androidVrConfig.clientScreen,
        CLIENT_WEB_M: androidVrConfig.CLIENT_WEB_M,
        VERSION: androidVrConfig.VERSION_WEB,
      };
      const webEmbedContext = {
        client: androidVrClient,
        thirdParty: { embedUrl: `https://www.youtube.com/embed/${id}` },
      };
      const liveResponse = await Http.post({
        url: `${constants.URLS.YT_BASE_API}/player?key=${this.key}`,
        data: {
          context: webEmbedContext,
          videoId: id,
          racyCheckOk: true,
          contentCheckOk: true,
          playbackContext: {
            ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
            contentPlaybackContext: {
              signatureTimestamp: this.signatureTimestamp,
              html5Preference: "HTML5_PREF_WANTS",
              lactMilliseconds: "-1",
              autonavState: "STATE_NONE",
            },
          },
        },
        headers: constants.INNERTUBE_NEW_HEADER(webEmbedContext.client, false),
      }).catch((error) => error);
      if (liveResponse?.data?.playabilityStatus?.status === "OK") {
        response = liveResponse;
      }
    }

    if (response.error) {
      return {
        success: false,
        status_code: response.status,
        message: response.message,
      };
    } else if (responseNext.error) {
      return {
        success: false,
        status_code: responseNext.status,
        message: responseNext.message,
      };
    }

    return {
      success: true,
      status_code: response.status,
      data: { output: response.data, outputNext: responseNext.data },
    };
  }

  async searchAsync(query) {
    const isAuthed = !!localStorage.getItem("vt_active_access_token");
    const client = isAuthed
      ? constants.INNERTUBE_CLIENT_TV(this.context.client)
      : constants.INNERTUBE_CLIENT(this.context.client);
    let data = { context: { ...this.context, client }, query: query };

    const response = await Http.post({
      url: `${constants.URLS.YT_BASE_API}/search?key=${this.key}`,
      data: data,
      headers: constants.AUTHED_JSON_HEADER(),
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

  async getEndPoint(url) {
    let data;
    let response;
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
        headers: constants.AUTHED_JSON_HEADER(),
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

  // WARNING: This is tracking the user's activity, but is required for recommendations to properly work
  async apiStats(params, url) {
    // console.warn(params);
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
    return getThumbnailUtil(id, resolution);
  }

  // Simple Wrappers
  async getRecommendationsAsync(recommendationsType = "recommendations") {
    const rec = await this.browseAsync(recommendationsType);
    return rec;
  }
  async getChannelAsync(url, tab="main") {
    const channelEndpoint = await this.getEndPoint(url);
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

  async VidInfoAsync(id, tvParams = null) {
    // TODO: OPTIMIZE IT !!!
    let response = await this.getVidAsync(id, null, tvParams);

    if (
      response.success == false ||
      response.data.output?.playabilityStatus?.status == ("ERROR" || "LOGIN_REQUIRED" || "UNPLAYABLE" || undefined)
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
    const mobileNext = responseNext._mobileNext || responseNext;
    const columnUI =
      responseNext.contents.singleColumnWatchNextResults.results.results;

    // TV response uses videoMetadataRenderer directly inside itemSectionRenderer
    const tvVidMeta = columnUI.contents[0]?.itemSectionRenderer?.contents?.find(
      (c) => c.videoMetadataRenderer
    )?.videoMetadataRenderer;
    const isTVResponse = !!tvVidMeta;

    const vidMetadata = isTVResponse
      ? (() => {
          const descHeader = mobileNext.engagementPanels
            ?.find((p) => p.engagementPanelSectionListRenderer?.panelIdentifier === "video-description-ep-identifier")
            ?.engagementPanelSectionListRenderer?.content?.structuredDescriptionContentRenderer?.items
            ?.find((i) => i.videoDescriptionHeaderRenderer)
            ?.videoDescriptionHeaderRenderer;
          const viewsText = descHeader?.views?.simpleText
            || tvVidMeta.viewCount?.videoViewCountRenderer?.viewCount?.simpleText
            || "";
          const dateText = tvVidMeta.dateText?.accessibility.accessibilityData.label
            || tvVidMeta.dateText?.simpleText
            || "";
          const accessibilityLabel = tvVidMeta.dateText?.accessibility.accessibilityData.label || "";
          return {
            contents: [
              {
                slimVideoInformationRenderer: {
                  title: { runs: [{ text: tvVidMeta.title?.runs?.[0]?.text || "" }] },
                  collapsedSubtitle: {
                    runs: [
                      { text: viewsText },
                      ...(dateText ? [{ text: " • " }, { text: dateText }] : []),
                    ],
                  },
                  expandedSubtitle: { runs: [{ text: accessibilityLabel }] },
                },
              },
            ],
          };
        })()
      : columnUI.contents.find(
          (content) => content.slimVideoMetadataSectionRenderer
        )?.slimVideoMetadataSectionRenderer;

    const tvPivotSectionList = responseNext.contents?.singleColumnWatchNextResults?.pivot?.sectionListRenderer;
    const recommendations = isTVResponse
      ? (() => {
          const shelves = tvPivotSectionList?.contents || [];
          const items = shelves
            .filter((s) => s.shelfRenderer?.content?.horizontalListRenderer)
            .flatMap((s) =>
              (s.shelfRenderer.content.horizontalListRenderer.items || [])
                .filter((i) => i.tileRenderer?.contentType === "TILE_CONTENT_TYPE_VIDEO")
                .map((i) => ({ tileRenderer: i.tileRenderer }))
            );
          return { contents: items };
        })()
      : {
          contents: columnUI?.contents
            ?.filter((c) => c.itemSectionRenderer?.contents)
            ?.flatMap((c) =>
              c.itemSectionRenderer.contents.filter(
                (item) =>
                  !item.videoMetadataCarouselViewModel &&
                  !item.compactRadioRenderer
              )
            ),
        };

    // console.warn(recommendations);

    let metadata = {};
    if (isTVResponse) {
      if (!details.title) {
        details.title = tvVidMeta.title?.runs?.[0]?.text || "";
      }
      // likes from transportControls
      try {
        const likeBtn = responseNext.transportControls?.transportControlsRenderer?.buttons
          ?.find((b) => b.type === "TRANSPORT_CONTROLS_BUTTON_TYPE_LIKE_BUTTON")
          ?.button?.likeButtonRenderer;
        if (likeBtn) {
          metadata.likes = likeBtn.likeCount.toLocaleString();
        }
      } catch (e) {}
    } else {
      if (!details.title) {
        vidMetadata?.contents?.forEach((content) => {
          const text = content?.slimVideoInformationRenderer?.title.runs[0].text;
          if (text !== undefined) { details.title = text; }
        });
      }
      vidMetadata?.contents?.forEach((content) => {
        let likesCount = content?.slimVideoActionBarRenderer?.buttons[0].slimMetadataButtonRenderer.button.segmentedLikeDislikeButtonViewModel.likeButtonViewModel.likeButtonViewModel.toggleButtonViewModel.toggleButtonViewModel.defaultButtonViewModel.buttonViewModel.accessibilityText;
        if (likesCount !== undefined) {
          likesCount = likesCount.replaceAll(/\D+/gm, "");
          likesCount = parseInt(likesCount);
          metadata.likes = likesCount.toLocaleString();
        }
      });
    }

    const tvOwner = isTVResponse ? tvVidMeta.owner?.videoOwnerRenderer : null;
    const ownerData = isTVResponse
      ? null
      : vidMetadata?.contents?.find((content) => content.slimOwnerRenderer)?.slimOwnerRenderer;

    let isLive = false;
    const captions = responseInfo.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    captions?.unshift({
      baseUrl: null,
      name: {
        runs: [{ text: "Disable captions" }],
      },
    });
    try {
      if (!isTVResponse) {
        this.playerParams = ownerData.navigationEndpoint.watchEndpoint.playerParams;
      }
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

      const searchParams = new URLSearchParams(source.url);
      //Iterate the search parameters.
      let n = searchParams.get("n");
      //let clen = searchParams.get("clen");
      let nValue = "";
      if (n !== null) {
        try {
            nValue = "&n=" + this.nfunction(n)
        }
        catch (e) {}
      }
      searchParams.delete("n");

      try {
        source["url"] = source["url"].replace(/&n=[^&]*/g, "");
        source["url"] = source["url"] + nValue;
        // source["url"] = source["url"] + "&alr=yes";
        source["url"] = source["url"] + "&cver=" + constants.YT_API_VALUES.VERSION_WEB;
        // source["url"] = source["url"] + "&ump=1";
        // source["url"] = source["url"] + "&srfvp=1";
        source["url"] = source["url"] + "&cpn=" + getCpn();
        // source["url"] = source["url"] + "&pot=" + encodeURIComponent(this.pot);
        // source["url"] = source["url"] + "&range=0-" + source.contentLength;
      }catch (e) {
        console.error(e)
      }

    });
    const channelName = isTVResponse
      ? (tvOwner?.title?.simpleText || "")
      : (ownerData?.title?.runs?.[0]?.text || "");
    const channelSubs = isTVResponse
      ? (tvOwner?.subscriberCountText?.simpleText.split(" ")[0] || "")
      : (ownerData?.collapsedSubtitle?.runs?.[0]?.text || "");
    const channelUrl = isTVResponse
      ? (tvOwner?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || "")
      : rendererUtils.getNavigationEndpoints(ownerData?.navigationEndpoint);
    const channelImg = isTVResponse
      ? (tvOwner?.thumbnail?.thumbnails?.[0]?.url || "")
      : (ownerData?.thumbnail?.thumbnails?.[0]?.url || "");

    const descPanel = mobileNext.engagementPanels
      ?.find(
        (panel) =>
          panel.engagementPanelSectionListRenderer?.panelIdentifier ===
          "video-description-ep-identifier"
      );
    const descItems = descPanel
      ?.engagementPanelSectionListRenderer?.content
      ?.structuredDescriptionContentRenderer?.items || [];
    const descriptionRenderer = descItems.find(
      (item) => item?.expandableVideoDescriptionBodyRenderer
    )?.expandableVideoDescriptionBodyRenderer || null;

    const vidData = {
      id: details.videoId,
      title: details.title,
      isLive: details.isLiveContent,
      channelName,
      channelSubs,
      channelUrl,
      channelImg,
      captions: captions,
      endscreen: responseInfo.endscreen,
      storyboards: responseInfo.storyboards?.playerStoryboardSpecRenderer?.spec || null,
      availableResolutions: resolutions?.formats ? resolutions.formats : resolutions,
      availableResolutionsAdaptive: resolutions?.adaptiveFormats ? resolutions.adaptiveFormats : resolutions,
      hls: hls,
      dash: dash,
      metadata: {
        ustreamerConfig: ustreamerConfig,
        serverAbrStreamingUrl: serverAbrStreamingUrl,
        publishDate: publishDate,
        contents: vidMetadata?.contents || [],
        description: details.shortDescription,
        thumbnails: details.thumbnails?.thumbnails,
        isPrivate: details.isPrivate,
        viewCount: isTVResponse
          ? (tvVidMeta.viewCount?.videoViewCountRenderer?.viewCount?.simpleText  + " · " || details.viewCount + " · ")
          : details.viewCount,
        lengthSeconds: details.lengthSeconds,
        isLive: isLive,
        likes: metadata.likes,
      },
      renderedData: {
        description: descriptionRenderer,
        recommendations: recommendations,
        recommendationsContinuation: isTVResponse
          ? (tvPivotSectionList?.continuations?.[0]?.nextContinuationData?.continuation || null)
          : (recommendations?.contents?.[recommendations.contents.length - 1]
              ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null),
      },
      engagementPanels: mobileNext.engagementPanels || [],
      commentData: (() => {
          const col = isTVResponse
            ? mobileNext.contents?.singleColumnWatchNextResults?.results?.results
            : columnUI;
          return col?.contents
            ?.find((content) => content.itemSectionRenderer?.contents)
            ?.itemSectionRenderer?.contents?.[0]?.videoMetadataCarouselViewModel || null;
        })(),
      playbackTracking: responseInfo.playbackTracking,
      commentContinuation: mobileNext.engagementPanels
        ?.find(
          (panel) =>
            panel.engagementPanelSectionListRenderer?.panelIdentifier ===
            "engagement-panel-comments-section"
        )
        ?.engagementPanelSectionListRenderer?.content?.sectionListRenderer?.contents
        ?.find((content) => content.itemSectionRenderer)
        ?.itemSectionRenderer?.contents
        ?.find((content) => content.continuationItemRenderer)
        ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token || null,
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
    //console.warn(finalPart);
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
}

export default Innertube;
