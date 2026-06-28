<template>
  <base-video-renderer
    :vidId="videoId"
    :thumbnails="thumbnails"
    :thumbnailOverlayText="thumbnailOverlayText"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :channelUrl="null"
    :channelIcon="null"
    :titles="[{ text: title }]"
    :bottomText="bottomText"
    @click.native="onTileClick"
  />
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";

export default {
  props: ["video"],

  components: { baseVideoRenderer },

  computed: {
    videoId() {
      return this.video.contentId || this.video.onSelectCommand?.watchEndpoint?.videoId || "";
    },

    thumbnails() {
      return this.video.header?.tileHeaderRenderer?.thumbnail?.thumbnails || [];
    },

    thumbnailOverlayText() {
      const overlays = this.video.header?.tileHeaderRenderer?.thumbnailOverlays || [];
      const overlay = overlays.find((o) => o.thumbnailOverlayTimeStatusRenderer);
      return overlay?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "-";
    },

    thumbnailOverlayStyle() {
      const overlays = this.video.header?.tileHeaderRenderer?.thumbnailOverlays || [];
      const overlay = overlays.find((o) => o.thumbnailOverlayTimeStatusRenderer);
      return overlay?.thumbnailOverlayTimeStatusRenderer?.style || "DEFAULT";
    },

    title() {
      return this.video.metadata?.tileMetadataRenderer?.title?.simpleText || "";
    },

    bottomText() {
      const lines = this.video.metadata?.tileMetadataRenderer?.lines || [];
      // console.warn(lines)
      const parts = lines
        .map((line) =>
          (line.lineRenderer?.items || [])
            .map((i) =>
              i.lineItemRenderer?.text?.runs?.[0]?.text ||
              i.lineItemRenderer?.text?.simpleText ||
              ""
            )
            .filter((t) => t && t !== "•")
            .join(" · ")
        )
        .filter(Boolean);
      return parts.join(" · ");
    },

  },

  methods: {
    onTileClick() {
      const params = this.video.onSelectCommand?.watchEndpoint?.params || null;
      this.$store.commit("setPendingTvParams", params);
    },
  },
};
</script>
