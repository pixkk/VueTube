// To  centralize certain values and URLs as for easier debugging and refactoring

import {getCpn} from "./utils";

const url = {
  YT_URL: "https://www.youtube.com",
  YT_MOBILE: "https://m.youtube.com",
  YT_EMBED: "https://www.youtube.com/embed/",
  YT_MUSIC_URL: "https://music.youtube.com",
  // YT_BASE_API: "https://www.youtube.com/youtubei/v1",
  YT_BASE_API: "https://m.youtube.com/youtubei/v1",
  // YT_SUGGESTIONS: "https://suggestqueries.google.com/complete",
  YT_SUGGESTIONS: "https://suggestqueries-clients6.youtube.com/complete",
  VT_GITHUB: "https://api.github.com/repos/pixkk/VueTube",
  VT_BETA_UPDATES: "https://api.github.com/repos/pixkk/VueTube/actions/runs"
};

const webVersion = "2.20260715.04.00";

const androidApiVal = {
  // VERSION: "19.09",
  VERSION: "20.38",
  CLIENTNAME: "ANDROID",
  // VERSION_WEB: "2.20240628.01.00",
  VERSION_WEB: webVersion,
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};
const androidVrApiVal = {
  // VERSION: "16.25",
  CLIENTNAME: "ANDROID_VR",
  // VERSION_WEB: "2.20240628.01.00",
  clientScreen: "EMBED",
  VERSION_WEB: "1.37",
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};
const webEmbeddedApiVal = {
  // VERSION: "16.25",
  CLIENTNAME: "WEB_EMBEDDED_PLAYER",
  clientScreen: "EMBED",
  // VERSION_WEB: "2.20240628.01.00",
  VERSION_WEB: webVersion,
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};
const MWEB = {
  CLIENTNAME: "MWEB",
  clientScreen: "WATCH",
  VERSION_WEB: webVersion,
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};

const visionOsClient = {
  CLIENTNAME: "VISIONOS",
  CLIENT_ID: 101,
  VERSION_WEB: "0.1",
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  REFERER: url.YT_URL,
  browserName: "Chrome",
  browserVersion: "125.0.0.0",
  osName: "Windows",
  osVersion: "10.0",
  platform: "DESKTOP",
};

const tvApiVal = {
  CLIENTNAME: "TVHTML5",
  clientScreen: "WATCH",
  VERSION_WEB: "7.20260826.15.00",
  deviceModel: "BRAVIA 8K UR2",
  deviceMake: "Sony",
  USER_AGENT: "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
  browserName: "Opera",
  browserVersion: "46.0.2207.0",
  platform: "TV",
  VERSION: "7.20260826.15.00",
};

const clientConfigs = [
  webEmbeddedApiVal,
  tvApiVal,
  androidVrApiVal,
  MWEB
];
const filesystem = {
  plugins: "plugins/",
};

