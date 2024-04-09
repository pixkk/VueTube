<template>
  <base-video-renderer
    :vidId="vidIdValue"
    :thumbnails="thumbnailSources"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :thumbnailOverlayText="thumbnailOverlayText"
    :channelUrl="
      this.$rendererUtils.getNavigationEndpoints(canonicalBaseUrl)
    "
    :channelIcon="video?.videoData ? video.videoData.avatar.image.sources[0].url : null"
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
    thumbnailOverlayText() {
      return this.video?.videoData
        ? this.video.videoData.thumbnail?.timestampText
        : this.video?.lengthText?.runs[0]?.text;
    },
    thumbnailOverlayStyle() {
      return this.video?.videoData ? this.video.videoData.thumbnail?.timestampStyle : null;
    },
    thumbnailSources() {
      return this.video?.videoData ? this.video.videoData.thumbnail?.image.sources : this.video?.thumbnail?.thumbnails;
    },
    canonicalBaseUrl() {
      // console.log(this.video);
      return this.video?.videoData ? this.video.videoData.avatar.endpoint.innertubeCommand.canonicalBaseUrl : "https://youtube.com/watch?v=" + this.video?.videoId;
    },
    vidIdValue() {
      return this.video?.videoData ? this.video.videoData.dragAndDropUrl.split("?v=")[1] : this.video?.videoId;
    },
  },

  methods: {
    parseBottom(video) {
      const bottomText = [
        // video?.videoData ? video.videoData.metadata.title : video?.title?.runs[0]?.text,
        video?.videoData ? video.videoData.metadata.metadataDetails : video?.shortViewCountText?.runs[0]?.text,
      ];
      if (video?.videoData ? video.videoData.publishedTimeText?.runs[0].text : video?.publishedTimeText?.runs[0]?.text)
        bottomText.push(video?.videoData ? video.videoData.publishedTimeText?.runs[0].text : video?.publishedTimeText?.runs[0]?.text);
      return bottomText.join(" · ");
    },
  },
  mounted() {
    console.log("Compact videoRenderer received: " + this.video);
  },
};
</script>
