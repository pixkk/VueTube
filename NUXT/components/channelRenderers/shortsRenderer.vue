<template>
  <base-video-renderer
    :vidId="vidIdValue"
    :thumbnails="thumbnailSources"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :thumbnailOverlayText="thumbnailOverlayText"
    :channelUrl="
      this.$rendererUtils.getNavigationEndpoints(reelWatchEndpoint)
    "
    :channelIcon="channelIcon"
    :titles="parseBottom(shorts)"
    :bottomText="shorts.overlayMetadata.secondaryText.content"
    :thumbnailAutoWidth="true"
  >
  </base-video-renderer>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";

export default {
  props: ["shorts"],

  components: {
    baseVideoRenderer,
  },

  computed: {
    channelIcon() {
      return null;
    },
    thumbnailOverlayText() {
      return "Shorts";
    },
    thumbnailOverlayStyle() {
      let text = "SHORTS";
      return text!== "-" ? text : "DEFAULT";
    },
    thumbnailSources() {
      return this.reelWatchEndpoint.reelWatchEndpoint.thumbnail.thumbnails || this.shorts?.thumbnail.sources
    },
    reelWatchEndpoint() {
      return this.shorts?.onTap.innertubeCommand;
    },
    vidIdValue() {
      return this.reelWatchEndpoint.reelWatchEndpoint.videoId
    },
  },

  methods: {
    parseBottom(shorts) {
      return shorts.overlayMetadata.primaryText.content;
    },
  },
  mounted() {

  },
};
</script>
