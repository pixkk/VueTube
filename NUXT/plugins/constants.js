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
};

const ytApiVal = {
  // VERSION: "16.25",
  VERSION: "19.09",
  CLIENTNAME: "ANDROID",
  VERSION_WEB: "2.20240628.01.00",
  USER_AGENT: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
  CLIENT_WEB_M: 2,
  CLIENT_WEB_D: 1,
};
const filesystem = {
  plugins: "plugins/",
};

module.exports = {
  URLS: url,
  YT_API_VALUES: ytApiVal,
  fs: filesystem,

  INNERTUBE_HEADER: (info) => {
    return {
      accept: "*/*",
      "user-agent": info.userAgent,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": ytApiVal.CLIENTNAME,
      "x-youtube-client-version": ytApiVal.VERSION,
    };
  },

  INNERTUBE_NEW_HEADER: (info) => {
    return {
      accept: "*/*",
      "user-agent": ytApiVal.USER_AGENT,
      "accept-language": `${info.hl}-${info.gl},${info.hl};q=0.9`,
      "content-type": "application/json",
      "x-goog-authuser": 0,
      "x-goog-visitor-id": info.visitorData || "",
      "x-youtube-client-name": ytApiVal.CLIENT_WEB_M,
      "x-youtube-client-version": ytApiVal.VERSION,
    };
  },
  INNERTUBE_CLIENT: (info) => {
    return {
      gl: info.gl,
      hl: info.hl,
      deviceMake: "Google",
      // deviceMake: info.deviceMake,
      // deviceModel: info.deviceModel,
      deviceModel: "Nexus 5",
      userAgent: ytApiVal.USER_AGENT,
      clientName: ytApiVal.CLIENTNAME,
      clientVersion: ytApiVal.VERSION,
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
      hl: info.hl,
      deviceMake: "Generic",
      deviceModel: "Android 15.0",
      userAgent: ytApiVal.USER_AGENT,
      clientName: "MWEB",
      clientVersion: ytApiVal.VERSION_WEB,
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
      hl: info.hl,
      deviceMake: info.deviceMake,
      deviceModel: info.deviceModel,
      userAgent: info.userAgent,
      clientName: "WEB_EMBEDDED_PLAYER",
      clientVersion: ytApiVal.VERSION_WEB,
      osName: info.osName,
      osVersion: info.osVersion,
      platform: "MOBILE",
      playerType: "UNIPLAYER",
      screenPixelDensity: "3",
      originalUrl: info.originalUrl,
      configInfo: info.configInfo,
      remoteHost: info.remoteHost,
      visitorData: info.visitorData,
      clientFormFactor: "LARGE_FORM_FACTOR",
      screenDensityFloat: "1",
      timeZone: info.timeZone,
      browserName: info.browserName,
      browserVersion: info.browserVersion,
      acceptHeader:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      deviceExperimentId: info.deviceExperimentId,
      screenWidthPoints: info.screenWidthPoints,
      screenHeightPoints: info.screenHeightPoints,
      utcOffsetMinutes: info.utcOffsetMinutes,
      userInterfaceTheme: "USER_INTERFACE_THEME_LIGHT",
      memoryTotalKbytes: "8000000",
      clientScreen: "WATCH",
      mainAppWebInfo: {
        webDisplayMode: "WEB_DISPLAY_MODE_BROWSER",
        isWebNativeShareAvailable: true,
      },
    };
  },
};
