<template>
  <div>
    <video
      ref="playerfake"
      muted
      autoplay
      style="display: none"
    />
    <!-- Scrubber wrapper: pointer-events:none so buttons below are reachable;
         the v-slider itself has pointer-events:auto and handles all drag input. -->
    <div
      :class="!controls && !fullscreen && !isScrubbing ? 'invisible' : ''"
      style="position: absolute; z-index: 10000; overflow: visible; pointer-events: none;"
      :style="
        fullscreen
          ? 'width: 100%; left: 0; bottom: 55px; height: 3rem;'
          : 'width: 100%; left: 0; bottom: -0.875rem; height: 3rem;'
      "
    >
      <!-- Buffer indicator -->
      <div
        style="position: absolute; bottom: 13px; left: 0; height: 4px; border-radius: 2px; pointer-events: none; background: rgba(255,255,255,0.28); transition: width 0.3s linear;"
        :style="{ width: `${buffered || 0}%` }"
      />
      <!-- Played progress (drawn here so it sits below segments; v-slider fill is hidden via CSS) -->
      <div
        style="position: absolute; bottom: 13px; left: 0; height: 4px; border-radius: 2px; pointer-events: none; transition: width 0.05s linear;"
        :style="{ width: `${duration > 0 ? ((isScrubbing ? scrubValue : currentTime) / duration) * 100 : 0}%`, background: 'rgb(var(--v-theme-primary))' }"
      />
      <!-- Sponsorblock segments — above played bar, below thumb (DOM order ensures thumb wins) -->
      <div
        v-if="blocks && blocks.segments"
        style="position: absolute; bottom: 13px; left: 0; right: 0; height: 4px;"
      >
        <sponsorblock :blocks="blocks" :duration="duration" />
      </div>
    <!-- Scrubber — last in DOM so the thumb paints above segments -->
    <v-slider
      id="scrubber"
      hide-details
      density="compact"
      :disabled="disabled"
      color="transparent"
      thumb-color="primary"
      track-color="transparent"
      style="width: 100%; position: absolute; bottom: 0; pointer-events: auto;"
      :thumb-size="isScrubbing ? 16 : 12"
      :max="duration"
      :model-value="isScrubbing ? scrubValue : currentTime"
      @start="startScrubbing"
      @end="endScrubbing"
      @update:modelValue="onScrubMove"
    >
      <!--    Fast preview-->
      <template #thumb-label="{ value }">
        <div style="transform: translateY(-50%)">
          <canvas
            ref="preview"
            class="white"
            :width="video.clientWidth / 3"
            :height="video.clientHeight / 3"
            style="border: 2px solid white"
            :style="{
              borderRadius: $store.state.tweaks.roundWatch
                ? `${$store.state.tweaks.roundTweak / 3}rem`
                : '0',
            }"
          ></canvas>
          <div class="text-center pb-4" style="font-size: 0.8rem">
            <b v-if="seeking">{{ $vuetube.humanTime(value) }}</b>
          </div>
        </div>
      </template>
    </v-slider>
    </div>
  </div>
</template>
<style>

.v-input__control {
  margin: 0 !important;
}

/* Hide v-slider's built-in fill — we draw our own below the segments */
#scrubber .v-slider-track__fill {
  background: transparent !important;
}

</style>
<script>
import sponsorblock from "~/components/Player/sponsorblock.vue";

