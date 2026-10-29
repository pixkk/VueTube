<template>
  <!-- // TODO: down: () => minimize, -->
  <div
    ref="vidcontainer"
    class="d-flex flex-column bg-black justify-center"
    style="position: relative"
    :style="{
      width: 'auto',
      height: isFullscreen ? '100vh' : 'auto',
      maxHeight: isFullscreen ? '' : '50vh',
      // paddingTop: isFullscreen && !verticalFullscreen ? '' : 'env(safe-area-inset-top)',
      borderRadius:
        $store.state.tweaks.roundWatch && !isFullscreen
          ? `${$store.state.tweaks.roundTweak / 3}rem ${
              $store.state.tweaks.roundTweak / 3
            }rem 0rem 0rem !important`
          : '0',
    }"
  >
      <div style="position: relative; width: 100%;" :style="{ height: '100%' }">
      <video
        :autoplay="true"
        playsinline
        webkit-playsinline
        ref="player"
        v-touch="{
        up: () => {
          if (!isFullscreen) fullscreenHandler(true);
          else if (verticalFullscreen) shortNext();
        },
        down: () => {
          if (isFullscreen) fullscreenHandler(true);
        },
      }"
        mediagroup="vuetubecute"
        width="100%"
        :src="hls || dash ? '' : vidSrc"
        style="transition: filter 0.15s ease-in-out, transform 0.15s linear; vertical-align: middled;"
        :height="isFullscreen ? '100%' : 'auto'"
        :class="
        controls ||
        seeking ||
        skipping ||
        ($store.state.player.preload && buffered < 100)
          ? verticalFullscreen &&
            !($store.state.player.preload && buffered < 100)
            ? 'dim-ish'
            : 'dim'
          : ''
      "
        :style="{
        transform: shortTransition ? 'translateY(-100%)' : '',
        objectFit: contain ? 'contain' : 'cover',
        maxHeight: isFullscreen ? '' : '50vh',
        borderRadius:
          $store.state.tweaks.roundWatch && !isFullscreen
            ? `${$store.state.tweaks.roundTweak / 3}rem ${
                $store.state.tweaks.roundTweak / 3
              }rem 0rem 0rem !important`
            : '0',
      }"
        :poster="poster"
        id="playerVideo"
        @loadedmetadata="checkDimensions()"
        @click="controlsHandler()"
        @error="videoErrorHandler"
      ></video>

      <div
        v-if="customCaptionHtml"
        class="custom-captions-overlay"
        ref="captionsOverlay"
        :class="{ 'with-seekbar': controls || seeking }"
        :style="{ '--seekbar-reserve': captionsReserve + 'px' }"
        v-html="customCaptionHtml"
      ></div>
      </div>

      <endscreen
        v-if="$refs.player?.videoHeight && isFullscreen"
        ref="endscrn"
        :endscreen="video.endscreen"
        :isFullscreen="isFullscreen"
        :video-height="$refs.player.videoHeight"
        :video-width="$refs.player.videoWidth"
        :current-time="$refs.player.currentTime"
        :player-object="$refs.player"
        @exit-fullscreen="exitFullscreen"
      />


    <div style="position: absolute; right: 0%; margin-right: 1rem; bottom: 20%; z-index: 99999">
      <button id="skipButton"
              ref="skipButton" class="skip-button"
              :style="{
      display: isSegment ? 'block' : 'none',
    }"

      >Skip {{ sBblockCategoryText }}</button>
    </div>


    <!-- // TODO: merge the bottom 2 into 1 reusable component -->
    <v-btn
      elevation="0"
      v-touch="{
        up: () => {
          if (!isFullscreen) fullscreenHandler(true);
          else if (verticalFullscreen) shortNext();
        },
        down: () => {
          if (isFullscreen) fullscreenHandler(true);
        },
        right: () => (contain = true),
        left: () => (contain = false),
      }"
      variant="text"
      rounded="0"
      color="white"
      :class="skipping == -10 ? '' : 'invisible'"
      style="
        top: 0;
        left: 0;
        width: 50%;
        height: 100%;
        position: absolute;
        transition: opacity 0.15s;
        border-radius: 0 100vh 100vh 0;
        text-transform: none;
        font-size: 0.5rem;
      "
      @click="controlsHandler()"
      @dblclick="skipHandler(-10)"
    >
      <v-icon>mdi-rewind</v-icon>
      <!-- {{ skipping }} seconds -->
    </v-btn>

    <v-btn
      elevation="0"
      v-touch="{
        up: () => {
          if (!isFullscreen) fullscreenHandler(true);
          else if (verticalFullscreen) shortNext();
        },
        down: () => {
          if (isFullscreen) fullscreenHandler(true);
        },
        right: () => (contain = false),
        left: () => (contain = true),
      }"
      variant="text"
      rounded="0"
      color="white"
      :class="skipping == 10 ? '' : 'invisible'"
      style="
        top: 0;
        left: 50%;
        width: 50%;
        height: 100%;
        position: absolute;
        transition: opacity 0.15s;
        border-radius: 100vh 0 0 100vh;
        text-transform: none;
        font-size: 0.5rem;
      "
      @click="controlsHandler()"
      @dblclick="skipHandler(10)"
    >
      <v-icon>mdi-fast-forward</v-icon>
      <!-- {{ skipping }} seconds] -->
    </v-btn>

    <div
      v-if="seeking"
      class="d-flex justify-center"
      style="width: 100%; top: 0.5rem; position: absolute; font-size: 0.66rem"
    >
      <v-icon size="small" class="pr-2">mdi-rewind</v-icon>
      Double tap left or right to skip 10 seconds
      <v-icon size="small" class="pl-2">mdi-fast-forward</v-icon>
    </div>

    <!-- controls container: covers full player area with z-index 20.
         Seekbar (z-index 30) sits above this but only in the bottom 3rem strip. -->
    <div
      v-if="$refs.player && $refs.player.currentSrc"
      class="player-controls-overlay"
      style="transition: opacity 0.15s ease-in-out; position: absolute; width: 100%; height: 100%; z-index: 20;"
      :style="
        controls && !seeking
          ? 'opacity: 1; pointer-events: auto;'
          : 'opacity: 0; pointer-events: none;'
      "
      @click.self="controlsHandler()"
    >
      <!-- top controls row -->
      <div
        style="width: 100%; margin-top: 0.5rem; filter: drop-shadow(0 0 0.5rem #000)"
        class="d-flex justify-center px-2"
      >
        <minimize />
        <div v-if="isFullscreen" class="pt-2" @click.self="controlsHandler()">
          <h4 style="color: #ffffff">{{ video.title }}</h4>
          <div style="color: #aaa; font-size: 0.75rem">
            {{ video.channelName }}
          </div>
        </div>
        <v-spacer />
        <settings
          v-if="$refs.player"
          class="mx-2"
          @volumeHandler="volumeHandler($event)"
          @brightnessHandler="volumeHandler($event)"
        />
        <captions
          v-if="$refs.player"
          class="mx-2"
          :captions="webCaptionList || video.captions"
          @captionsHandler="captionsHandler($event)"
        />
        <loop
          v-if="$refs.player"
          class="mx-2"
          :loop="$refs.player.loop"
          @loop="
            ($refs.player.loop = !$refs.player.loop),
              $store.commit('player/setLoop', $refs.player.loop)
          "
        />
        <close />
      </div>
      <!-- top controls row end -->

      <!-- center controls row -->
      <div
        class="d-flex justify-center align-center"
        style="
          transform: translate(-50%, -50%);
          position: absolute;
          left: 50%;
          top: 50%;
          filter: drop-shadow(0 0 0.5rem #000)
        "
      >
        <v-btn
      elevation="0"
          v-if="!verticalFullscreen"
          icon
          variant="text"
          color="white"
          class="mx-12"
          disabled
        >
          <v-icon size="2rem" color="white">mdi-skip-previous</v-icon>
        </v-btn>
        <playpause
          v-if="$refs.player"
          :video="$refs.player"
          :buffering="bufferingDetected || false"
          :ended="videoEnded && !$refs.player.loop"
          @play="playHandler"
          @pause="pauseHandler"
        />
        <v-btn
      elevation="0"
          v-if="!verticalFullscreen"
          icon
          variant="text"
          color="white"
          class="mx-12"
          @click="
            $router.push(
              `/watch?v=${recommends.contents[0]?.videoWithContextRenderer?.videoId || recommends.contents[0].tileRenderer.onSelectCommand.watchEndpoint.videoId}`
            )
          "
        >
          <v-icon size="2rem" color="white">mdi-skip-next</v-icon>
        </v-btn>
      </div>
      <!-- center controls row end -->

      <!-- combined bottom row: time · quality · speed · fullscreen
           In non-fullscreen is raised so seekbar stays below it.
           In fullscreen rises above the seekbar wrapper -->
      <div
        :style="isFullscreen ? 'bottom: 5rem' : 'bottom: 0.5rem'"
        class="d-flex justify-between align-center pl-4 pr-2"
        style="position: absolute; width: 100%; filter: drop-shadow(0 0 0.5rem #000)"
        @click.self="controlsHandler()"
      >
        <watchtime
          v-if="$refs.player"
          :current-time="$refs.player.currentTime"
          :duration="$refs.player.duration"
          :controls="controls"
        />
        <v-spacer />
        <quality
          v-if="$refs.player && $refs.player.currentSrc && (!hls || !dash)"
          :sources="sources"
          :audioSources="audioSources"
          :current-source="$refs.player"
          :current-audio-source="$refs.player"
          :current-video-format="currentVideoFormat"
          :current-audio-format="currentAudioFormat"
          @qualityInfo="qualityInfoHandler($event)"
          @qualityAudioInfo="audioQualityInfoHandler($event)"
        />
        <speed
          v-if="$refs.player"
          class=""
          :current-speed="$refs.player.playbackRate"
          @speed="
            ($refs.player.playbackRate = $event),
              $store.state.player.speedAutosave
                ? $store.commit('player/setSpeed', $event)
                : {}
          "
        />
        <fullscreen
          style="z-index: 2"
          :fullscreen="isFullscreen"
          @fullscreen="fullscreenHandler(true)"
        />
      </div>
      <!-- combined bottom row end -->

      <!-- fullscreen-only interaction row (likes, share, etc.) — sits below seekbar -->
      <div
        v-if="isFullscreen"
        style="position: absolute; width: 100%; bottom: 0.5rem; filter: drop-shadow(0 0 0.5rem #000)"
        class="d-flex align-center px-2"
        @click.self="controlsHandler()"
      >
        <fscontrols
          :is-fullscreen="isFullscreen"
          :vertical-fullscreen="verticalFullscreen"
        />
      </div>
      <!-- fullscreen interaction row end -->
    </div>
    <!-- controls container end -->

    <progressbar
      v-if="$refs.player"
      :current-time="liveNoDvr ? $refs.player.duration : $refs.player.currentTime"
      :duration="$refs.player.duration"
      :fullscreen="isFullscreen"
      :controls="controls"
      :min-time="liveWindow && !liveNoDvr ? liveWindow.minSec : 0"
      :buffered="buffered"
      :seeking="seeking"
      :blocks="sponsorBlocks.videoID ? sponsorBlocks : null"
    />

    <seekbar
      v-if="$refs.player"
      v-show="!isFullscreen || controls"
      :duration="$refs.player.duration"
      :min-time="liveWindow && !liveNoDvr ? liveWindow.minSec : 0"
      :fullscreen="isFullscreen"
      :current-time="liveNoDvr ? $refs.player.duration : progress"
      :video="$refs.player"
      :controls="controls"
      :sources="sources"
      :seeking="seeking"
      :disabled="disabled || liveNoDvr"
      :storyboards="storyboards"
      :buffered="buffered"
      :blocks="sponsorBlocks.videoID ? sponsorBlocks : null"
      @seeking="seeking = !seeking"
      @scrub="userSeek($event)"
    />

    <v-progress-circular
      v-if="$store.state.player.preload && buffered < 100"
      style="
        transform: translate(-50%, -50%);
        position: absolute;
        left: 50%;
        top: 50%;
      "
      color="primary"
      :model-value="buffered"
      :rotate="-90"
      :size="64"
    >
      <b>{{ buffered }}%</b>
    </v-progress-circular>
  </div>
</template>

<script>
import loop from "~/components/Player/loop.vue";
import close from "~/components/Player/close.vue";
import speed from "~/components/Player/speed.vue";
import seekbar from "~/components/Player/seekbar.vue";
import quality from "~/components/Player/quality.vue";
import minimize from "~/components/Player/minimize.vue";
import captions from "~/components/Player/captions.vue";
import settings from "~/components/Player/settings.vue";
import playpause from "~/components/Player/playpause.vue";
import watchtime from "~/components/Player/watchtime.vue";
import fscontrols from "~/components/Player/fscontrols.vue";
import fullscreen from "~/components/Player/fullscreen.vue";
import progressbar from "~/components/Player/progressbar.vue";
import sponsorblock from "~/components/Player/sponsorblock.vue";

import backType from "~/lib/classes/backType";
import constants from "~/lib/constants";
import { Http } from "@capacitor-community/http";
import { Capacitor } from "@capacitor/core";
// import { convertTranscriptToVTT } from "~/lib/utils";
import $youtube from "~/lib/innertube";
import sabr from "~/lib/sabr";
import Endscreen from "./endscreen.vue";
import {convertTranscriptToVTT} from "../../lib/utils";
import {loadCaptions, activeCues, renderCues} from "../../lib/captions";

export default {
  components: {
    Endscreen,
    // player,
    sponsorblock,
    progressbar,
    fullscreen,
    fscontrols,
    watchtime,
    playpause,
    captions,
    minimize,
    quality,
    seekbar,
    speed,
    close,
    loop,
    settings
  },
  props: {
    video: {
      type: Object,
      required: true,
    },
    sources: {
      type: Array,
      required: true,
    },
    captions: {
      type: Array,
    },
    recommends: {
      type: Object,
      default: () => {
        return [];
      },
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    storyboards: {
      default: null,
    }
  },
  data() {
    return {
      audioSources: [],
      isPIP: false,
      isFullscreen: false,
      fullscreenLock: false,
      shortTransition: false,
      verticalFullscreen: false,
      controls: false,
      seeking: false,
      customCaptionHtml: "",
      webCaptionList: null,
      captionsReserve: 0,
      contain: true,
      skipping: 0,
      progress: 0,
      buffered: 0,
      watched: 0,
      vidSrc: "",
      // audSrc: "",
      hls: null,
      dash: null,
      isLive: null,
      liveWindow: null, // { minSec, maxSec, headSequenceNumber, videoId } from SABR LiveMetadata
      liveNoDvr: false, // live stream without rewindable history: seekbar pinned to the end
      hlsStream: null,
      dashStream: null,
      isVerticalVideo: false, // maybe rename(refactor everywhere used) to isShort
      bufferingDetected: false,
      videoEnded: false,
      isMusic: false,
      sponsorBlocks: [],
      vid: null,
      isSegment: false,
      sBblockCategoryText: "",
      endBlockTime: -1,
      poster: "",
      // SABR playback state
      currentVideoFormat: null,
      currentAudioFormat: null,
      videoMediaSource: null,
      videoSourceBuffer: null,
      // audioMediaSource: null,
      audioSourceBuffer: null,
      videoAbortController: null,
      audioAbortController: null,
      isInternalSeek: false,
      isUserSeeking: false,
      wasPlayingBeforeSeek: false,
      lastLoadingStarted: 0,
    };
  },
  async mounted() {
    this.$emit("ready");
    screen.orientation.addEventListener('change', (e)=> {

      if (e.currentTarget.type === 'landscape-primary') {
        this.$refs.player.width = this.$refs.vidcontainer.offsetWidth;
        this.$refs.player.height = "auto";
      } else if (e.currentTarget.type === 'portrait-primary') {
        this.$refs.player.width = this.$refs.vidcontainer.offsetWidth;
        if (this.$refs.player.height < (50 * window.innerHeight) / 100) {
          this.$refs.player.height = this.$refs.vidcontainer.offsetWidth / (this.$refs.player?.videoWidth / this.$refs.player?.videoHeight);
        }
      }
    });

    this.isSegment = false;
    this.poster = await $youtube.getThumbnail(this.$route.query.v, '', []);
    this.loadWebCaptions();

    console.log("SPSR BLCK" + this.sponsorBlocks);
    if (
      this.sponsorBlocks.length <= 0 &&
      this.$store.state.sponsorBlockIntegration === true
    ) {
      this.$youtube.getSponsorBlock(this.video.id, (data) => {
        console.warn("sbreturn", data.segments);

        this.sponsorBlocks = data;
        data.segments?.forEach((block) => {
          if (block.category === "music_offtopic") {
            this.isMusic = true;
            this.$refs.player.playbackRate = 1;
          }
        });

      });
    } else {

    }

    this.vid = this.$refs.player;
    // this.aud = this.$refs.audio;

    // TODO: detect this.isMusic from the video or channel metadata instead of just SB segments


    /**
     * Video quality selection which device can play normally
     * @returns {number[]}
     */
    function getPreferredQuality() {
      let width;
      let height;
      // Detecting device - https://stackoverflow.com/a/11381730/18543384
      window.mobileCheck = function () {
        let check = false;
        (function (a) {
          if (
            /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(
              a
            ) ||
            /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
              a.substr(0, 4)
            )
          )
            check = true;
        })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
      };
      // The smartphone screen width is smaller than the length (1080x1920).
      // On a computer, the opposite is true (1920x1080).
      // Detecting smaller side of the display.
      if (window.mobileCheck) {
        width = window.screen.width * window.devicePixelRatio;
        height = window.screen.height * window.devicePixelRatio;
      } else {
        width = window.screen.height * window.devicePixelRatio;
        height = window.screen.width * window.devicePixelRatio;
      }
      return [width, height];
    }

    // TODO: this.$store.state.player.quality, check if exists and select the closest one
    let displayInfo = getPreferredQuality();
    let indexOfPreferredQuality = -1;
    let indexOfPreferredQualityAuto = -1;
    let indexOfPreferredAudioQuality = -1;
    // console.warn(displayInfo);
    // iOS (Safari/WKWebView) doesn't support VP9/AV1/Opus in <video> or MSE,
    // so those sources must always be excluded there regardless of the manual toggle.
    const isIOS = Capacitor.getPlatform() === "ios";
    for (let i = this.sources.length; i > 0; i--) {
      if (i === this.sources.length) continue;
      // console.log(this.sources[i].mimeType.toLowerCase());
      // console.log('video/webm; codecs="vp9"'.indexOf("vp9"));
      const mimeType = this.sources[i].mimeType.toLowerCase();
      const isVP9 = mimeType.indexOf("vp9") >= 0 || mimeType.indexOf("vp09") >= 0;
      const isUnsupportedOnIOS =
        isVP9 ||
        mimeType.indexOf("av01") >= 0 ||
        mimeType.indexOf("opus") >= 0 ||
        mimeType.indexOf("webm") >= 0;
      if (
        (isVP9 && localStorage.getItem("removeVP9Codec") === "true") ||
        (isIOS && isUnsupportedOnIOS)
      ) {
        this.sources.splice(i, 1);
      }
    }
    this.sources.splice(0, 1);

    let videoSFromStorage = localStorage.getItem("videoQuality") || null;
    let videoCodecFromStorage = localStorage.getItem("videoCodec") || null;

    for (let i = this.sources.length; i > 0; i--) {
      if (i === this.sources.length) continue;
      else {
        // if quality height <= to the smaller side of the display,
        // write the index of the source to a variable indexOfPreferredQuality.
        if (
          this.sources[i].height <= displayInfo[1] &&
          this.sources[i].mimeType.includes("video")
        ) {
          indexOfPreferredQualityAuto = i;
        }
        // if (this.sources[i]?.audioQuality && this.sources[i]?.audioQuality === "AUDIO_QUALITY_MEDIUM") {
        //   // this.audSrc = this.sources[i].url;
        // }
        if ((videoSFromStorage || videoCodecFromStorage) && this.sources[i].mimeType.includes("video")) {
          if (this.sources[i].mimeType.includes(videoCodecFromStorage) && this.sources[i].qualityLabel.includes(videoSFromStorage)){
            indexOfPreferredQuality = i;
          }
        }
      }
    }


    if (indexOfPreferredQuality === -1) {
      for (let i = this.sources.length; i > 0; i--) {
        if (i === this.sources.length) continue;
        else {
          if ((videoSFromStorage || videoCodecFromStorage) && this.sources[i].mimeType.includes("video")) {
            let ql = videoSFromStorage.split("p");
            if (this.sources[i].mimeType.includes(videoCodecFromStorage) && this.sources[i].qualityLabel.includes(ql[0])){
              indexOfPreferredQuality = i;
            }
          }
        }
      }
    }
    if (indexOfPreferredQuality === -1) {
      for (let i = this.sources.length; i > 0; i--) {
        if (i === this.sources.length) continue;
        else {
          if ((videoSFromStorage || videoCodecFromStorage) && this.sources[i].mimeType.includes("video")) {
            let ql = videoSFromStorage.split("p");
            if (this.sources[i].qualityLabel.includes(ql[0])){
              indexOfPreferredQuality = i;
            }
          }
        }
      }
    }

    if (indexOfPreferredQuality === -1) {
      // indexOfPreferredQuality = indexOfPreferredQualityAuto;
      indexOfPreferredQuality = 0;
    }


    // let audioCodecFromStorage = localStorage.getItem("audioCodec");

    // Make separate array with audio only
    for (let i = 0; i < this.sources.length; i++) {
      if (this.sources[i].mimeType.indexOf("audio") > -1) {
        if (this.sources[i]?.audioTrack !== undefined) {
          if (this.sources[i].audioQuality !== "AUDIO_QUALITY_LOW") {
            this.audioSources.push(this.sources[i]);
          }
          if (this.sources[i].audioTrack?.audioIsDefault === Boolean("true")) {
            if (localStorage.getItem("audioTrackId") === undefined || localStorage.getItem("audioTrackId") === null) {
              localStorage.setItem("audioTrackId", this.sources[i].audioTrack.id);
            }
          }
        }
        else {
          this.audioSources.push(this.sources[i]);
        }
      }
    }
    for (let i = this.sources.length; i > 0; i--) {
      if (i === this.sources.length) continue;
      else {
        if (this.sources[i].mimeType.indexOf("audio") > -1) {
          // this.sources[i].remove();
          this.sources.splice(i, 1);
        }
      }
    }
    let audioSFromStorage = localStorage.getItem("audioQuality") || null;
    let audioCodecFromStorage = localStorage.getItem("audioQualityCodec") || null;
// Sort by bitrate audio
    if (this.audioSources[0]?.audioTrack === undefined) {
      this.audioSources = this.audioSources.sort((a, b) => b?.bitrate - a?.bitrate);
      console.warn(this.audioSources);
      for (let i = 0; i < this.audioSources.length; i++) {
        if (this.audioSources[i]?.audioQuality && this.audioSources[i]?.audioQuality !== "AUDIO_QUALITY_LOW") {

          // let audioCodecFromStorage = localStorage.getItem("audioCodec");
          if (audioSFromStorage) {
            if (audioSFromStorage === this.audioSources[i].itag.toString()) {
              // this.audSrc = this.audioSources[i].url;
              indexOfPreferredAudioQuality = i;
              break;
            }
          }
        }
      }
      if (indexOfPreferredAudioQuality === -1) {
        // this.audSrc = this.audioSources[0].url;
      }
    }

    this.vidSrc = this.sources[indexOfPreferredQuality].url;
    // console.warn(this.vidSrc);
    // this.$refs.player.type = this.sources[indexOfPreferredQuality].mimeType;
    // this.prebuffer(this.sources[indexOfPreferredQuality].url);

    this.audioSources.sort((a, b) => a?.audioTrack?.displayName?.localeCompare(b?.audioTrack?.displayName));

    let dubIsFound = false;
    this.audioSources.forEach((source) => {
      if (dubIsFound) {
        return;
      }
        // this.audSrc = source.url;
      // console.log(source.audioTrack?.audioIsDefault);
      if (source?.audioTrack !== undefined) {
        if (localStorage.getItem("audioTrackId") !== undefined) {
          if (source.audioTrack?.id === localStorage.getItem("audioTrackId")) {
            // this.audSrc = source.url;
            dubIsFound = true;
          }
        }

      }
      else {
      //   Nothing.
      }

    });
    if (!dubIsFound) {
      this.audioSources.forEach((source) => {
        if (dubIsFound) {
          return;
        }
        if (source?.audioTrack !== undefined) {
          if (localStorage.getItem("audioTrackId") !== undefined) {
            if (source.audioTrack?.id.split(".")[0] === localStorage.getItem("audioTrackId").split(".")[0]) {
              // this.audSrc = source.url;
              dubIsFound = true;
            }
            else {
              if (source.audioTrack.audioIsDefault === Boolean("true")) {
                // this.audSrc = source.url;
              }
            }
          }
        }
      });
    }
    this.currentVideoFormat = this.sources[indexOfPreferredQuality];
    this.currentAudioFormat = this.audioSources[0];

    // this.aud.addEventListener("loadeddata", this.loadedAudioEvent);

    this.$refs.player.addEventListener("timeupdate", this.timeUpdateEvent);
    this.$refs.player.addEventListener("progress", this.progressEvent);
    this.$refs.player.addEventListener("seeking", this.seekingEvent);
    this.$refs.player.addEventListener("seeked", this.seekedEvent);
    this.$refs.player.addEventListener("waiting", this.waitingEvent);
    this.$refs.player.addEventListener("playing", this.playingEvent);
    this.$refs.player.addEventListener("ended", this.endedEvent);
    this.isLive = this.video.isLive;
    this.liveNoDvr = !!this.video.isLive && this.video.isLiveDvrEnabled === false;

    if (this.isLive) {
      this.hls = this.video.hls;
      this.dash = this.video.dash;
      if (this.hls) {
        this.hlsStream = new Hls();
        this.hlsStream.loadSource(this.hls);
        this.hlsStream.attachMedia(this.vid);
      } else if (this.dash) {
        this.dashStream = dashjs.MediaPlayer().create();
        this.dashStream.initialize(this.vid, this.dash, true);
      }
    }

    if (
      this.video.metadata?.ustreamerConfig &&
      this.video.metadata?.serverAbrStreamingUrl
    ) {
      let startTimeSec = 0;
      const url = new URL(window.location.href);
      const tParam = url.searchParams.get("t");
      if (tParam) {
        startTimeSec = parseInt(tParam.replace(/[^0-9]/g, '')) || 0;
      }
      this.loadCombinedViaSabr(null, null, startTimeSec);
    } else {
      const url = new URL(window.location.href);
      const tParam = url.searchParams.get("t");
      this.setStartTime(tParam);
    }
  },
  created() {
    screen.orientation.addEventListener("change", (e) => {
      // Swiping open the notification shade while in immersive fullscreen
      // can fire a spurious orientation "change" event on Android even
      // though the orientation didn't actually change. Only auto-exit
      // fullscreen when the new orientation is actually the "wrong" one
      // for the current fullscreen mode (i.e. the user physically rotated
      // the device back).
      const type = e.target?.type || screen.orientation?.type || "";
      const isPortrait = type.startsWith("portrait");

      if (!this.isFullscreen) {
        // Auto-enter fullscreen when the user physically rotates the
        // device to landscape while a (non-vertical) video is loaded,
        // instead of requiring an explicit tap on the fullscreen button.
        if (!isPortrait && !this.isVerticalVideo && this.vid) {
          this.enterFullscreen(true);
        }
        return;
      }

      const wrongOrientation = this.verticalFullscreen
        ? !isPortrait
        : isPortrait;
      if (wrongOrientation) this.fullscreenHandler(false);
    });

    // screen.orientation can be shimmed/replaced by a native
    // Cordova/Capacitor screen-orientation plugin on Android and not
    // dispatch "change" reliably the way the spec does — observed: entering
    // fullscreen on rotation only ever worked through matchMedia, never
    // through screen.orientation's "change" event above.
    const landscapeQuery = window.matchMedia("(orientation: landscape)");
    const onOrientationMediaChange = (e) => {
      if (!this.isFullscreen && e.matches && !this.isVerticalVideo && this.vid) {
        this.enterFullscreen(true);
      }
    };
    landscapeQuery.addEventListener("change", onOrientationMediaChange);

    // Detecting rotation back OUT of fullscreen can't rely on
    // matchMedia/screen.orientation at all: once fullscreen calls
    // screen.orientation.lock(), the OS refuses to actually rotate the
    // app's window, so the window/CSS orientation never changes and
    // neither of those APIs ever fires again — there's nothing for them to
    // detect. The only way to know the user physically rotated the device
    // while the window itself stays locked is the raw accelerometer via
    // "devicemotion".
    this._motionOrientationHandler = (event) => {
      if (!this.isFullscreen) return;
      const now = Date.now();
      if (now - this._lastTiltCheckAt < 250) return; // throttle
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null) return;
      const { x, y } = acc;
      // Ignore near-flat readings (phone lying flat on a table) where
      // gravity is dominated by the z axis and x/y are unreliable.
      if (Math.abs(x) < 2 && Math.abs(y) < 2) return;
      this._lastTiltCheckAt = now;
      const isPhysicallyPortrait = Math.abs(y) > Math.abs(x) * 1.4;
      const isPhysicallyLandscape = Math.abs(x) > Math.abs(y) * 1.4;
      const wrongOrientation = this.verticalFullscreen
        ? isPhysicallyLandscape
        : isPhysicallyPortrait;
      if (wrongOrientation) this.exitFullscreenViaSensor();
    };
    this._lastTiltCheckAt = 0;
    this._motionPermissionRequested = false;

    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission === "function"
    ) {
      // iOS 13+ requires an explicit permission grant, and it must be
      // requested from inside a user gesture (a tap) or it's silently
      // denied. We can't ask for it here in created(), so it's requested
      // lazily from the first fullscreen button tap — see
      // ensureMotionPermission() / fullscreenHandler().
    } else {
      // Not gated behind a permission prompt (Android, older iOS) — just
      // start listening right away.
      window.addEventListener("devicemotion", this._motionOrientationHandler);
    }
  },
  beforeUnmount() {
    this.stopCaptions();
    this.cleanup();
    if (this._motionOrientationHandler) {
      window.removeEventListener("devicemotion", this._motionOrientationHandler);
    }
  },
  watch: {
    controls() {
      this.scheduleCaptionsReserve();
    },
    seeking() {
      this.scheduleCaptionsReserve();
    },
    isFullscreen() {
      this.scheduleCaptionsReserve();
    },
    customCaptionHtml(value, oldValue) {
      if (value && !oldValue) this.scheduleCaptionsReserve();
    },
  },
  methods: {
    scheduleCaptionsReserve() {
      requestAnimationFrame(() => this.updateCaptionsReserve());
    },
    updateCaptionsReserve() {
      const overlay = this.$refs.captionsOverlay;
      const track = document.getElementById("seekbar-track");
      const container = overlay?.parentElement;
      if (!container || !track) return;
      const trackRect = track.getBoundingClientRect();
      if (!trackRect.width) return;
      this.captionsReserve = Math.max(0, container.getBoundingClientRect().bottom - trackRect.top);
    },
    loadedAudioEvent() {
      this.$refs.player.addEventListener("loadeddata", this.loadedDataEvent);
      this.loadedDataEvent();
    },
    loadedDataEvent() {

      try {

        window.navigation.addEventListener("navigate", (event) => {
          const url = new URL(event.destination.url);

          const tParam = url.searchParams.get("t");
          this.setStartTime(tParam)
        })
      }catch (e) {
        window.addEventListener('locationchange', function (event) {
          const url = new URL(event.destination.url);

          const tParam = url.searchParams.get("t");
          this.setStartTime(tParam)
        });

      }
      // networkState: An integer property that represents the network state of the video. The possible values are:
      // NETWORK_EMPTY (0): No source has been set or the video element's load() method has not been called.
      // NETWORK_IDLE (1): The video element's load() method has been called, and the video is fetching the media resource.
      // NETWORK_LOADING (2): The video is in the process of downloading the media resource.
      // NETWORK_NO_SOURCE (3): No suitable source found for the video.

      //readyState: An integer property that represents the readiness state of the video. The possible values are:
      // HAVE_NOTHING (0): No information about the media resource is available.
      // HAVE_METADATA (1): Basic metadata about the media resource, such as duration, is available.
      // HAVE_CURRENT_DATA (2): Data for the current playback position is available but not enough to start playback.
      // HAVE_FUTURE_DATA (3): Data for the current and at least the next frame is available.
      // HAVE_ENOUGH_DATA (4): Enough data is available to start playback.

      if (this.vid.readyState >= 3) {
        this.bufferingDetected = false;
        this.vid.play();

        if (!this.isMusic) {
          this.$refs.player.playbackRate = this.$store.state.player.speed;
        } else {
          this.$refs.player.playbackRate = 1;
        }

        this.$refs.player.loop = this.$store.state.player.loop || false;
        this.$refs.player.addEventListener("timeupdate", this.timeUpdateEvent);
        // TODO: split buffering into multiple sections as it should be for back/forth scrubbing
        this.$refs.player.addEventListener("progress", this.progressEvent);
        this.$refs.player.addEventListener("seeking", this.seekingEvent);
        this.$refs.player.addEventListener("seeked", this.seekedEvent);
        this.$refs.player.addEventListener("waiting", this.waitingEvent);
        this.$refs.player.addEventListener("playing", this.playingEvent);
        this.$refs.player.addEventListener("ended", this.endedEvent);
      }
      else {
        this.vid.pause();
      }
    },
    // Returns whether `time` falls within a buffered range of `el` (used to decide
    // whether a SABR seek can rely on the native "seeked" event or must eagerly
    // restart the stream at the target time instead).
    isTimeBuffered(el, time) {
      if (!el) return false;
      const buf = el.buffered;
      const duration = el.duration;
      for (let i = 0; i < buf.length; i++) {
        const start = buf.start(i);
        const end = buf.end(i);
        if (duration && end >= duration - 0.5 && time >= start && time <= duration) {
          return true;
        }
        if (time >= start && time <= end - 0.5) {
          return true;
        }
      }
      return false;
    },
    userSeek(time) {
      if (this.liveNoDvr) return;
      console.log("[PLAYER] userSeek to", time);
      this.wasPlayingBeforeSeek = this.$refs.player ? !this.$refs.player.paused : false;
      this.isUserSeeking = true;
      const duration = this.$refs.player?.duration;
      if (duration && !isNaN(duration) && time >= duration) {
        time = duration - 0.2;
      }
      const minTime = this.liveWindow ? this.liveWindow.minSec : 0;
      if (time < minTime) {
        time = minTime;
      }
      this.$refs.player.currentTime = time;

      // The browser only fires the "seeked" event once the target position is
      // buffered. For a forward seek into an unbuffered region that never
      // happens until the running SABR stream sequentially downloads everything
      // up to the target. So for unbuffered SABR seeks we restart the stream at
      // the target right here instead of waiting for "seeked".
      if (
        this.video.metadata?.ustreamerConfig &&
        this.video.metadata?.serverAbrStreamingUrl &&
        !this.isTimeBuffered(this.$refs.player, time)
      ) {
        this.isUserSeeking = false; // handled here; don't double-handle in seekedEvent
        this.bufferingDetected = true;
        this.lastLoadingStarted = Date.now();
        if (this.$refs.player) this.$refs.player.pause();
        this.loadCombinedViaSabr(this.currentVideoFormat, this.currentAudioFormat, time);
      }
    },
    seekingEvent() {
      console.log("seeking", this.$refs.player?.currentTime);
      if (this.isInternalSeek) {
        return;
      }
      // Only pause for user-initiated seeks (when seeking data prop is true),
      // not for internal MSE browser seeks (gap-skipping between segments)
      if (this.seeking || this.isUserSeeking) {
        this.bufferingDetected = true;
        this.$refs.player.pause();
      }
    },
    seekedEvent() {
      console.log("seeked", this.$refs.player?.currentTime);
      if (this.isInternalSeek) {
        this.isInternalSeek = false;
        return;
      }

      if (this.isUserSeeking) {
        this.isUserSeeking = false;
        const wasPlaying = this.wasPlayingBeforeSeek;

        if (
          this.video.metadata?.ustreamerConfig &&
          this.video.metadata?.serverAbrStreamingUrl
        ) {
          // Unbuffered SABR seeks are handled eagerly in userSeek (the browser
          // won't fire "seeked" until the target is buffered). Here the target
          // is already buffered, so just resume playback.
          const seekTime = this.$refs.player.currentTime;
          this.bufferingDetected = true;
          this.lastLoadingStarted = Date.now();
          if (this.$refs.player) this.$refs.player.pause();
          if (this.$refs.player) this.$refs.player.currentTime = seekTime;
          setTimeout(() => {
            if (wasPlaying && this.$refs.player) this.$refs.player.play().catch(() => {});
            this.bufferingDetected = false;
            this.wasPlayingBeforeSeek = false;
          }, 1000);
          return;
        }

        this.bufferingDetected = true;
        this.lastLoadingStarted = Date.now();
        if (this.$refs.player) this.$refs.player.pause();
        setTimeout(() => {
          if (wasPlaying) {
            if (this.$refs.player) this.$refs.player.play().catch(() => {});
          }
          this.bufferingDetected = false;
          this.wasPlayingBeforeSeek = false;
        }, 1000);
      }
    },


    timeUpdateEvent() {
      if (this.bufferingDetected || this.seeking || this.isUserSeeking) {
        return;
      }
      // desync detection not needed — audio/video are in a single MediaSource
      if (!this.seeking) this.progress = this.vid.currentTime; // for seekbar

      // console.log("sb check", this.sponsorBlocks);
      // iterate over data.segments array
      // for sponsorblock
      // if (this.sponsorBlocks.length > 0) {
        let vidTime = this.vid.currentTime;
        // this.sponsorBlocks = data;
        // console.warn(data);
      this.endBlockTime = -1;
        this.sponsorBlocks?.segments?.forEach((block) => {
          // block.segments.forEach((segments) => {
          // console.log(this.vid.duration);
            if (vidTime >= block.segment[0] && vidTime < block.segment[1]) {
              this.endBlockTime = block.segment[1];
              this.isSegment = true;
              this.sBblockCategoryText = block.category;
              this.$refs.skipButton.onclick = () => {
                console.log("skipped");
                this.userSeek(block.segment[1]);
                this.$youtube.showToast("Skipped " + block.category + " sponsor");
              };

              return;
            }

          // });
        });
        if (vidTime > this.endBlockTime) {
          this.isSegment = false;
        }
    },
    endedEvent() {
      this.videoEnded = true;
      if (this.$refs.player.loop) return;
      clearTimeout(this.controls);
      this.controls = true;
    },
    progressEvent() {
      // audio sync not needed — single MediaSource
      try {

        this.buffered = (this.vid.buffered.end(0) / this.vid.duration) * 100;
      }catch (e) {

      }
    },
    waitingEvent() {
      // buffering detection & sync
      let threshold = 1000; //ms after which user perceives buffering
      this.bufferingDetected = true;
      if (!this.$refs.player.paused) {
        // setTimeout(() => { this.$refs.audio.pause(); }, threshold);
      }
    },
    playingEvent() {
      this.videoEnded = false;
      if (this.bufferingDetected !== false) {
        clearTimeout(this.bufferingDetected);
        setTimeout(() => {
          this.bufferingDetected = false;
        }, 1000);
      }
    },
    cleanup() {
      if (this.hlsStream) this.hlsStream.destroy();
      if (this.xhr) this.xhr.abort();
      if (this.isFullscreen) this.exitFullscreen();
      if (this.bufferingDetected) clearTimeout(this.bufferingDetected);
      if (this.videoAbortController) this.videoAbortController.abort();
      if (this.audioAbortController) this.audioAbortController.abort();
      this.videoMediaSource = null;
      this.videoSourceBuffer = null;
      // this.audioMediaSource = null;
      this.audioSourceBuffer = null;

      this.$refs.player.pause();
      this.$refs.player.src = '';
      this.$refs.player.load();
      // screen.orientation.removeEventListener("change");
      this.$refs.player.removeEventListener("loadeddata", this.loadedDataEvent);
      this.$refs.player.removeEventListener("timeupdate", this.timeUpdateEvent);
      this.$refs.player.removeEventListener("progress", this.progressEvent);
      this.$refs.player.removeEventListener("waiting", this.waitingEvent);
      this.$refs.player.removeEventListener("playing", this.playingEvent);
    },
    prebuffer(url) {
      this.xhr = new XMLHttpRequest();
      this.xhr.open("GET", url, true);
      this.xhr.responseType = "blob";

      this.xhr.addEventListener(
        "load",
        () => {
          if (this.xhr.status === 200) {
            console.error(this.xhr);
            this.blobToDataURL(this.xhr.response, (dataurl) => {
              console.log(dataurl);
              this.vidSrc = dataurl;
              this.buffered = 100;
            });
          } else {
            console.error("errorred pre-fetch", this.xhr.status);
          }
        },
        false
      );

      var prev_pc = 0;
      this.xhr.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          var pc = Math.round((event.loaded / event.total) * 100);
          if (pc != prev_pc) {
            prev_pc = pc; // ##%
            if (pc < 100) this.buffered = pc;
            // console.warn(this.xhr);
          }
        }
      });

      this.xhr.send();
    },

    blobToDataURL(blob, callback) {
      let url = URL.createObjectURL(new Blob([blob]));
      callback(url);
    },
    shortNext() {
      this.shortTransition = true;
      setTimeout(() => {
        this.$router.push(
          `/watch?v=${this.recommends.contents[0].videoWithContextRenderer.videoId}`
        );
      }, 150);
    },
    // TODO: make accumulative onclick after first dblclick (don't set timeout untill stopped clicking)
    skipHandler(time) {
      this.skipping = time;
      setTimeout(() => {
        this.skipping = false;
      }, 500);

      this.userSeek(this.$refs.player.currentTime + time);
    },
    controlsHandler() {
      if (!this.seeking)
        this.controls
          ? (clearTimeout(this.controls), (this.controls = false))
          : setTimeout(() => {
              if (!this.skipping) {
                this.controls = setTimeout(() => {
                  if (!this.seeking && !this.$refs?.player?.paused)
                    this.controls = false;
                }, 2345);
              }
            }, 250);
    },
    getCodecName(codec) {
      if (codec.includes("av01")) {
        return "av01";
      }
      else if (codec.includes("avc1")) {
        return "avc1";
      }
      else if (codec.includes("opus")) {
        return "opus";
      }
      else if (codec.includes("mp4a")) {
        return "mp4a";
      }
      else {
        return "vp9";
      }
    },
    qualityInfoHandler(q) {
      localStorage.setItem("videoQuality", q.qualityLabel);
      let codec = q.mimeType.replaceAll("; codecs=", ". Codecs: ");
      localStorage.setItem("videoCodec", this.getCodecName(codec));
      this.wasPlayingBeforeSeek = this.$refs.player ? !this.$refs.player.paused : false;

      if (
        this.video.metadata?.ustreamerConfig &&
        this.video.metadata?.serverAbrStreamingUrl
      ) {
        const currentTime = this.$refs.player.currentTime;
        this.loadCombinedViaSabr(q, this.currentAudioFormat, currentTime);
        return;
      }

      this.currentVideoFormat = q;
      let src = q.url;
      let time = this.$refs.player.currentTime;
      let speed = this.$refs.player.playbackRate;
      this.$refs.player.pause();
      this.$refs.player.src = '';
      this.$refs.player.load();
      this.$refs.player.src = src;
      // this.$refs.audio.currentTime = time;
      this.$refs.player.currentTime = time;
      this.$refs.player.playbackRate = speed;
      // this.$refs.audio.playbackRate = speed;
      this.hls = false;
      this.dash = false;
      this.hlsStream = null;
    },
    audioQualityInfoHandler(q) {
      localStorage.setItem("audioQuality", q.itag);
      let codec = q.mimeType.replaceAll("; codecs=", ". Codecs: ");
      localStorage.setItem("audioCodec", this.getCodecName(codec));
      this.wasPlayingBeforeSeek = this.$refs.player ? !this.$refs.player.paused : false;
      if (q.audioTrack?.id) {
        localStorage.setItem("audioTrackId", q.audioTrack.id);
      } else {
        localStorage.removeItem("audioTrackId");
      }

      if (
        this.video.metadata?.ustreamerConfig &&
        this.video.metadata?.serverAbrStreamingUrl
      ) {
        const currentTime = this.$refs.player.currentTime;
        this.loadCombinedViaSabr(this.currentVideoFormat, q, currentTime);
        return;
      }

      this.currentAudioFormat = q;

      let time = this.$refs.player.currentTime;
      let speed = this.$refs.player.playbackRate;
      this.$refs.player.pause();
      this.$refs.player.load();
      this.$refs.player.currentTime = time;
      this.$refs.player.playbackRate = speed;
      this.hls = false;
      this.dash = false;
      this.hlsStream = null;
    },
    async captionsHandler(q) {
      this.stopCaptions();
      if (q.baseUrl != null) {
        const fetcher = (track) => async (format) => {
          const res = await Http.get({
            url: (track.baseUrl + "&fmt=" + format).replace("https://www.youtube.com", constants.URLS.YT_MOBILE),
            params: {},
            headers: {},
          });
          return res.data;
        };

        const cues = await loadCaptions(fetcher(q));
        if (cues) this.startCaptions(cues);
      }
      else {
        this.customCaptionHtml = "";
      }
      const rootElement = document.getElementById('__nuxt');
      rootElement.className += "web chrome";
    },
    async loadWebCaptions() {
      const id = this.video.id;
      this.webCaptionList = null;
      const r = await this.$youtube.getCaptions(id).catch(() => null);
      const tracks = r?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (id !== this.video.id || !tracks?.length) return;
      this.webCaptionList = [
        { baseUrl: null, name: { runs: [{ text: "Disable captions" }] } },
        ...tracks,
      ];
    },
    startCaptions(cues) {
      let lastKey = null;
      const tick = () => {
        const player = this.$refs.player;
        if (player) {
          const indexes = activeCues(cues, player.currentTime * 1000);
          const key = indexes.join(",");
          if (key !== lastKey) {
            lastKey = key;
            this.customCaptionHtml = renderCues(cues, indexes);
          }
        }
        this._captionsFrame = requestAnimationFrame(tick);
      };
      this._captionsFrame = requestAnimationFrame(tick);
    },
    stopCaptions() {
      if (this._captionsFrame) cancelAnimationFrame(this._captionsFrame);
      this._captionsFrame = null;
      this.customCaptionHtml = "";
    },
    volumeHandler(q) {

    },
    brightnessHandler(q) {

    },
    videoErrorHandler(event) {
      const error = event?.target?.error;
      console.error(
        "[Player] video element error",
        error ? `code=${error.code} message=${error.message}` : event,
        "src=", this.$refs.player?.currentSrc
      );
    },
    checkDimensions() {
      if (this.$refs.player.videoHeight > this.$refs.player.videoWidth) {
        this.isVerticalVideo = true;
        this.fullscreenHandler(true);
        this.controlsHandler();
      } else {
        this.isVerticalVideo = false;
        // Device is already physically landscape (e.g. right after switching
        // to this video while the previous one was fullscreen) — enter
        // fullscreen immediately instead of waiting for an orientation
        // "change" event that won't fire again.
        if (!this.isFullscreen && screen.orientation.type.startsWith("landscape")) {
          this.enterFullscreen(true);
        }
      }
    },
    fullscreenHandler(pressedFullscreenBtn) {
      if (pressedFullscreenBtn) this.ensureMotionPermission();
      // Toggle fullscreen state
      if (this.isFullscreen) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen(pressedFullscreenBtn);
      }
    },
    waitForResize(callback) {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("resize", onResize);
        callback();
      };
      const onResize = () => finish();
      window.addEventListener("resize", onResize);
      // Safety net only, in case resize never fires for some reason —
      // not the primary mechanism.
      setTimeout(finish, 600);
    },
    ensureMotionPermission() {
      // Must be called from directly inside a user gesture (tap) — iOS
      // silently denies the prompt otherwise. fullscreenHandler is only
      // called this way when triggered by an actual button/swipe tap.
      if (
        this._motionPermissionRequested ||
        typeof DeviceMotionEvent === "undefined" ||
        typeof DeviceMotionEvent.requestPermission !== "function"
      ) {
        return;
      }
      this._motionPermissionRequested = true;
      DeviceMotionEvent.requestPermission()
        .then((state) => {
          if (state === "granted") {
            window.addEventListener("devicemotion", this._motionOrientationHandler);
          } else {
            console.warn("[Player] devicemotion permission denied:", state);
          }
        })
        .catch((e) => {
          console.warn("[Player] DeviceMotionEvent.requestPermission failed", e);
        });
    },
    exitFullscreen() {
      // Just release the orientation lock — never force a rotation.
      // Whatever way the device is physically held is what the screen
      // should show after leaving fullscreen.
      this.releaseOrientationLock();
      this.fullscreenLock = false;
      this.verticalFullscreen = false;
      this.isFullscreen = false;
      this.$vuetube.navigationBar.show();
      this.$vuetube.statusBar.show();
    },
    exitFullscreenViaSensor() {
      // devicemotion only senses a physical tilt — it can't tell whether
      // the OS will actually honor it (e.g. flipping the phone upside
      // down into reverse-portrait, which most apps' activities refuse to
      // rotate into), and it fires well before any real rotation/relayout
      // happens. Exiting immediately on the raw sensor reading caused two
      // bugs: the player would visibly collapse out of fullscreen and then
      // jump again once the real rotation caught up, and it would collapse
      // even when the screen never actually turned at all.
      //
      // So: release the lock so the OS is free to rotate if it agrees,
      // wait for the window to actually finish resizing, and only then
      // check whether the orientation genuinely ended up wrong before
      // exiting for real.
      if (this._pendingSensorExit) return;
      this._pendingSensorExit = true;
      this.releaseOrientationLock();
      this.waitForResize(() => {
        this._pendingSensorExit = false;
        const isLandscapeNow = window.matchMedia("(orientation: landscape)").matches;
        const stillWrong = this.verticalFullscreen ? isLandscapeNow : !isLandscapeNow;
        if (stillWrong) this.exitFullscreen();
      });
    },
    releaseOrientationLock() {
      try {
        const result = screen.orientation.unlock();
        result?.catch?.((e) => this.recoverStuckOrientationLock(e));
      } catch (e) {
        this.recoverStuckOrientationLock(e);
      }
    },
    recoverStuckOrientationLock(err) {
      // Some WebView screen-orientation implementations (notably when the
      // page was locked to the orientation it was already in, e.g. when
      // auto-entering fullscreen while already landscape) leave the native
      // lock stuck after a failed/rejected unlock() — no further lock()
      // or unlock() call has any effect afterwards, breaking rotation
      // entirely. Nudge it by re-locking to whatever the device is
      // physically in right now (a trivial, always-valid lock) and
      // immediately unlocking again, which reliably clears the stuck state.
      console.warn("[Player] screen.orientation.unlock failed, recovering", err);
      try {
        const current = screen.orientation.type?.split("-")[0] || "portrait";
        screen.orientation
          .lock(current)
          ?.then(() => screen.orientation.unlock())
          ?.catch(() => {});
      } catch (e) {
        // Nothing more we can do here.
      }
    },
    enterFullscreen(force) {
      if (force) {
        this.fullscreenLock = true;
        // screen.orientation.lock() can throw synchronously (or reject) on
        // some WebViews when not called from a direct user gesture — e.g.
        // when triggered by an orientation "change" event. Never let that
        // stop the fullscreen UI state below from applying.
        try {
          if (this.isVerticalVideo) {
            // Vertical fullscreen mode (vertical video only)
            screen.orientation.lock("portrait")?.catch(() => {});
          } else {
            // Standard fullscreen mode
            screen.orientation.lock("landscape")?.catch(() => {});
          }
        } catch (e) {
          console.warn("[Player] screen.orientation.lock failed", e);
        }
        if (this.isVerticalVideo) this.verticalFullscreen = true;
      }
      this.$vuetube.navigationBar.hide();
      this.$vuetube.statusBar.hide();
      this.isFullscreen = true;

      //---   Fix pressing back button in fullscreen exiting the watch page   ---//
      this.$vuetube.addBackAction(
        new backType(
          () => {
            this.exitFullscreen();
          },
          () => {
            return this.isFullscreen;
          }
        )
      );
    },
    setStartTime(startTime) {
      // console.warn(startTime);
      if (startTime) {
        this.$refs.player.currentTime = parseInt(startTime.replace(/[^0-9]/g, ''));
        this.$refs.player.currentTime = parseInt(startTime.replace(/[^0-9]/g, ''));
      }
    },
    getPlayer() {
      return this.$refs.player;
    },

    async loadVideoViaSabr(selectedFormat = null, startTimeSec = 0) {
      return sabr.loadVideoViaSabr(this, selectedFormat, startTimeSec);
    },

    async loadAudioViaSabr(selectedFormat = null, startTimeSec = 0) {
      return sabr.loadAudioViaSabr(this, selectedFormat, startTimeSec);
    },

    async loadCombinedViaSabr(selectedVideoFormat = null, selectedAudioFormat = null, startTimeSec = 0) {
      return sabr.loadCombinedViaSabr(this, selectedVideoFormat, selectedAudioFormat, startTimeSec);
    },

    pauseHandler() {
      this.$refs.player.pause();
      clearTimeout(this.bufferingDetected);
      this.bufferingDetected = false;
    },
    playHandler() {
      this.$refs.player.play().catch(() => {});
    },
  },
};
</script>

<style>
.dim {
  filter: brightness(80%);
}
.dim-ish {
  filter: brightness(80%);
}
.invisible {
  opacity: 0;
}

/* Force white icons/text for all controls rendered on the dark video background */
.player-controls-overlay .v-icon,
.player-controls-overlay .v-btn__content,
.player-controls-overlay .v-btn .v-icon {
  color: white !important;
}

.custom-captions-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  color: white;
  font-size: 1rem;
  line-height: 1.4;
  white-space: pre-wrap;
}
.custom-captions-overlay.with-seekbar {
  bottom: calc(var(--seekbar-reserve) + 1rem);
}
.custom-captions-overlay.with-seekbar .yt-cue-flow {
  bottom: 0;
}
.custom-captions-overlay .yt-cue-flow {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 20%;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.custom-captions-overlay .yt-cue {
  text-align: center;
  padding: 0.1rem 0.4rem;
}
.custom-captions-overlay .yt-cue-placed {
  position: absolute;
  width: max-content;
  max-width: 96%;
}
.skip-button {
  background-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  border: none;
  border-radius: 5px;
  padding: 6px 12px;
  cursor: pointer;
  z-index: 9999;
}
</style>
