<template>
  <base-video-renderer
    :vidId="vidIdValue"
    :thumbnails="thumbnailSources"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :thumbnailOverlayText="thumbnailOverlayText"
    :channelUrl="
      this.$rendererUtils.getNavigationEndpoints(canonicalBaseUrl)
    "
    :channelIcon="channelIcon"
    :titles="video?.videoData ? video.videoData.metadata.title : video?.title?.runs"
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
    channelIcon() {
      // console.log(this.video);
      return this.video?.videoData ? this.video.videoData.avatar.image.sources[0].url : this.video?.channelThumbnail?.thumbnails[0]?.url;
    },
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
      return this.video?.videoData ? this.video.videoData.thumbnail?.image.sources : this.video?.thumbnail?.thumbnails;
    },
    canonicalBaseUrl() {
      // console.log(this.video?.longBylineText?.runs[0]?.navigationEndpoint.browseEndpoint.canonicalBaseUrl);
      return this.video?.videoData ? this.video.videoData.avatar.endpoint.innertubeCommand : this.video?.longBylineText?.runs[0]?.navigationEndpoint.browseEndpoint.browseId;
    },
    vidIdValue() {
      return this.video?.videoData ? this.video.videoData.dragAndDropUrl.split("?v=")[1] : this.video?.videoId;
    },
  },

  methods: {
    parseBottom(video) {
      const bottomText = [
          video?.videoData ? video.videoData.longBylineText.runs[0].text : video?.longBylineText.runs[0].text,
        // video?.videoData ? video.videoData.metadata.title : video?.title?.runs[0]?.text,
        video?.videoData ? video.videoData.metadata.metadataDetails : video?.shortViewCountText?.runs[0]?.text,
        video?.shortViewCountText ? video?.shortViewCountText?.runs[1]?.text : "",
      ];
      if (video?.videoData ? video.videoData.publishedTimeText?.runs[0].text : video?.publishedTimeText?.runs[0]?.text)
        bottomText.push(video?.videoData ? video.videoData.publishedTimeText?.runs[0].text : video?.publishedTimeText?.runs[0]?.text);
      return bottomText.join(" · ");
    },
  },
  mounted() {
    // console.log("Compact videoRenderer received: " + JSON.stringify(this.video));
  },
};
</script>