export default {
  components: { sponsorblock },
  props: {
    video: {},
    controls: {},
    fullscreen: {
      type: Boolean,
      required: true,
    },
    sources: {
      type: Array,
      required: true,
    },
    currentTime: {},
    duration: {
      type: Number,
      required: true,
    },
    seeking: {
      type: Boolean,
      required: true,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    storyboards: {
      default: null
    },
    buffered: {
      type: Number,
      default: 0,
    },
    blocks: {
      default: null,
    },
  },
  emits: ["scrub", "seeking"],
  data: () => ({
    vidWrs: "",
    isScrubbing: false,
    scrubValue: 0,
  }),
  mounted() {
    if (this.sources && this.sources[0]) {
      this.vidWrs = this.sources[0].url;
    }
  },
  methods: {
    startScrubbing(v) {
      this.scrubValue = this.currentTime;
      this.isScrubbing = true;
      this.$emit('seeking');
    },
    endScrubbing(v) {
      this.isScrubbing = false;
      this.$emit('scrub', v);
      this.$emit('seeking');
    },
    onScrubMove(v) {
      if (this.isScrubbing) {
        this.scrubValue = v;
        this.seek(v);
      }
    },
    fastPreviewGetFrame(returnType, spec, videoLength) {
      let storyboardArray = [];
      let storyBoardUrl = spec.split("|");
      const E = storyBoardUrl[0];
      for (let k = 1; k < storyBoardUrl.length; k++) {
        const f = this.X(k - 1, E, storyBoardUrl[k], videoLength);
        (f.videoLength || f.height < 180) && storyboardArray.push(f)
      }
      if (returnType === "url") {
        return storyboardArray;
      }
    },
    X(r, K, T, E) {
      r = T.split("#");

      return {
        level: r,
        yC: K,
        loaded: new Set(),

        width: Math.floor(Number(r[0])),
        height: Math.floor(Number(r[1])),
        frameCount: Math.floor(Number(r[2])),
        columns: Math.floor(Number(r[3])),
        rows: Math.floor(Number(r[4])),
        D: Math.floor(Number(r[5])),
        B: r[6],
        signature: r[7],
        videoLength: E
      };
    },
    i3(r, K) {
      return Math.floor(K / (r.columns * r.rows))
    },
    EM(r, yC, B, level, signature) {
      let K = yC;
      K = K.replace("$N", B);
      K = K.replace("$L", level.toString());
      K = K.replace("$M", r.toString());
      signature && (K = gDu(K, {
        sigh: signature
      }));
      return Kt(K)
    },
    gDu(r, K) {
      K = gAu(K);
      return Yo(r, K)
    },
    gAu(r) {
      const K = [];
      for (const T in r)
        Ne(T, r[T], K);
      return K.join("&")
    },
    Yo(r, K) {
      if (!K)
        return r;
      var T = r.indexOf("#");
      T < 0 && (T = r.length);
      let E = r.indexOf("?"), k;
      E < 0 || E > T ? (E = T,
        k = "") : k = r.substring(E + 1, T);
      r = [r.slice(0, E), k, r.slice(T)];
      T = r[1];
      r[1] = K ? T ? T + "&" + K : K : T;
      return r[0] + (r[1] ? "?" + r[1] : "") + r[2]
    },
    fastPreviewGetFrame2(returnType, spec, hq, seconds) {
      let specParts = spec.split('|');
      let baseUrlHq = specParts[0].split('$')[0] + '2/';
      let baseUrlLq = specParts[0].split('$')[0] + '1/';
      let sgpPart = specParts[0].split('$N')[1];

      let sighPartHq;
      let sighPartLq;

      if (specParts.length === 3) {
        sighPartHq = specParts[2].split('M#')[1];
        sighPartLq = specParts[1].split('M#')[1];
      } else if (specParts.length === 2) {
        sighPartHq = specParts[1].split('t#')[1];
        // sighPartLq = specParts[0].split('M#')[1];

      } else {
        sighPartHq = specParts[3].split('M#')[1];
        sighPartLq = specParts[2].split('M#')[1];
      }

      let amountOfBoards = 0;
      let division = 25;

      let storyboardArray = [];

      if (hq === false) {
        division = 100
      } /* More frames per image in the case of LQ */

      if (seconds < 250) {
        amountOfBoards = Math.ceil((seconds / 2) / division);
      } else if (seconds > 250 && seconds < 1000) {
        amountOfBoards = Math.ceil((seconds / 4) / division);
      } else if (seconds > 1000) {
        amountOfBoards = Math.ceil((seconds / 10) / division);
      }

      if (hq === true) { /* High quality storyboard */
        for (let i = 0; i < amountOfBoards; i++) {
          storyboardArray.push(baseUrlHq + 'M' + i + sgpPart + '&sigh=' + sighPartHq)
        }
      } else { /* Low quality storyboard */
        for (let i = 0; i < amountOfBoards; i++) {
          storyboardArray.push(baseUrlLq + 'M' + i + sgpPart + '&sigh=' + sighPartLq)
        }
      }

      if (returnType === "url") {
        return storyboardArray;
      } else if (returnType === "parts") {
        let obj = {
          firstPart: `${baseUrlHq}M`,
          secondPart: `${sgpPart}&sigh=${sighPartHq}`
        }
        return obj;
      } else if (returnType === "keys") {
        let obj = {
          sgp: sgpPart.slice(9),
          sigh: sighPartHq
        }

        return obj;
      }
      else {
        return {
          url: storyboardArray,
          parts: {
            firstPart: `${baseUrlHq}M`,
            secondPart: `${sgpPart}&sigh=${sighPartHq}`
          },
          keys: {
            sgp: sgpPart.slice(9),
            sigh: sighPartHq
          }
        }
      }

    },
    seek(e) {
      if (!this.storyboards) return;
      console.log(`scrubbing ${e}`);
      console.warn(this.storyboards)
      // let vid = this.$refs.playerfake;
      let vid = this.fastPreviewGetFrame2("url", this.storyboards, true, this.duration)
      // getTimeline({ storyboards, quality: 'medium', quantity: 5 }),
      // export const getTimeline = (params: {
      //   storyboards: Storyboards
      //   quality: StoryboardQuality
      //   quantity?: number
      // }) => {
      //   params.quantity = params.quantity || 5
      //
      //   const storyboardArray = getStoryboards(params.storyboards)
      //
      //   return Object.entries(qualityEnum).reduce((acc, [key, value]) => {
      //     return {
      //       ...acc,
      //       // @ts-expect-error
      //       [key]: getFramesDetails(params.quantity, storyboardArray[value]),
      //     }
      //   }, {} as Record<StoryboardQuality, ReturnType<typeof getFramesDetails>>)
      // }

      // function getStoryboards(storyboards?: Storyboards) {
    //   const parts = storyboards?.playerStoryboardSpecRenderer?.spec?.split('|')
    //   if (!parts) return []
    //
    //   const url = new URL(parts.shift() ?? '')
    //
    //   return parts.map((part, i) => {
    //     const [
    //       thumbnailWidth,
    //       thumbnailHeight,
    //       thumbnailCount_s,
    //       columns_s,
    //       rows_s,
    //       interval,
    //       nameReplacement,
    //       sigh,
    //     ] = part.split('#')
    //
    //     url.searchParams.set('sigh', sigh)
    //
    //     const thumbnailCount = parseInt(thumbnailCount_s, 10)
    //     const columns = parseInt(columns_s, 10)
    //     const rows = parseInt(rows_s, 10)
    //
    //     const storyboardCount = Math.ceil(thumbnailCount / (columns * rows))
    //
    //     return {
    //       templateUrl: url
    //         .toString()
    //         .replace('$L', i.toString())
    //         .replace('$N', nameReplacement),
    //       url: url.toJSON(),
    //       thumbnailWidth: parseInt(thumbnailWidth, 10),
    //       thumbnailHeight: parseInt(thumbnailHeight, 10),
    //       thumbnailCount,
    //       interval: parseInt(interval, 10),
    //       columns,
    //       rows,
    //       storyboardCount,
    //     }
    //   })
    // }

      // const getFramesDetails = (
      //   quantity: number,
      //   slot: ReturnType<typeof getStoryboards>[number]
      // ) => {
      //   const COUNT = 5
      //   const MAX_COUNT = 25
      //
      //   const selectedFrames = evenlyDistributedElements(
      //     Array.from({ length: slot.thumbnailCount }).map((_, i) => i),
      //     quantity
      //   )
      //
      //   return {
      //     slot,
      //     frames: selectedFrames.map((frameIndex, i) => {
      //       const storyboardIndex = Math.floor(frameIndex / MAX_COUNT)
      //       const url = slot.templateUrl.replace('$M', String(storyboardIndex))
      //
      //       const maxCount = MAX_COUNT * (i + 1)
      //       const lookupCount =
      //         maxCount > slot.thumbnailCount
      //           ? slot.thumbnailCount - MAX_COUNT * i
      //           : MAX_COUNT
      //       const cords = getMaxRowsAndCols(lookupCount, COUNT)
      //
      //       return {
      //         url,
      //         thumbnailCount: lookupCount,
      //         width: slot.thumbnailWidth * slot.columns,
      //         height: slot.thumbnailHeight * cords.rows,
      //         ...cords,
      //       }
      //     }),
      //   }
      // }
    // let vid = this.fastPreviewGetFrame("url", this.storyboards, this.video.duration)
      console.error(vid)
      let partSize = this.duration / vid.length;
      // console.warn(partSize)
      // console.warn(e / partSize)
      let index = Math.ceil(e / partSize);
      console.warn(index)

      // console.warn(vid)
      let img = new Image;
      // img.src = vid[index !== 0 ? index-1 : 0];

      let canvas = this.$refs.preview;
      this.$refs.playerfake.currentTime = e;
      this.extractFrame(vid[index !== 0 ? index - 1 : 0], Math.floor((e / 25) % 25)).then((r) => {
        img.src = r;
        // console.warn(img)
        canvas
          .getContext("2d")
          .drawImage(
            img,
            0,
            0,
            this.video.clientWidth / 3,
            this.video.clientHeight / 3
          );
      });


    },
    extractFrame(spriteUrl, frameIndex) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const cols = 5;
          const rows = 5;
          const frameW = img.width / cols;
          const frameH = img.height / rows;
          const sx = (frameIndex % cols) * frameW;
          const sy = Math.floor(frameIndex / cols) * frameH;

          const canvas = document.createElement("canvas");
          canvas.width = frameW;
          canvas.height = frameH;
          canvas.getContext("2d").drawImage(img, sx, sy, frameW, frameH, 0, 0, frameW, frameH);

          resolve(canvas.toDataURL("image/jpeg"));
        };
        img.onerror = reject;
        img.src = spriteUrl;
      });
    }

