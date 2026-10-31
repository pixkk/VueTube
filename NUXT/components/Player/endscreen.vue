<template>
  <div ref="rootOfEndscreen" style="position: absolute; pointer-events: none; z-index: 21;" :style="{
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  }">
    <div :style="{
    width: rect.width + 'px',
    height: rect.height + 'px',
  }">
      <template v-if="endscreen?.endscreenRenderer?.elements">
      <div v-for="element in endscreen?.endscreenRenderer?.elements"
      >
        <div :style="{
        ...calculatePosition(element),
        width: calculateWidth(element),
        height: calculateHeight(element),
        position: 'absolute',
        pointerEvents: 'auto',
        cursor: 'pointer',
        display: parseFloat(element.endscreenElementRenderer.startMs) <= currentTime * 1000 && parseFloat(element.endscreenElementRenderer.endMs) >= currentTime * 1000 ? 'block' : 'none',
      }" @click.stop="openElement(element.endscreenElementRenderer)">
          <v-img cover :src="element.endscreenElementRenderer?.image?.thumbnails[element.endscreenElementRenderer?.image?.thumbnails.length - 1]?.url"
                 :style="getStyleOfEndscreenElement(element.endscreenElementRenderer?.style)"

          />
          <div v-if="getDuration(element.endscreenElementRenderer)"
               style="position: absolute; right: 4px; bottom: 4px; padding: 1px 4px; border-radius: 4px; background: rgba(0, 0, 0, 0.8); color: #fff; font-size: 12px; line-height: 1.3; font-weight: 500;">
            {{ getDuration(element.endscreenElementRenderer) }}
          </div>
        </div>
        <!--      </div>-->
      </div>
      </template>
    </div>


  </div>
</template>
<script>
export default {
  props: {
    endscreen: {
      required: true,
    },
    videoWidth: {
      required: true,
    },
    videoHeight: {
      required: true,
    },
    isFullscreen: {
      required: true,
    },
    currentTime: {
      required: true,
    },
    playerObject: {
      required: true,
    }
  },
  emits: ["exit-fullscreen"],
  data: () => ({
    temp: [
      {
        test: "",
      },
    ],
    rect: {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    },
    resizeObserver: null,
  }),
  mounted() {
    this.updateRect();
    this.updatePlayerStyles();
    this.playerObject.addEventListener('timeupdate', this.updatePlayerStyles);
    this.playerObject.addEventListener('seeking', this.updatePlayerStyles);
    this.playerObject.addEventListener('seeked', this.updatePlayerStyles);
    window.addEventListener('resize', this.updateRect);
    screen.orientation?.addEventListener('change', this.updateRect);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.updateRect);
      this.resizeObserver.observe(this.playerObject);
      if (this.$el.parentElement) this.resizeObserver.observe(this.$el.parentElement);
    }
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.updateRect);
    screen.orientation?.removeEventListener('change', this.updateRect);
    this.resizeObserver?.disconnect();
    this.playerObject.removeEventListener('timeupdate', this.updatePlayerStyles);
    this.playerObject.removeEventListener('seeking', this.updatePlayerStyles);
    this.playerObject.removeEventListener('seeked', this.updatePlayerStyles);
    this.restoreBrightness();
  },
  watch: {
    endscreen() {
      this.updatePlayerStyles();
    },
    isFullscreen() {
      this.$nextTick(this.updateRect);
    },
    videoWidth() {
      this.updateRect();
    },
    videoHeight() {
      this.updateRect();
    },
  },
  methods: {
    updateRect() {
      const video = this.playerObject;
      const parent = this.$el?.parentElement;
      if (!video || !parent || !this.videoWidth || !this.videoHeight) return;
      const box = video.getBoundingClientRect();
      const parentBox = parent.getBoundingClientRect();
      const fit = getComputedStyle(video).objectFit;
      const scaleX = box.width / this.videoWidth;
      const scaleY = box.height / this.videoHeight;
      const scale = fit === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);
      const width = this.videoWidth * scale;
      const height = this.videoHeight * scale;
      this.rect = {
        left: box.left - parentBox.left + (box.width - width) / 2,
        top: box.top - parentBox.top + (box.height - height) / 2,
        width,
        height,
      };
    },
    getWidth() {
      return this.rect.width;
    },
    getHeight() {
      return this.rect.height;
    },
    calculatePosition(element) {
      if (!element.endscreenElementRenderer) return {};
      const { left, top } = element.endscreenElementRenderer;
      return {
        left: `${left * this.getWidth()}px`,
        top: `${top * this.getHeight()}px`,
      };
    },
    calculateWidth(element) {
      if (!element.endscreenElementRenderer) return '0px';
      const { width } = element.endscreenElementRenderer;
      return `${width * this.getWidth()}px`;
    },
    calculateHeight(element) {
      if (!element.endscreenElementRenderer) return '0px';
      const { width, aspectRatio } = element.endscreenElementRenderer;
      const height = width / aspectRatio;
      return `${height * this.getWidth()}px`;
    },
    openElement(renderer) {
      const endpoint = renderer?.endpoint;
      const watch = endpoint?.watchEndpoint;
      const channelId = endpoint?.browseEndpoint?.browseId;
      const url = endpoint?.urlEndpoint?.url;
      if (watch?.videoId) {
        const list = watch.playlistId ? `&list=${watch.playlistId}` : "";
        this.$router.push(`/watch?v=${watch.videoId}${list}`);
      } else if (channelId) {
        this.$emit("exit-fullscreen");
        this.$store.dispatch("channel/fetchChannel", channelId);
        this.$router.push("/channel");
      } else if (url) {
        window.open(url, "_blank");
      }
    },
    isEndscreenActive() {
      const renderer = this.endscreen?.endscreenRenderer;
      if (!renderer?.elements?.length) return false;
      const ms = this.playerObject.currentTime * 1000;
      const end = Math.max(
        ...renderer.elements.map((e) => parseFloat(e.endscreenElementRenderer?.endMs) || 0)
      );
      return parseFloat(renderer.startMs) <= ms && ms <= end;
    },
    updatePlayerStyles() {
      if (!this.playerObject) return;
      if (this.isEndscreenActive()) {
        this.playerObject.style.filter = "brightness(50%)";
      } else {
        this.restoreBrightness();
      }
    },
    restoreBrightness() {
      if (!this.playerObject) return;
      // empty inline filter lets the .dim classes of the player apply again
      const saved = parseFloat(localStorage.getItem("brightness"));
      this.playerObject.style.filter = saved >= 0 && saved !== 1 ? `brightness(${saved})` : "";
    },
    getDuration(renderer) {
      return renderer?.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || "";
    },
    getStyleOfEndscreenElement(style) {
      if (!style) return {};
      if (style.toLowerCase() === "channel") {
        return {
          borderRadius: '50%',
        };
      } else if (style.toLowerCase() == "image") {

      }
    },
  }
};
</script>
<style>

</style>
