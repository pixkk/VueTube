<template>
  <base-video-renderer
    :vidId="video.videoId"
    :thumbnails="thumbnailSources"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :thumbnailOverlayText="thumbnailOverlayText"
    :channelUrl="
      $rendererUtils.getNavigationEndpoints(
        video?.shortBylineText?.runs[0]?.navigationEndpoint
      )
    "
    :channelIcon="
      video?.channelThumbnail?.channelThumbnailWithLinkRenderer?.thumbnail
        ?.thumbnails[0]?.url
    "
    :titles="video.headline.runs"
    :bottomText="parseBottom(video)"
  >
  </base-video-renderer>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
export default {
  props: ["video"],

  components: {
    baseVideoRenderer,
  },

  computed: {
    thumbnailOverlayText() {
    let text = "-";
      // console.warn(this.video)
      this.video.thumbnailOverlays.forEach((thumbnail) => {
        if (thumbnail.thumbnailOverlayTimeStatusRenderer) {
          // console.warn(thumbnail.thumbnailOverlayTimeStatusRenderer.text.runs[0].text)
          text = thumbnail.thumbnailOverlayTimeStatusRenderer.text.runs[0].text;
        }
      });
      // return this.video.lengthText? this.video.lengthText.runs[0].text :
      // return "";
      return text;
    },
    thumbnailOverlayStyle() {
      let text = "-";
      this.video.thumbnailOverlays.forEach((thumbnail) => {
        if (thumbnail.thumbnailOverlayTimeStatusRenderer) {
          text = thumbnail.thumbnailOverlayTimeStatusRenderer.style;
        }
      });
      return text!== "-" ? text : "DEFAULT";
    },

    thumbnailSources() {
      // console.log(this.video);
      return this.video?.thumbnail?.thumbnails;
    },
  },

  methods: {
    parseBottom(video) {
      const bottomText = [
        video.shortBylineText?.runs[0].text,
        video.shortViewCountText?.runs[0].text + (video.shortViewCountText?.runs[1]?.text ? video.shortViewCountText?.runs[1]?.text : "") ,
      ];
      if (video.publishedTimeText?.runs[0].text)
        bottomText.push(video.publishedTimeText?.runs[0].text);
      return bottomText.join(" · ");
    },
  },
};
</script>