// TODO: better scrubbing preview start
    // loadVideoFrames() {
    //   // Exit loop if desired number of frames have been extracted
    //   if (this.frames.length >= frameCount) {
    //     this.visibleFrame = 0;

    //     // Append all canvases to container div
    //     this.frames.forEach((frame) => {
    //       this.frameContainerElement.appendChild(frame);
    //     });
    //     return;
    //   }

    //   // If extraction hasn’t started, set desired time for first frame
    //   if (this.frames.length === 0) {
    //     this.requestedTime = 0;
    //   } else {
    //     this.requestedTime = this.requestedTime + this.frameTimestep;
    //   }

    //   // Send seek request to video player for the next frame.
    //   this.videoElement.currentTime = this.requestedTime;
    // },
    // extractFrame(videoWidth, videoHeight) {
    //   // Create DOM canvas object
    //   var canvas = document.createElement("canvas");
    //   canvas.className = "video-scrubber-frame";
    //   canvas.height = videoHeight;
    //   canvas.width = videoWidth;

    //   // Copy current frame to canvas
    //   var context = canvas.getContext("2d");
    //   context.drawImage(this.videoElement, 0, 0, videoWidth, videoHeight);
    //   this.frames.push(canvas);

    //   //  Load the next frame
    //   loadVideoFrames();
    // },
    // async extractFramesFromVideo(videoUrl, fps = 25) {
    //   // fully download it first (no buffering):
    //   console.log(videoUrl);
    //   console.log(fps);
    //   let videoBlob = await fetch(videoUrl, {
    //     headers: { range: "bytes=0-567139" },
    //   }).then((r) => r.blob());
    //   console.log(videoBlob);
    //   let videoObjectUrl = URL.createObjectURL(videoBlob);
    //   let video = document.createElement("video");

    //   let seekResolve;
    //   video.addEventListener("seeked", async function () {
    //     if (seekResolve) seekResolve();
    //   });

    //   video.src = videoObjectUrl;

    //   // workaround chromium metadata bug (https://stackoverflow.com/q/38062864/993683)
    //   while (
    //     (video.duration === Infinity || isNaN(video.duration)) &&
    //     video.readyState < 2
    //   ) {
    //     await new Promise((r) => setTimeout(r, 1000));
    //     video.currentTime = 10000000 * Math.random();
    //   }
    //   let duration = video.duration;

    //   let canvas = document.createElement("canvas");
    //   let context = canvas.getContext("2d");
    //   let [w, h] = [video.videoWidth, video.videoHeight];
    //   canvas.width = w;
    //   canvas.height = h;

    //   let interval = 1;
    //   let currentTime = 0;

    //   while (currentTime < duration) {
    //     video.currentTime = currentTime;
    //     await new Promise((r) => (seekResolve = r));

    //     context.drawImage(video, 0, 0, w, h);
    //     let base64ImageData = canvas.toDataURL();
    //     console.log(base64ImageData);
    //     this.frames.push(base64ImageData);

    //     currentTime += interval;
    //   }
    //   console.log("%c frames", "color: #00ff00");
    //   console.log(this.frames);
    // },
    // TODO: scrubbing preview end
  },
};
</script>
