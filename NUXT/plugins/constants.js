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

const webRemixApiVal = {
  CLIENTNAME: "WEB_REMIX",
  CLIENT_ID: 67,
  VERSION_WEB: "1.20260707.12.00",
  USER_AGENT: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  REFERER: "https://music.youtube.com",
  browserName: "Chrome",
  browserVersion: "125.0.0.0",
  osName: "Windows",
  osVersion: "10.0",
  platform: "DESKTOP",
};

const tvApiVal = {
  CLIENTNAME: "TVHTML5",
  clientScreen: "WATCH",
  VERSION_WEB: "7.20260713.15.00",
  deviceModel: "BRAVIA 8K UR2",
  deviceMake: "Sony",
  USER_AGENT: "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
  browserName: "Opera",
  browserVersion: "46.0.2207.0",
  platform: "TV",
  VERSION: "7.20260713.15.00",
};

// TODO: fix embedded config
//  body data - \"serializedThirdPartyEmbedConfig\":\"{\\\"enc\\\":\\\"AXH1ezm6q________________Ag\\\"}\"
// /next - contents.twoColumnWatchNextResults.results.results.contents[0].videoPrimaryInfoRenderer.videoActions.menuRenderer.topLevelButtons[1].buttonViewModel.trackingParams
// for  https://www.youtube.com/youtubei/v1/share/get_share_panel?prettyPrint=false (serializedSharedEntity: "Cgt0ZU96VThrSWx0d6ABAQ%3D%3D" after context payload),
// after that - in get_share_panel -
// actions[0].openPopupAction.popup.unifiedSharePanelRenderer.contents[0].
// thirdPartyNetworkSection.shareTargetContainer.thirdPartyShareTargetSectionRenderer.shareTargets[0].
// shareTargetRenderer.serviceEndpoint.signalServiceEndpoint.actions[2].
// openPopupAction.popup.sharingEmbedRenderer.encryptedEmbedConfig exists encryptedEmbedConfig. use it in "enc"
const clientConfigs = [
  webEmbeddedApiVal,
  tvApiVal,
  androidVrApiVal,
  MWEB
];
const filesystem = {
  plugins: "plugins/",
};

module.exports = {
  URLS: url,
  YT_API_VALUES: androidApiVal,
  WEB_REMIX_API_VALUES: webRemixApiVal,
  fs: filesystem,
  clientConfigs: clientConfigs,

  getAccessToken: () => {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem("vt_active_access_token") || null;
  },

  AUTHED_JSON_HEADER: () => {
    const headers = { "Content-Type": "application/json" };
      const token = this.getAccessToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        headers["x-youtube-client-name"] = String(tvApiVal.CLIENT_WEB_M);
        headers["x-youtube-client-version"] = tvApiVal.VERSION;
      }
    return headers;
  },

  INNERTUBE_HEADER: (info, noAuth = false) => {
    const token = !noAuth && typeof localStorage !== "undefined"
      ? localStorage.getItem("vt_active_access_token")
      : null;
    const headers = {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": androidApiVal.CLIENTNAME,
      "x-youtube-client-version": androidApiVal.VERSION,
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
      clientName: webEmbeddedApiVal.CLIENTNAME,
      clientVersion: webEmbeddedApiVal.VERSION,
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
      browserName: info.browserName,
      browserVersion: info.browserVersion,
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

  INNERTUBE_CLIENT_WEB_REMIX: (info) => {
    return {
      gl: info.gl,
      hl: localStorage.getItem("language") || "en",
      userAgent: webRemixApiVal.USER_AGENT,
      clientName: webRemixApiVal.CLIENTNAME,
      clientVersion: webRemixApiVal.VERSION_WEB,
      osName: webRemixApiVal.osName,
      osVersion: webRemixApiVal.osVersion,
      platform: webRemixApiVal.platform,
      browserName: webRemixApiVal.browserName,
      browserVersion: webRemixApiVal.browserVersion,
      clientFormFactor: "UNKNOWN_FORM_FACTOR",
      originalUrl: webRemixApiVal.REFERER,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
    };
  },

  INNERTUBE_HEADER_WEB_REMIX: (info) => {
    return {
      accept: "*/*",
      "user-agent": webRemixApiVal.USER_AGENT,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      origin: webRemixApiVal.REFERER,
      referer: webRemixApiVal.REFERER,
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": String(webRemixApiVal.CLIENT_ID),
      "x-youtube-client-version": webRemixApiVal.VERSION_WEB,
    };
  },
};
