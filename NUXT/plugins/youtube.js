//⚠️🚧 WARNING: PARTS OF THIS FILE IS IN MAINTENANCE MODE 🚧⚠️
// PARTS OF THIS FILE WILL BE REPLACED WITH A SEPARATE LIBRARY
// contribute to the library here: https://github.com/VueTubeApp/Vuetube-Extractor

//---   Modules/Imports   ---//
import { Http } from "@capacitor-community/http";
import Innertube from "./innertube";
import constants from "./constants";
import rendererUtils from "./renderers";
import { Buffer } from "buffer";
import iconv from "iconv-lite";
import { Toast } from "@capacitor/toast";
import { createHash } from "crypto";

function getEncoding(contentType) {
  const re = /charset=([^()<>@,;:\"/[\]?.=\s]*)/i;
  const content = re.exec(contentType);
  console.log(content);
  return content[1].toLowerCase();
}

const searchModule = {
  logs: new Array(),
  //---   Get YouTube's Search Auto Complete   ---//
  autoComplete(text, callback) {
    Http.get({
      url: `${constants.URLS.YT_SUGGESTIONS}/search?q=${encodeURIComponent(
        text
      )}&client=youtube&ds=yt`,
      responseType: "arraybuffer",
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        Expires: "0",
      },
    })
      .then((res) => {
        const contentType = res.headers["Content-Type"];
        // make a new buffer object from res.data
        const buffer = Buffer.from(res.data, "base64");
        // convert res.data from iso-8859-1 to utf-8
        const data = iconv.decode(buffer, getEncoding(contentType));
        callback(data);
      })
      .catch((err) => {
        callback(err);
      });
  },

  getReturnYoutubeDislike(id, callback) {
    Http.request({
      method: "GET",
      url: `https://returnyoutubedislikeapi.com/votes`,
      params: { videoId: id },
    })
      .then((res) => {
        callback(res.data);
      })
      .catch((err) => {
        callback(err);
      });
  },
  getSponsorBlock(id, callback) {
    function sha256(content) {
      return createHash("sha256").update(content).digest("hex");
    }

    let hashedVideoId = sha256(id).slice(0, 4);
    Http.request({
      method: "GET",
      url:
        `https://sponsor.ajay.app/api/skipSegments/` +
        hashedVideoId +
        "?categories=%5B%22sponsor%22%2C%22poi_highlight%22%2C%22exclusive_access%22%2C%22chapter%22%2C%22selfpromo%22%2C%22interaction%22%2C%22intro%22%2C%22outro%22%2C%22preview%22%2C%22filler%22%2C%22music_offtopic%22%5D&actionTypes=%5B%22skip%22%2C%22poi%22%2C%22chapter%22%2C%22mute%22%2C%22full%22%5D&userAgent=mnjggcdmjocbbbhaepdhchncahnbgone",
      // params: { videoID: hashedVideoId },
    })
      .then((res) => {
        console.warn(res.data);
        res.data.forEach((item) => {
          // console.warn("WE HERE - " + JSON.stringify(item));
          if (item.videoID == id) {
            // console.warn("IT IS IT - " + JSON.stringify(item));
            callback(item);
          }
        });
      })
      .catch((err) => {
        callback(err);
      });
  },
  showToast(text) {
    Toast.show({ text: text });
  },
};

//---   Recommendations   ---//

let InnertubeAPI;

// Loads Innertube object. This will be the object used in all future Innertube API calls. getAPI Code provided by Lightfire228 (https://github.com/Lightfire228)
// These are just a way for the backend Javascript to communicate with the front end Vue scripts. Essentially a wrapper inside a wrapper
const innertubeModule = {
  async getAPI() {
    if (!InnertubeAPI) {
      InnertubeAPI = await Innertube.createAsync(
        (message, isError, shortMessage) => {
          if (shortMessage) {
            Toast.show({ text: shortMessage });
          }
        }
      );
    }
    return InnertubeAPI;
  },

  async getVid(id) {
    try {
      return await InnertubeAPI.VidInfoAsync(id);
    } catch (error) {
      console.error(error);
    }
  },

  getThumbnail(id, resolution, backupThumbnail) {
    if (resolution == "max") {
      const url = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      let img = new Image();
      img.src = url;
      img.onload = function () {
        if (img.height !== 120) return url;
      };
    }
    if (backupThumbnail[backupThumbnail.length - 1])
      return backupThumbnail[backupThumbnail.length - 1].url;
    else return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  },

  async getChannel(url) {
    try {
      const response = await InnertubeAPI.getChannelAsync(url);
      return response.data;
    } catch (error) {}
  },

  // It just works™
  // Front page recommendation
  async recommend() {
    const response = await InnertubeAPI.getRecommendationsAsync();
    let final;
    if (!response.success)
      throw new Error("An error occurred and innertube failed to respond");
    // console.warn(response.data);
    let contents = response.data.contents.singleColumnBrowseResultsRenderer
      .tabs[0].tabRenderer.content.sectionListRenderer?.contents[0]
      .itemSectionRenderer?.contents[0]?.elementRenderer?.newElement
      ? null
      : response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
          .tabRenderer.content.sectionListRenderer?.contents;

    if (contents === null) {
      contents = response.data.contents.singleColumnBrowseResultsRenderer
        .tabs[0].tabRenderer.content.richGridRenderer?.contents
        ? response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
            .tabRenderer.content.richGridRenderer?.contents
        : null;
    }
    if (contents !== null) {
      final = contents.map((shelves) => {
        // if (shelves.shelfRenderer) {
        const video = shelves.shelfRenderer?.content?.horizontalListRenderer
          ? shelves.shelfRenderer?.content?.horizontalListRenderer
          : shelves.richItemRenderer?.content;
        // }
        //const video = shelves.itemSectionRenderer?.contents[0].videoWithContextRenderer;
        // if (video
        if (video) {
          return video;
        } else {
          return null;
        }
      });
      const continuations =
        response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
          .tabRenderer.content.sectionListRenderer.continuations;
      // console.log({ continuations: continuations, contents: final });
      console.warn({ continuations: continuations, contents: final });

      return { continuations: continuations, contents: final };
    } else {
      // const title = response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].elementRenderer.newElement.type.componentType.model.feedNudgeModel.context
      let title;
      response.data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents.forEach(
        (tab) => {
          if (tab.itemSectionRenderer) {
            if (
              tab.itemSectionRenderer.contents[0].elementRenderer.newElement
                .type.componentType.model.feedNudgeModel
            ) {
              console.warn(tab.itemSectionRenderer);
              title =
                tab.itemSectionRenderer.contents[0].elementRenderer.newElement
                  .type.componentType.model.feedNudgeModel.nudgeData.title
                  .content;
            }
          } else {
            title =
              tab.tabRenderer.content.richGridRenderer.contents[1]
                .richSectionRenderer.content.feedNudgeRenderer.title.runs[0]
                .text;
          }
        }
      );

      let subtitle;

      response.data.contents.singleColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents.forEach(
        (tab) => {
          if (tab.itemSectionRenderer) {
            if (
              tab.itemSectionRenderer.contents[0].elementRenderer.newElement
                .type.componentType.model.feedNudgeModel
            ) {
              console.warn(tab.itemSectionRenderer);
              subtitle =
                tab.itemSectionRenderer.contents[0].elementRenderer.newElement
                  .type.componentType.model.feedNudgeModel.nudgeData.subtitle
                  .content;
            }
          } else {
            subtitle =
              tab.tabRenderer.content.richGridRenderer.contents[1]
                .richSectionRenderer.content.feedNudgeRenderer.subtitle.runs[0]
                .text;
          }
        }
      );

      // title = response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.sectionListRenderer
      //   ? response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //       .tabRenderer.content.sectionListRenderer.contents[0]
      //       .itemSectionRenderer.contents[0].elementRenderer.newElement.type
      //       .componentType.model.feedNudgeModel.nudgeData.title.content
      //   : response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //       .tabRenderer.content.richGridRenderer.contents[1]
      //       .richSectionRenderer.content.feedNudgeRenderer.title.runs[0].text;

      // const title =
      // response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.richGridRenderer
      //   ? response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.richGridRenderer
      //     .contents[1].richSectionRenderer.content.feedNudgeRenderer.title.runs[0].text : "null";

      // const subtitle = response.data.contents.singleColumnBrowseResultsRenderer
      //   .tabs[0].tabRenderer.content.sectionListRenderer
      //   ? response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //       .tabRenderer.content.sectionListRenderer.contents[0]
      //       .itemSectionRenderer.contents[0].elementRenderer.newElement.type
      //       .componentType.model.feedNudgeModel.nudgeData.subtitle.content
      //   : response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //       .tabRenderer.content.richGridRenderer.contents[1]
      //       .richSectionRenderer.content.feedNudgeRenderer.subtitle.runs[0]
      //       .text;
      // const subtitle =
      // response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.richGridRenderer
      //   ? response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.richGridRenderer
      //     .contents[1].richSectionRenderer.content.feedNudgeRenderer.subtitle.runs[0].text : "null";

      // console.log(response.data.contents.singleColumnBrowseResultsRenderer.tabs[0]
      //   .tabRenderer.content.richGridRenderer);
      return { title: title, subtitle: subtitle };
    }
  },

  async recommendContinuation(continuation, endpoint) {
    const response = await this.getContinuation(continuation, endpoint);
    const contents =
      response.data.continuationContents.sectionListContinuation.contents;
    const final = contents.map((shelves) => {
      const video = shelves.shelfRenderer?.content?.horizontalListRenderer;
      if (video) return video;
    });
    const continuations = response.data.continuationContents
      .sectionListContinuation.continuations
      ? response.data.continuationContents.sectionListContinuation.continuations
      : null;
    return { continuations: continuations, contents: final };
  },

  async getContinuation(continuation, endpoint, mode = "android") {
    let contextAdditional = {};
    if (mode.toLowerCase() == "web") {
      contextAdditional = {
        ...contextAdditional,
        ...{
          client: {
            clientName: constants.YT_API_VALUES.CLIENT_WEB_D,
            clientVersion: constants.YT_API_VALUES.VERSION_WEB,
          },
        },
      };
    }
    return await InnertubeAPI.getContinuationsAsync(
      continuation,
      endpoint,
      contextAdditional
    );
  },

  async search(query) {
    try {
      const response = await InnertubeAPI.getSearchAsync(query);
      return response.contents.sectionListRenderer;
    } catch (err) {}
  },

  async saveApiStats(query, url) {
    await InnertubeAPI.apiStats(query, url);
  },
};

//---   Start   ---//
export default ({ app }, inject) => {
  inject("youtube", { ...searchModule, ...innertubeModule });
  inject("rendererUtils", rendererUtils);
};
