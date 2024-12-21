<template>
  <div ref="rootOfEndscreen" class="d-flex justify-space-between" style="border-radius: 1px; position: absolute; left: 50%; transform: translate(-50%, -60%); " id="ttttttttttt" :style="{
    maxHeight: '50vh',
    width: isFullscreen ? '100%' : 'fit-content',
    height: isFullscreen ? '100%' : 'fit-content',
    top: isFullscreen ? '' : (isLandscape ? '50%' : '0'),
    transform: isFullscreen ? (isLandscape ? 'translate(-50%, -60%)' : 'translate(-50%, 15%)') : (isLandscape ? 'translate(-50%, -50%)' : 'translate(-50%, 0px)') ,

  }">
    <div :style="{
    maxHeight: '50vh',
    width: getWidth() + 'px',
    height: getHeight() + 'px',
  }">
      <div v-if="endscreen?.endscreenRenderer?.elements" v-for="element in endscreen?.endscreenRenderer?.elements"
      >
        {{updatePlayerStyles}}
        <div :style="{
        ...calculatePosition(element),
        width: calculateWidth(element),
        height: calculateHeight(element),
        position: 'absolute',
        display: parseFloat(element.endscreenElementRenderer.startMs) <= currentTime * 1000 && parseFloat(element.endscreenElementRenderer.endMs) >= currentTime * 1000 ? 'block' : 'none',
      }" >
          <v-img :src="element.endscreenElementRenderer?.image?.thumbnails[element.endscreenElementRenderer?.image?.thumbnails.length - 1]?.url"
                 :style="getStyleOfEndscreenElement(element.endscreenElementRenderer?.style)"

          />
        </div>
        <!--      </div>-->
      </div>
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
    videoBlockWidth: {
      required: true,
    },
    videoBlockHeight: {
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
  data: () => ({
    temp: [
      {
        test: "",
      },
    ],
    isLandscape: false,
    isEndscreenStarted: false,
    rootDimensions: {
      width: 0,
      height: 0,
    },
  }),
  mounted() {
    this.updateRootDimensions(screen.orientation.type);
    window.addEventListener('resize', this.updateRootDimensions);
    screen.orientation.addEventListener('change', (e)=> {

      this.updateRootDimensions(e.currentTarget.type);
    })

  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateRootDimensions);
  },
  methods: {
    updateRootDimensions(type) {

      if (type === 'landscape-primary') {
        this.isLandscape = true;
      } else if (type === 'portrait-primary') {
        this.isLandscape = false;
      }
      const root = this.$refs.rootOfEndscreen;
      // if ((this.videoWidth / this.videoHeight).toFixed(2) === (root.offsetWidth / root.offsetHeight).toFixed(2)) {
        if (root) {
          if (this.isFullscreen && this.isLandscape) {
            this.rootDimensions.width = window.screen.width;
            this.rootDimensions.height = window.screen.height;
          }
          else {
            this.rootDimensions.width = this.videoBlockWidth;
            this.rootDimensions.height = this.videoBlockHeight;
          }
        }
      // }
    },
    getWidth() {
      if (this.isFullscreen) {
        if (this.isLandscape) {
          return window.screen.width;
        }
        return this.videoWidth * this.rootDimensions.height / this.videoHeight;
      }
      return this.videoWidth * this.rootDimensions.height / this.videoHeight;
    },
    getHeight() {
      if (this.isFullscreen) {
        if (this.isLandscape) {
          return window.screen.height;
        }
        return this.rootDimensions.height;
      }
      return this.rootDimensions.height;
    },
    calculatePosition(element) {
      if (!element.endscreenElementRenderer) return {};
      const { left, top } = element.endscreenElementRenderer;
      return {
        marginLeft: `${left * this.getWidth()}px`,
        marginTop: `${top * this.getHeight()}px`,
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
    updatePlayerStyles() {
      if (this.endscreen.endscreenRenderer.startMs > this.currentTime * 1000) {
        this.playerObject.style.filter = "brightness(" + parseFloat(localStorage.getItem("brightness")) || 1 + ")";
      }
      else {
        this.playerObject.style.filter = `brightness(50%)`;
      }
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
