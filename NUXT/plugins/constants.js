// To  centralize certain values and URLs as for easier debugging and refactoring

const url = {
  YT_URL: "https://www.youtube.com",
  YT_MOBILE: "https://m.youtube.com",
  YT_MUSIC_URL: "https://music.youtube.com",
  // YT_BASE_API: "https://www.youtube.com/youtubei/v1",
  YT_BASE_API: "https://m.youtube.com/youtubei/v1",
  // YT_SUGGESTIONS: "https://suggestqueries.google.com/complete",
  YT_SUGGESTIONS: "https://suggestqueries-clients6.youtube.com/complete",
  VT_GITHUB: "https://api.github.com/repos/pixkk/VueTube",
  VT_BETA_UPDATES: "https://api.github.com/repos/pixkk/VueTube/actions/runs"
};

const androidApiVal = {
  // VERSION: "16.25",
  VERSION: "19.09",
  CLIENTNAME: "ANDROID",
  // VERSION_WEB: "2.20240628.01.00",
  VERSION_WEB: "2.20250222.10.01",
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
  VERSION_WEB: "2.20250528.01.00",
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};
const tvApiVal = {
  CLIENTNAME: "TVHTML5",
  clientScreen: "WATCH",
  VERSION_WEB: "7.20250622.15.00",
  deviceModel: "BRAVIA 8K UR2",
  deviceMake: "Sony",
  USER_AGENT: "Mozilla/5.0 (Linux; Andr0id 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
  browserName: "Opera",
  browserVersion: "46.0.2207.0",
  platform: "TV",
  VERSION: "7.20250622.15.00",
};

const clientConfigs = [
  webEmbeddedApiVal,
  androidVrApiVal,
  tvApiVal,
];
const filesystem = {
  plugins: "plugins/",
};

module.exports = {
  URLS: url,
  YT_API_VALUES: androidApiVal,
  fs: filesystem,
  clientConfigs: clientConfigs,

  INNERTUBE_HEADER: (info) => {
    return {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": androidApiVal.CLIENTNAME,
      "x-youtube-client-version": androidApiVal.VERSION,
    };
  },

  INNERTUBE_NEW_HEADER: (info) => {
    console.warn(info)
    return {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": info.CLIENT_WEB_M || info.clientVersion || 7,
      "x-youtube-client-version": info.VERSION || info.clientVersion || androidApiVal.VERSION,
    };
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
  INNERTUBE_TECHNICAL: (info) => {
    return {
      clientName: webEmbeddedApiVal.CLIENTNAME,
      clientVersion: webEmbeddedApiVal.VERSION_WEB,
    };
  },
};