export default {
  URLS: url,
  YT_API_VALUES: androidApiVal,
  VISION_OS_API_VALUES: visionOsClient,
  fs: filesystem,
  clientConfigs: clientConfigs,

  AUTHED_JSON_HEADER: () => {
    const headers = { "Content-Type": "application/json" };
    if (typeof localStorage !== "undefined") {
      const token = localStorage.getItem("vt_active_access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-youtube-client-name"] = String(7);
        headers["x-youtube-client-version"] = tvApiVal.VERSION;
      }
    }
    return headers;
  },

  VISION_OS_CLIENT: (config, videoId = null, reloadPlaybackContext = null, signatureTimestamp) => {
    return {
      context: {
        client:
          {
            gl: config.INNERTUBE_CONTEXT.client.gl,
            hl: localStorage.getItem("language") || "en",
            userAgent: visionOsClient.USER_AGENT,
            clientName: visionOsClient.CLIENTNAME,
            clientVersion: visionOsClient.VERSION_WEB,
            osName: visionOsClient.osName,
            osVersion: visionOsClient.osVersion,
            platform: visionOsClient.platform,
            browserName: visionOsClient.browserName,
            browserVersion: visionOsClient.browserVersion,
            clientFormFactor: "UNKNOWN_FORM_FACTOR",
            originalUrl: visionOsClient.REFERER,
            remoteHost: config.INNERTUBE_CONTEXT.client.remoteHost,
            visitorData: config.INNERTUBE_CONTEXT.client.visitorData,
          }
        },
      videoId: videoId,
      contentCheckOk: true,
      racyCheckOk: true,
      playbackContext: {
        ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
        contentPlaybackContext: {
          signatureTimestamp: signatureTimestamp * 10000 + 1,
          html5Preference: "HTML5_PREF_WANTS",
          lactMilliseconds: "-1",
        },
      },
    }
  },
  TVHTML5_CLIENT: (config, videoId = null, reloadPlaybackContext = null, signatureTimestamp, poToken) => {
    return {
      videoId: `${videoId}`,
      context: {
        client: {
          hl: config.INNERTUBE_CONTEXT.client.hl,
          gl: config.INNERTUBE_CONTEXT.client.gl,
          remoteHost: config.INNERTUBE_CONTEXT.client.remoteHost,
          visitorData: config.INNERTUBE_CONTEXT.client.visitorData,
          deviceMake: "Sony",
          deviceModel: "BRAVIA 8K UR2",
          userAgent: "Mozilla/5.0 (Linux; Andr0id 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
          clientName: "TVHTML5",
          clientVersion: "7.20260826.15.00",
          osName: "Andr0id 9",
          osVersion: "9.0",
          originalUrl: "https://www.youtube.com/tv",
          theme: "CLASSIC",
          screenPixelDensity: 1,
          platform: "TV",
          clientFormFactor: "UNKNOWN_FORM_FACTOR",
          webpSupport: false,
          configInfo: config.INNERTUBE_CONTEXT.client.configInfo,
          screenDensityFloat: 1.1458333730697632,
          tvAppInfo: {
            appQuality: "TV_APP_QUALITY_FULL_ANIMATION",
            voiceCapability: {
              hasSoftMicSupport: false,
              hasHardMicSupport: false
            },
            signedInAccountCount: 1,
            supportsNativeScrolling: false,
            watchPageInfo: {
              watchPageVersion: "WATCH_PAGE_VERSION_V2025",
              combineChannelSdEntrypoints: false,
              enableDirectToChannelPage: false
            },
            livingRoomAppMode: "LIVING_ROOM_APP_MODE_UNSPECIFIED",
          },
          timeZone: (new Intl.DateTimeFormat).resolvedOptions().timeZone,
          browserName: "Opera",
          browserVersion: "46.0.2207.0",
          acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          rolloutToken: config.INNERTUBE_CONTEXT.client?.rolloutToken,
          screenWidthPoints: 759,
          screenHeightPoints: 781,
          utcOffsetMinutes: -Math.floor((new Date).getTimezoneOffset()),
          userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
          applicationState: "ACTIVE",
          connectionType: "CONN_CELLULAR_4G",
          memoryTotalKbytes: "16000000",
          playerType: "UNIPLAYER",
          clientScreen: "WATCH"
        },
        user: {
          lockedSafetyMode: false
        },
        request: {
          useSsl: true,
          internalExperimentFlags: [],
          consistencyTokenJars: []
        },
        // clientScreenNonce: "",
        adSignalsInfo: {
          params: []
        },
        clickTracking: {
        }
      },
      playbackContext: {
        contentPlaybackContext: {
          html5Preference: "HTML5_PREF_WANTS",
          lactMilliseconds: "-1",
          referer: `https://www.youtube.com/tv#/watch?v=${videoId}`,
          signatureTimestamp: signatureTimestamp,
          autoCaptionsDefaultOn: false,
          mdxContext: {},
          playerWidthPixels: 759,
          playerHeightPixels: 781
        },
        devicePlaybackCapabilities: {
          supportsVp9Encoding: true,
          supportXhr: true
        }
      },
      cpn: getCpn(),
      params: "",
      captionParams: {},
      serviceIntegrityDimensions: {
        poToken: poToken
      },
      attestationRequest: {
        omitBotguardData: true
      }
    }
  },
  WEB_EMBED_CLIENT: (config, videoId = null, reloadPlaybackContext = null, signatureTimestamp) => {
    console.error(config.WEB_PLAYER_CONTEXT_CONFIGS)
    return {
      videoId: videoId,
      context: {
        client: {
          hl: config.INNERTUBE_CONTEXT.client.hl,
          gl: config.INNERTUBE_CONTEXT.client.gl,
          remoteHost: config.INNERTUBE_CONTEXT.client.remoteHost,
          deviceMake: config.INNERTUBE_CONTEXT.client.deviceMake,
          deviceModel: config.INNERTUBE_CONTEXT.client.deviceModel,
          visitorData: config.INNERTUBE_CONTEXT.client.visitorData,
          userAgent: webEmbeddedApiVal.USER_AGENT,
          clientName: "WEB_EMBEDDED_PLAYER",
          clientVersion: webEmbeddedApiVal.VERSION_WEB,
          osName: "Windows",
          osVersion: "10.0",
          originalUrl: `https://www.youtube.com/embed/${videoId}`,
          platform: "DESKTOP",
          clientFormFactor: "UNKNOWN_FORM_FACTOR",
          configInfo: config.INNERTUBE_CONTEXT.client.configInfo,
          browserName: "Chrome",
          browserVersion: "151.0.0.0",
          acceptHeader: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          // deviceExperimentId: "",
          rolloutToken: config.INNERTUBE_CONTEXT.client?.rolloutToken,
          screenWidthPoints: 560,
          screenHeightPoints: 315,
          screenPixelDensity: 1,
          screenDensityFloat: 1.1458333730697632,
          utcOffsetMinutes: -Math.floor((new Date).getTimezoneOffset()),
          userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
          applicationState: "ACTIVE",
          connectionType: "CONN_CELLULAR_4G",
          timeZone: (new Intl.DateTimeFormat).resolvedOptions().timeZone,
          playerType: "UNIPLAYER",
          tvAppInfo: {
            livingRoomAppMode: "LIVING_ROOM_APP_MODE_UNSPECIFIED"
          },
          clientScreen: "EMBED"
        },
        user: {
          lockedSafetyMode: false
        },
        request: {
          useSsl: true
        },
        thirdParty: {
          embedUrl: `https://www.youtube.com/embed/${videoId}/`,
          embeddedPlayerContext: {
            visibilityFraction: 0,
            visibilityFractionSource: "EMBEDDED_PLAYER_VISIBILITY_FRACTION_SOURCE_INTERSECTION_OBSERVER",
            autoplayBrowserPolicy: "AUTOPLAY_BROWSER_POLICY_UNSPECIFIED",
            autoplayIntended: false,
            autoplayStatus: "AUTOPLAY_STATUS_NOT_ATTEMPTED"
          }
        }
      },
      playbackContext: {
        ...(reloadPlaybackContext ? { reloadPlaybackContext } : {}),
        contentPlaybackContext: {
          html5Preference: "HTML5_PREF_WANTS",
          lactMilliseconds: "-1",
          referer: `https://www.youtube.com/embed/${videoId}`,
          signatureTimestamp: signatureTimestamp,
          autoCaptionsDefaultOn: false,
          playerWidthPixels: 560,
          playerHeightPixels: 315,
          encryptedHostFlags: config.WEB_PLAYER_CONTEXT_CONFIGS?.WEB_PLAYER_CONTEXT_CONFIG_ID_EMBEDDED_PLAYER?.encryptedHostFlags,
        },
        devicePlaybackCapabilities: {
          supportsVp9Encoding: true,
          supportXhr: true
        }
      },
      cpn: getCpn(),
      captionParams: {}
    }
  },
  CLIENT_HEADER: (config) => {
    return {
      accept: "*/*",
      "user-agent": config.INNERTUBE_CONTEXT.client.userAgent,
      "accept-language": `${config.INNERTUBE_CONTEXT.client.hl}-${config.INNERTUBE_CONTEXT.client.gl},${config.INNERTUBE_CONTEXT.client.hl};q=0.9`,
      "content-type": "application/json",
      // origin: visionOsClient.REFERER,
      // referer: visionOsClient.REFERER,
      "x-goog-authuser": 0,
      "x-goog-visitor-id": config.INNERTUBE_CONTEXT.client.visitorData || "",
      "x-youtube-client-name": String(config.INNERTUBE_CONTEXT_CLIENT_NAME),
      "x-youtube-client-version": config.INNERTUBE_CONTEXT_CLIENT_VERSION,
    };
  },
  INNERTUBE_HEADER: (info, isAuthedUser = false) => {
    const token = isAuthedUser
      ? localStorage.getItem("vt_active_access_token")
      : null;
    const headers = {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": isAuthedUser ? 1 : 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": isAuthedUser ? tvApiVal.CLIENT_WEB_M : MWEB.CLIENTNAME,
      "x-youtube-client-version": isAuthedUser ? tvApiVal.VERSION : MWEB.VERSION_WEB,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  },

  INNERTUBE_NEW_HEADER: (info, auth = true) => {
    const token = typeof localStorage !== "undefined"
      ? localStorage.getItem("vt_active_access_token") && auth
      : null;
    const headers = {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": info.CLIENT_WEB_M || info.clientVersion || 7,
      "x-youtube-client-version": info.VERSION || info.clientVersion || androidApiVal.VERSION,
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return headers;
  },
  INNERTUBE_CLIENT: (info) => {
    return {
      gl: info.gl,
      hl: localStorage.getItem("language") || "en",
      deviceMake: "Google",
      // deviceMake: info.deviceMake,
      // deviceModel: info.deviceModel,
      deviceModel: "Nexus 5",
      userAgent: info.userAgent,
      clientName: androidApiVal.CLIENTNAME,
      clientVersion: androidApiVal.VERSION,
      osName: info.osName,
      osVersion: info.osVersion,
      platform: "MOBILE",
      playerType: "UNIPLAYER",
      originalUrl: info.originalUrl,
      configInfo: info.configInfo,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
    };
  },
  INNERTUBE_CLIENT_TV: (info) => {
    return {
      gl: info.gl,
      hl: localStorage.getItem("language") || "en",
      deviceMake: tvApiVal.deviceMake,
      deviceModel: tvApiVal.deviceModel,
      userAgent: tvApiVal.USER_AGENT,
      clientName: tvApiVal.CLIENTNAME,
      clientVersion: tvApiVal.VERSION,
      osName: info.osName,
      osVersion: info.osVersion,
      platform: tvApiVal.platform,
      browserName: tvApiVal.browserName,
      browserVersion: tvApiVal.browserVersion,
      originalUrl: info.originalUrl,
      configInfo: info.configInfo,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
    };
  },

  INNERTUBE_CLIENT_FOR_CHANNEL: (info) => {
    return {
      gl: info.gl,
      hl: localStorage.getItem("language") || "en",
      deviceMake: "Generic",
      deviceModel: "Android 15.0",
      userAgent: info.userAgent,
      clientName: "MWEB",
      clientVersion: androidApiVal.VERSION_WEB,
      osName: info.osName,
      osVersion: info.osVersion,
      platform: "MOBILE",
      playerType: "UNIPLAYER",
      originalUrl: info.originalUrl,
      configInfo: info.configInfo,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
    };
  },
  INNERTUBE_REQUEST: () => {
    return {
      useSsl: true,
      internalExperimentFlags: [],
      consistencyTokenJars: [],
    };
  },
  // https://github.com/zerodytrash/YouTube-Internal-Clients
  INNERTUBE_VIDEO: (info) => {
    return {
      gl: info.gl,
      hl: localStorage.getItem("language") || "en",
      deviceMake: info.deviceMake,
      deviceModel: info.deviceModel,
      userAgent: info.userAgent,
      clientName: webEmbeddedApiVal.CLIENTNAME,
      clientVersion: webEmbeddedApiVal.VERSION_WEB,
      // osName: info.osName,
      osName: "Android",
      osVersion: info.osVersion,
      platform: "TABLET",
      playerType: "UNIPLAYER",
      // screenPixelDensity: "3",
      originalUrl: info.originalUrl,
      configInfo: info.configInfo,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
      clientFormFactor: "LARGE_FORM_FACTOR",
      // screenDensityFloat: "1",
      timeZone: info.timeZone,
      browserName: "Chrome",
      browserVersion: "151.0.0.0",
      acceptHeader:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      deviceExperimentId: info.deviceExperimentId,
      // screenWidthPoints: info.screenWidthPoints,
      // screenHeightPoints: info.screenHeightPoints,
      utcOffsetMinutes: info.utcOffsetMinutes,
      userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
      memoryTotalKbytes: "8000000",
      clientScreen: "EMBED",
      mainAppWebInfo: {
        webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
        isWebNativeShareAvailable: true,
      },
    };
  },
};
