<template>
  <div
    ref="vidcontainer"
    class="d-flex flex-column black justify-center"
    style="position: relative"
    :style="{
      width: 'auto',
      height: isFullscreen ? '100vh' : 'auto',
      maxHeight: isFullscreen ? '' : '50vh',
      borderRadius:
        $store.state.tweaks.roundWatch && !isFullscreen
          ? `${$store.state.tweaks.roundTweak / 3}rem ${$store.state.tweaks.roundTweak / 3}rem 0rem 0rem !important`
          : '0',
    }"
  >
    <video
      ref="player"
      :autoplay="true"
      mediagroup="vuetubecute"
      width="100%"
      :src="hls || dash ? '' : vidSrc"
      style="transition: filter 0.15s ease-in-out, transform 0.15s linear"
      :height="isFullscreen ? '100%' : 'auto'"
      :class="
        controls || seeking || skipping || ($store.state.player.preload && buffered < 100)
          ? verticalFullscreen && !($store.state.player.preload && buffered < 100)
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
            ? `${$store.state.tweaks.roundTweak / 3}rem ${$store.state.tweaks.roundTweak / 3}rem 0rem 0rem !important`
            : '0',
      }"
      :poster="poster"
      id="playerVideo"
      v-touch="{
        up: () => { if (!isFullscreen) fullscreenHandler(true); else if (verticalFullscreen) shortNext(); },
        down: () => { if (isFullscreen) fullscreenHandler(true); },
      }"
      @loadedmetadata="checkDimensions()"
      @click="controlsHandler()"
    >
      <track default kind="captions" id="captions" src="" />
    </video>

    <endscreen
      v-if="$refs.player?.videoHeight && isFullscreen"
      ref="endscrn"
      :endscreen="video.endscreen"
      :isFullscreen="isFullscreen"
      :video-height="$refs.player.videoHeight"
      :video-width="$refs.player.videoWidth"
      :video-block-height="$refs.player.height || $refs.vidcontainer.offsetHeight"
      :video-block-width="$refs.player.width === 100 ? $refs.vidcontainer.offsetWidth : $refs.player.width"
      :current-time="$refs.player.currentTime"
      :player-object="$refs.player"
    />

    <button
      id="skipButton"
      ref="skipButton"
      class="skip-button"
      :style="{ display: isSegment ? 'block' : 'none' }"
    >Skip {{ sBblockCategoryText }}</button>

    <audio ref="audio" mediagroup="vuetubecute" :src="hls || dash ? '' : audSrc" />

    <!-- rewind overlay -->
    <v-btn
      v-touch="{
        up: () => { if (!isFullscreen) fullscreenHandler(true); else if (verticalFullscreen) shortNext(); },
        down: () => { if (isFullscreen) fullscreenHandler(true); },
        right: () => (contain = true),
        left: () => (contain = false),
      }"
      text tile color="white"
      :class="skipping == -10 ? '' : 'invisible'"
      style="top:0;left:0;width:50%;height:100%;position:absolute;transition:opacity 0.15s;border-radius:0 100vh 100vh 0;text-transform:none;font-size:0.5rem"
      @click="controlsHandler()"
      @dblclick="skipHandler(-10)"
    ><v-icon>mdi-rewind</v-icon></v-btn>

    <!-- fast-forward overlay -->
    <v-btn
      v-touch="{
        up: () => { if (!isFullscreen) fullscreenHandler(true); else if (verticalFullscreen) shortNext(); },
        down: () => { if (isFullscreen) fullscreenHandler(true); },
        right: () => (contain = false),
        left: () => (contain = true),
      }"
      text tile color="white"
      :class="skipping == 10 ? '' : 'invisible'"
      style="top:0;left:50%;width:50%;height:100%;position:absolute;transition:opacity 0.15s;border-radius:100vh 0 0 100vh;text-transform:none;font-size:0.5rem"
      @click="controlsHandler()"
      @dblclick="skipHandler(10)"
    ><v-icon>mdi-fast-forward</v-icon></v-btn>

    <div
      v-if="seeking"
      class="d-flex justify-center"
      style="width:100%;top:0.5rem;position:absolute;font-size:0.66rem"
    >
      <v-icon small class="pr-2">mdi-rewind</v-icon>
      Double tap left or right to skip 10 seconds
      <v-icon small class="pl-2">mdi-fast-forward</v-icon>
    </div>

    <!-- controls overlay -->
    <div
      v-if="$refs.player && $refs.player.currentSrc"
      style="transition: opacity 0.15s ease-in-out"
      :style="controls && !seeking ? 'opacity:1' : 'opacity:0;pointer-events:none'"
    >
      <!-- top row -->
      <div
        style="position:absolute;width:100%;top:0.25rem;filter:drop-shadow(0 0 0.5rem #000)"
        class="d-flex justify-center px-2"
      >
        <minimize />
        <div v-if="isFullscreen" class="pt-2" @click.self="controlsHandler()">
          <h4 style="color:#fff">{{ video.title }}</h4>
          <div style="color:#aaa;font-size:0.75rem">{{ video.channelName }}</div>
        </div>
        <v-spacer />
        <settings disabled aria-disabled="true" v-if="$refs.player" class="mx-2"
          @volumeHandler="volumeHandler($event)"
          @brightnessHandler="volumeHandler($event)"
        />
        <captions v-if="$refs.player" class="mx-2"
          :captions="video.captions"
          @captionsHandler="captionsHandler($event)"
        />
        <loop v-if="$refs.player" class="mx-2"
          :loop="$refs.player.loop"
          @loop="($refs.player.loop = !$refs.player.loop), ($refs.audio.loop = !$refs.audio.loop), $store.commit('player/setLoop', $refs.player.loop)"
        />
        <close />
      </div>

      <!-- center row -->
      <div
        class="d-flex justify-center align-center"
        style="transform:translate(-50%,-50%);position:absolute;left:50%;top:50%;filter:drop-shadow(0 0 0.5rem #000)"
      >
        <v-btn v-if="!verticalFullscreen" fab text color="white" class="mx-12" disabled>
          <v-icon size="2rem" color="white">mdi-skip-previous</v-icon>
        </v-btn>
        <playpause
          v-if="$refs.player"
          :video="$refs.player"
          :buffering="bufferingDetected || false"
          @play="$refs.player.play(), $refs.audio.play()"
          @pause="pauseHandler"
        />
        <v-btn
          v-if="!verticalFullscreen"
          fab text color="white" class="mx-12"
          @click="$router.push(`/watch?v=${recommends.contents[0].videoWithContextRenderer.videoId}`)"
        >
          <v-icon size="2rem" color="white">mdi-skip-next</v-icon>
        </v-btn>
      </div>

      <!-- time + fullscreen row -->
      <div
        :style="isFullscreen ? 'bottom:4.25rem' : 'bottom:0.5rem'"
        class="d-flex justify-between align-center pl-4 pr-2"
        style="position:absolute;width:100%;filter:drop-shadow(0 0 0.5rem #000)"
        @click.self="controlsHandler()"
      >
        <watchtime
          v-if="$refs.player"
          :current-time="$refs.player.currentTime"
          :duration="$refs.player.duration"
          :controls="controls"
        />
        <v-spacer />
        <fullscreen style="z-index:2" :fullscreen="isFullscreen" @fullscreen="fullscreenHandler(true)" />
      </div>

      <!-- bottom row -->
      <div
        style="position:absolute;width:100%;bottom:0.5rem;filter:drop-shadow(0 0 0.5rem #000)"
        class="d-flex justify-between align-center px-2"
        @click.self="controlsHandler()"
      >
        <fscontrols :is-fullscreen="isFullscreen" :vertical-fullscreen="verticalFullscreen" />
        <v-spacer />
        <quality
          v-if="$refs.player && $refs.player.currentSrc && (!hls || !dash)"
          :sources="sources"
          :audioSources="audioSources"
          :current-source="$refs.player"
          :current-audio-source="$refs.audio"
          @qualityInfo="qualityInfoHandler($event)"
          @qualityAudioInfo="audioQualityInfoHandler($event)"
        />
        <speed
          v-if="$refs.player"
          class="mx-2"
          :current-speed="$refs.player.playbackRate"
          @speed="($refs.player.playbackRate = $event), ($refs.audio.playbackRate = $event), $store.state.player.speedAutosave ? $store.commit('player/setSpeed', $event) : {}"
        />
        <v-btn fab text small @click="fullscreenHandler(true)" />
      </div>
    </div>

    <progressbar
      v-if="$refs.player"
      :current-time="$refs.player.currentTime"
      :duration="$refs.player.duration"
      :fullscreen="isFullscreen"
      :controls="controls"
      :buffered="buffered"
      :seeking="seeking"
    />

    <sponsorblock
      v-if="$refs.player && sponsorBlocks.videoID"
      :duration="$refs.player.duration"
      :fullscreen="isFullscreen"
      :controls="controls"
      :seeking="seeking"
      :blocks="sponsorBlocks"
    />

    <seekbar
      v-if="$refs.player"
      v-show="!isFullscreen || controls"
      :duration="$refs.player.duration"
      :fullscreen="isFullscreen"
      :current-time="progress"
      :video="$refs.player"
      :controls="controls"
      :sources="sources"
      :seeking="seeking"
      :disabled="disabled"
      @seeking="seeking = !seeking"
      @scrub="($refs.player.currentTime = $event), ($refs.audio.currentTime = $event)"
    />

    <v-progress-circular
      v-if="$store.state.player.preload && buffered < 100"
      style="transform:translate(-50%,-50%);position:absolute;left:50%;top:50%"
      color="primary"
      :value="buffered"
      :rotate="-90"
      :size="64"
    ><b>{{ buffered }}%</b></v-progress-circular>
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
import Endscreen from "./endscreen.vue";

import backType from "~/plugins/classes/backType";
import constants from "@/plugins/constants";
import { Http } from "@capacitor-community/http";
import { convertTranscriptToVTT } from "~/plugins/utils";
import $youtube from "@/plugins/innertube";

// How many seconds ahead to keep buffered via SABR
const SABR_BUFFER_TARGET = 60;
// Fetch next chunk when less than this many seconds are buffered ahead
const SABR_FETCH_THRESHOLD = 20;

export default {
  components: {
    Endscreen, sponsorblock, progressbar, fullscreen,
    fscontrols, watchtime, playpause, captions,
    minimize, quality, seekbar, speed, close, loop, settings,
  },

  props: {
    video:       { type: Object,  required: true },
    sources:     { type: Array,   required: true },
    captions:    { type: Array },
    recommends:  { type: Object,  default: () => ({}) },
    disabled:    { type: Boolean, default: false },
  },

  data() {
    return {
      audioSources: [],
      isFullscreen: false,
      fullscreenLock: false,
      shortTransition: false,
      verticalFullscreen: false,
      midRotation: false,
      controls: false,
      seeking: false,
      contain: true,
      skipping: 0,
      progress: 0,
      buffered: 0,
      watched: 0,
      vidSrc: "",
      audSrc: "",
      hls: null,
      dash: null,
      hlsStream: null,
      isVerticalVideo: false,
      bufferingDetected: false,
      videoEnded: false,
      isMusic: false,
      sponsorBlocks: [],
      isSegment: false,
      sBblockCategoryText: "",
      endBlockTime: -1,
      poster: "",
      // SABR state
      _sabrVideo: null,
      _sabrAudio: null,
    };
  },

  async mounted() {
    screen.orientation.addEventListener("change", this._onOrientationChange);

    this.poster = await this.$youtube.getThumbnail(this.$route.query.v, "", []);

    if (this.$store.state.sponsorBlockIntegration) {
      this.$youtube.getSponsorBlock(this.video.id, (data) => {
        this.sponsorBlocks = data;
        data.segments?.forEach((block) => {
          if (block.category === "music_offtopic") {
            this.isMusic = true;
            this.$refs.audio.playbackRate = 1;
            this.$refs.player.playbackRate = 1;
          }
        });
      });
    }

    const vid = this.$refs.player;
    const aud = this.$refs.audio;

    // ── Source selection ──────────────────────────────────────────────────────

    // Remove unsupported VP9 if configured
    for (let i = this.sources.length - 1; i >= 0; i--) {
      if (
        this.sources[i].mimeType?.toLowerCase().includes("vp9") &&
        localStorage.getItem("removeVP9Codec") === "true"
      ) {
        this.sources.splice(i, 1);
      }
    }
    // Drop first entry (usually a combined format we don't want for adaptive)
    this.sources.splice(0, 1);

    const displayW = window.screen.width  * window.devicePixelRatio;
    const displayH = window.screen.height * window.devicePixelRatio;
    const smallerSide = Math.min(displayW, displayH);

    const videoSFromStorage = localStorage.getItem("videoQuality");
    const videoCodecFromStorage = localStorage.getItem("videoCodec");

    // Build audio sources array
    for (const src of this.sources) {
      if (!src.mimeType?.includes("audio")) continue;
      if (src.audioTrack !== undefined) {
        if (src.audioQuality !== "AUDIO_QUALITY_LOW") this.audioSources.push(src);
        if (src.audioTrack?.audioIsDefault === Boolean("true") && !localStorage.getItem("audioTrackId")) {
          localStorage.setItem("audioTrackId", src.audioTrack.id);
        }
      } else {
        this.audioSources.push(src);
      }
    }
    // Remove audio from sources
    for (let i = this.sources.length - 1; i >= 0; i--) {
      if (this.sources[i].mimeType?.includes("audio")) this.sources.splice(i, 1);
    }

    // Pick best video source
    let vidIdx = -1;
    const videoOnly = this.sources.filter((s, i) => { s._idx = i; return s.mimeType?.includes("video"); });

    // Exact match: codec + quality label
    if (videoSFromStorage && videoCodecFromStorage) {
      const found = videoOnly.find(s =>
        s.mimeType?.includes(videoCodecFromStorage) && s.qualityLabel?.includes(videoSFromStorage)
      );
      if (found) vidIdx = found._idx;
    }
    // Partial match: codec + resolution number
    if (vidIdx === -1 && videoSFromStorage && videoCodecFromStorage) {
      const res = videoSFromStorage.split("p")[0];
      const found = videoOnly.find(s =>
        s.mimeType?.includes(videoCodecFromStorage) && s.qualityLabel?.includes(res)
      );
      if (found) vidIdx = found._idx;
    }
    // Partial match: resolution only
    if (vidIdx === -1 && videoSFromStorage) {
      const res = videoSFromStorage.split("p")[0];
      const found = videoOnly.find(s => s.qualityLabel?.includes(res));
      if (found) vidIdx = found._idx;
    }
    // Auto: best quality ≤ display
    if (vidIdx === -1) {
      let best = 0;
      for (let i = videoOnly.length - 1; i >= 0; i--) {
        if ((videoOnly[i].height || 0) <= smallerSide) { best = videoOnly[i]._idx; break; }
      }
      vidIdx = best;
    }

    // Pick best audio source
    if (!this.audioSources[0]?.audioTrack) {
      this.audioSources.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const audioSFromStorage = localStorage.getItem("audioQuality");
      const preferred = audioSFromStorage
        ? this.audioSources.find(s => s.itag?.toString() === audioSFromStorage && s.audioQuality !== "AUDIO_QUALITY_LOW")
        : null;
      this.audSrc = (preferred || this.audioSources[0])?.url || "";
    }

    this.audioSources.sort((a, b) =>
      (a.audioTrack?.displayName || "").localeCompare(b.audioTrack?.displayName || "")
    );

    // Prefer stored audio track (dubbed audio)
    const storedTrackId = localStorage.getItem("audioTrackId");
    if (storedTrackId) {
      let found = this.audioSources.find(s => s.audioTrack?.id === storedTrackId);
      if (!found) found = this.audioSources.find(s => s.audioTrack?.id?.split(".")[0] === storedTrackId.split(".")[0]);
      if (!found) found = this.audioSources.find(s => s.audioTrack?.audioIsDefault === Boolean("true"));
      if (found) this.audSrc = found.url;
    }

    this.vidSrc = this.sources[vidIdx]?.url || "";

    // ── Streaming setup ───────────────────────────────────────────────────────

    this.hls  = this.video.hls  || null;
    this.dash = this.video.dash || null;

    if (this.hls) {
      this.hlsStream = new Hls();
      this.hlsStream.loadSource(this.hls);
      this.hlsStream.attachMedia(vid);
    } else if (this.dash) {
      const player = dashjs.MediaPlayer().create();
      player.initialize(vid, this.dash, true);
      this._dashPlayer = player;
    } else if (
      this.video.metadata?.ustreamerConfig &&
      this.video.metadata?.serverAbrStreamingUrl
    ) {
      // SABR: lazy MSE streaming
      const videoSrc = this.sources[vidIdx];
      const audioSrc = this.audioSources.find(s => s.url === this.audSrc) || this.audioSources[0];

      if (videoSrc && audioSrc) {
        this.vidSrc = "";
        this.audSrc = "";

        const [videoMsUrl, audioMsUrl] = await Promise.all([
          this._initSabrStream("video", videoSrc),
          this._initSabrStream("audio", audioSrc),
        ]).catch(e => {
          console.warn("[SABR] init failed, falling back", e);
          return [videoSrc.url, audioSrc.url];
        });

        this.vidSrc = videoMsUrl;
        this.audSrc = audioMsUrl;
      }
    }

    // ── Player event wiring ───────────────────────────────────────────────────

    const once = (el, evt, fn) => { el.addEventListener(evt, fn, { once: true }); };

    const onBothLoaded = () => {
      if (vid.readyState >= 3 && aud.readyState >= 3) {
        this._onMediaReady();
      } else {
        vid.pause(); aud.pause();
      }
    };

    once(aud, "loadeddata", () => {
      once(vid, "loadeddata", onBothLoaded);
      onBothLoaded();
    });

    // Also handle the case where video loads first
    once(vid, "loadeddata", () => {
      once(aud, "loadeddata", onBothLoaded);
      onBothLoaded();
    });

    const tParam = new URL(window.location.href).searchParams.get("t");
    if (tParam) this.setStartTime(tParam);
  },

  created() {
    screen.orientation.addEventListener("change", () => this.fullscreenHandler(false));
  },

  beforeDestroy() {
    this._cleanup();
  },

  methods: {
    // ── SABR lazy streaming ─────────────────────────────────────────────────

    async _initSabrStream(type, sourceInfo) {
      const mimeType = sourceInfo.mimeType;
      if (!window.MediaSource || !mimeType || !MediaSource.isTypeSupported(mimeType)) {
        return sourceInfo.url;
      }

      const abort = new AbortController();
      const ms    = new MediaSource();
      const msUrl = URL.createObjectURL(ms);

      const state = {
        type,
        ms,
        msUrl,
        sb: null,
        abort,
        rn: 1,
        redirectCount: 0,
        sabrUrl: this.video.metadata.serverAbrStreamingUrl,
        itag: sourceInfo.itag,
        mimeType,
        done: false,
        fetching: false,
        appendQueue: [],
        appending: false,
      };

      if (type === "video") this._sabrVideo = state;
      else                  this._sabrAudio = state;

      await new Promise(resolve => ms.addEventListener("sourceopen", resolve, { once: true }));

      try {
        state.sb = ms.addSourceBuffer(mimeType);
      } catch (e) {
        console.warn("[SABR] addSourceBuffer failed:", e);
        URL.revokeObjectURL(msUrl);
        return sourceInfo.url;
      }

      // Fetch first chunk immediately so playback can start
      await this._sabrFetchNext(state);

      return msUrl;
    },

    async _sabrFetchNext(state) {
      if (state.done || state.fetching || state.abort.signal.aborted) return;
      state.fetching = true;

      try {
        const body = this._sabrBuildBody(state.itag);
        const rawBytes = await this._sabrFetch(state.sabrUrl, body, state.rn++, state.abort.signal);
        const parts = this._sabrParseUMP(rawBytes);

        // Redirect
        const redirect = parts.find(p => p.partId === 53);
        if (redirect) {
          if (++state.redirectCount > 5) throw new Error("SABR_TOO_MANY_REDIRECTS");
          const newUrl = this._sabrParseRedirectUrl(redirect.data);
          if (newUrl) { state.sabrUrl = newUrl; state.rn = 1; }
          return;
        }
        state.redirectCount = 0;

        if (parts.find(p => p.partId === 55)) throw new Error("SABR_ERROR");

        // Backoff policy
        const policy = parts.find(p => p.partId === 44);
        if (policy) {
          const ms = this._sabrReadVarint(policy.data, 0).value;
          if (ms > 0) await new Promise(r => setTimeout(r, ms));
        }

        // Append media chunks
        const segments = this._sabrExtractMedia(parts).filter(s => s.itag === state.itag);
        for (const seg of segments) await this._sbAppend(state.sb, seg.data);

        const hasMedia    = parts.some(p => p.partId === 21);
        const hasMediaEnd = parts.some(p => p.partId === 22);
        if (hasMediaEnd && !hasMedia) state.done = true;

      } catch (e) {
        if (e?.name !== "AbortError") console.warn(`[SABR:${state.type}] fetch error:`, e);
        state.done = true;
        try { if (state.ms.readyState === "open") state.ms.endOfStream("network"); } catch (_) {}
      } finally {
        state.fetching = false;
        // If stream is complete, close MediaSource
        if (state.done && state.ms.readyState === "open") {
          try { state.ms.endOfStream(); } catch (_) {}
        }
      }
    },

    _sabrBufferedAhead(state) {
      try {
        const sb = state.sb;
        const vid = this.$refs.player;
        if (!sb || !vid) return 0;
        const ct = vid.currentTime;
        const buf = sb.buffered;
        for (let i = 0; i < buf.length; i++) {
          if (buf.start(i) <= ct + 0.5 && buf.end(i) > ct) return buf.end(i) - ct;
        }
      } catch (_) {}
      return 0;
    },

    _maybeFetchMoreSabr() {
      for (const state of [this._sabrVideo, this._sabrAudio]) {
        if (!state || state.done || state.fetching || state.abort.signal.aborted) continue;
        if (this._sabrBufferedAhead(state) < SABR_FETCH_THRESHOLD) {
          this._sabrFetchNext(state);
        }
      }
    },

    // ── SABR low-level helpers ──────────────────────────────────────────────

    _sabrBuildBody(itag) {
      const clientName    = this.context?.client?.clientName    || "WEB";
      const clientVersion = this.context?.client?.clientVersion || "2.20240101.00.00";
      const ustreamerConfig = this.video.metadata.ustreamerConfig;

      const enc = s => new TextEncoder().encode(s);
      const varint = v => {
        const b = [];
        while (v > 0x7f) { b.push((v & 0x7f) | 0x80); v = Math.floor(v / 128); }
        b.push(v & 0x7f);
        return new Uint8Array(b);
      };
      const concat = (...parts) => {
        const len = parts.reduce((n, p) => n + p.length, 0);
        const out = new Uint8Array(len);
        let off = 0;
        for (const p of parts) { out.set(p, off); off += p.length; }
        return out;
      };
      const lenDelim = (field, data) => concat(varint((field << 3) | 2), varint(data.length), data);
      const pbVarint = (field, val) => concat(varint((field << 3) | 0), varint(val));
      const pbString = (field, str) => lenDelim(field, enc(str));

      const normalized = ustreamerConfig.replace(/-/g, "+").replace(/_/g, "/");
      const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
      const ustreamerBytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));

      const CLIENT_IDS = { WEB:1,MWEB:2,ANDROID:3,IOS:5,TVHTML5:7,ANDROID_MUSIC:21,WEB_EMBEDDED_PLAYER:56 };
      const clientNameId = CLIENT_IDS[clientName] || 1;
      const clientInfo = concat(pbVarint(16, clientNameId), pbString(17, clientVersion));

      return concat(
        lenDelim(2, pbVarint(1, itag)),
        pbVarint(4, 0),
        lenDelim(5, ustreamerBytes),
        lenDelim(19, lenDelim(1, clientInfo)),
      );
    },

    async _sabrFetch(url, body, rn, signal) {
      const u = new URL(url);
      u.searchParams.set("rn", String(rn));
      const res = await fetch(u.toString(), {
        method: "POST",
        body,
        signal,
        headers: {
          "content-type": "application/x-protobuf",
          "accept": "application/vnd.yt-ump",
          "accept-encoding": "identity",
        },
      });
      if (!res.ok) throw new Error(`SABR HTTP ${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    },

    _sabrReadVarint(bytes, offset) {
      let value = 0, mul = 1, b;
      do { b = bytes[offset++]; if (b === undefined) break; value += (b & 0x7f) * mul; mul *= 128; } while (b & 0x80);
      return { value, nextOffset: offset };
    },

    _sabrParseUMP(raw) {
      const parts = [];
      let offset = 0;
      while (offset < raw.length) {
        const { value: partId, nextOffset: o1 } = this._sabrReadVarint(raw, offset);
        const { value: size,   nextOffset: o2 } = this._sabrReadVarint(raw, o1);
        parts.push({ partId, data: raw.slice(o2, o2 + size) });
        offset = o2 + size;
      }
      return parts;
    },

    _sabrParseProtoFields(data) {
      const fields = {};
      let offset = 0;
      while (offset < data.length) {
        const { value: tag, nextOffset: o1 } = this._sabrReadVarint(data, offset);
        const fieldNumber = tag >> 3, wireType = tag & 7;
        offset = o1;
        if (wireType === 0) { const r = this._sabrReadVarint(data, offset); fields[fieldNumber] = r.value; offset = r.nextOffset; }
        else if (wireType === 2) { const r = this._sabrReadVarint(data, offset); fields[fieldNumber] = data.slice(r.nextOffset, r.nextOffset + r.value); offset = r.nextOffset + r.value; }
        else if (wireType === 1) { offset += 8; }
        else if (wireType === 5) { offset += 4; }
        else break;
      }
      return fields;
    },

    _sabrExtractMedia(parts) {
      const headers = new Map();
      const segments = [];
      for (const { partId, data } of parts) {
        if (partId === 20) {
          const f = this._sabrParseProtoFields(data);
          headers.set(f[1] || 0, { itag: f[2] || 0 });
        } else if (partId === 21) {
          const { value: headerId, nextOffset } = this._sabrReadVarint(data, 0);
          const header = headers.get(headerId);
          if (header) segments.push({ itag: header.itag, data: data.slice(nextOffset) });
        }
      }
      return segments;
    },

    _sabrParseRedirectUrl(data) {
      const f = this._sabrParseProtoFields(data);
      return f[1] instanceof Uint8Array ? new TextDecoder().decode(f[1]) : null;
    },

    // ── SourceBuffer append queue ───────────────────────────────────────────

    _sbAppend(sb, data) {
      return new Promise((resolve, reject) => {
        const doAppend = () => {
          try {
            sb.appendBuffer(data);
            sb.addEventListener("updateend", resolve, { once: true });
            sb.addEventListener("error", reject,  { once: true });
          } catch (e) { reject(e); }
        };
        if (sb.updating) sb.addEventListener("updateend", doAppend, { once: true });
        else doAppend();
      });
    },

    // ── Media ready / event wiring ──────────────────────────────────────────

    _onMediaReady() {
      const vid = this.$refs.player;
      const aud = this.$refs.audio;

      this.bufferingDetected = false;
      aud.currentTime = vid.currentTime;
      aud.play();
      vid.play();

      const speed = this.isMusic ? 1 : this.$store.state.player.speed;
      vid.playbackRate = speed;
      aud.playbackRate = speed;
      vid.loop = this.$store.state.player.loop || false;
      aud.loop = this.$store.state.player.loop || false;

      vid.addEventListener("timeupdate", this._onTimeUpdate);
      vid.addEventListener("progress",   this._onProgress);
      vid.addEventListener("seeking",    this._onSeeking);
      vid.addEventListener("seeked",     this._onSeeked);
      vid.addEventListener("waiting",    this._onWaiting);
      vid.addEventListener("playing",    this._onPlaying);
      vid.addEventListener("ended",      this._onEnded);
      vid.addEventListener("pause",      () => aud.pause());
      vid.addEventListener("play",       () => aud.play());
    },

    _onOrientationChange(e) {
      const type = e?.currentTarget?.type || screen.orientation?.type;
      const vid = this.$refs.player;
      const container = this.$refs.vidcontainer;
      if (!vid || !container) return;
      if (type === "landscape-primary") {
        vid.width = container.offsetWidth;
        vid.height = "auto";
      } else if (type === "portrait-primary") {
        vid.width = container.offsetWidth;
        if (vid.height < (50 * window.innerHeight) / 100) {
          vid.height = container.offsetWidth / ((vid.videoWidth || 1) / (vid.videoHeight || 1));
        }
      }
      this.fullscreenHandler(false);
    },

    _onTimeUpdate() {
      const vid = this.$refs.player;
      const aud = this.$refs.audio;

      // Sync audio/video drift
      if (Math.abs(aud.currentTime - vid.currentTime) > 0.5) {
        aud.currentTime = vid.currentTime;
      }

      if (!this.seeking) this.progress = vid.currentTime;

      // SABR: lazy-fetch next chunk when buffer runs low
      this._maybeFetchMoreSabr();

      // SponsorBlock
      const t = vid.currentTime;
      this.endBlockTime = -1;
      this.sponsorBlocks?.segments?.forEach(block => {
        if (t >= block.segment[0] && t < block.segment[1]) {
          this.endBlockTime = block.segment[1];
          this.isSegment = true;
          this.sBblockCategoryText = block.category;
          this.$refs.skipButton.onclick = () => {
            vid.currentTime = block.segment[1];
            this.$youtube.showToast?.("Skipped " + block.category);
          };
        }
      });
      if (t > this.endBlockTime) this.isSegment = false;
    },

    _onProgress() {
      const vid = this.$refs.player;
      const aud = this.$refs.audio;
      if (aud.paused && !vid.paused && vid.readyState >= 3) aud.play();
      try { this.buffered = (vid.buffered.end(0) / vid.duration) * 100; } catch (_) {}
    },

    _onSeeking() {
      this.bufferingDetected = true;
      this.$refs.player.pause();
      this.$refs.audio.pause();
    },

    _onSeeked() {
      setTimeout(() => {
        this.$refs.player.play();
        this.$refs.audio.play();
        this.$refs.audio.currentTime = this.$refs.player.currentTime;
        this.bufferingDetected = false;
      }, 300);
    },

    _onWaiting() {
      this.bufferingDetected = true;
      setTimeout(() => {
        if (!this.$refs.player.paused) this.$refs.audio.pause();
      }, 800);
    },

    _onPlaying() {
      this.videoEnded = false;
      this.$refs.audio.play();
      setTimeout(() => { this.bufferingDetected = false; }, 300);
    },

    _onEnded() {
      this.videoEnded = true;
    },

    // ── Cleanup ─────────────────────────────────────────────────────────────

    _cleanup() {
      // Abort SABR streams
      for (const state of [this._sabrVideo, this._sabrAudio]) {
        if (!state) continue;
        state.abort.abort();
        try { if (state.ms.readyState === "open") state.ms.endOfStream("network"); } catch (_) {}
        URL.revokeObjectURL(state.msUrl);
      }
      this._sabrVideo = null;
      this._sabrAudio = null;

      if (this.hlsStream) { this.hlsStream.destroy(); this.hlsStream = null; }
      if (this._dashPlayer) { try { this._dashPlayer.reset(); } catch (_) {} this._dashPlayer = null; }

      if (this.isFullscreen) this.exitFullscreen();
      if (this._controlsTimeout) clearTimeout(this._controlsTimeout);

      const vid = this.$refs.player;
      if (vid) {
        vid.pause();
        vid.removeEventListener("timeupdate", this._onTimeUpdate);
        vid.removeEventListener("progress",   this._onProgress);
        vid.removeEventListener("seeking",    this._onSeeking);
        vid.removeEventListener("seeked",     this._onSeeked);
        vid.removeEventListener("waiting",    this._onWaiting);
        vid.removeEventListener("playing",    this._onPlaying);
        vid.removeEventListener("ended",      this._onEnded);
        vid.src = "";
        vid.load();
      }

      screen.orientation.removeEventListener("change", this._onOrientationChange);
    },

    // ── Player controls ──────────────────────────────────────────────────────

    pauseHandler() {
      this.$refs.player.pause();
      this.$refs.audio.pause();
      if (this._controlsTimeout) clearTimeout(this._controlsTimeout);
      this.bufferingDetected = false;
    },

    skipHandler(time) {
      this.skipping = time;
      setTimeout(() => { this.skipping = false; }, 500);
      this.$refs.player.currentTime += time;
      this.$refs.audio.currentTime  += time;
    },

    controlsHandler() {
      if (this.seeking) return;
      if (this.controls) {
        clearTimeout(this._controlsTimeout);
        this.controls = false;
        return;
      }
      setTimeout(() => {
        if (!this.skipping) {
          this._controlsTimeout = setTimeout(() => {
            if (!this.seeking && !this.$refs.player?.paused) this.controls = false;
          }, 2345);
          this.controls = this._controlsTimeout;
        }
      }, 250);
    },

    shortNext() {
      this.shortTransition = true;
      setTimeout(() => {
        this.$router.push(`/watch?v=${this.recommends.contents[0].videoWithContextRenderer.videoId}`);
      }, 150);
    },

    setStartTime(startTime) {
      if (startTime && this.$refs.player) {
        this.$refs.player.currentTime = parseInt(startTime.replace(/\D/g, ""));
      }
    },

    checkDimensions() {
      const vid = this.$refs.player;
      if (!vid) return;
      this.isVerticalVideo = vid.videoHeight > vid.videoWidth;
      if (this.isVerticalVideo) { this.fullscreenHandler(true); this.controlsHandler(); }
    },

    getCodecName(codec) {
      if (codec.includes("av01"))  return "av01";
      if (codec.includes("avc1"))  return "avc1";
      if (codec.includes("opus"))  return "opus";
      if (codec.includes("mp4a"))  return "mp4a";
      return "vp9";
    },

    qualityInfoHandler(q) {
      localStorage.setItem("videoQuality", q.qualityLabel);
      localStorage.setItem("videoCodec", this.getCodecName(q.mimeType.replace("; codecs=", ". Codecs: ")));
      const time  = this.$refs.player.currentTime;
      const speed = this.$refs.player.playbackRate;
      this.$refs.player.pause();
      this.$refs.player.src = q.url;
      this.$refs.player.currentTime  = time;
      this.$refs.player.playbackRate = speed;
      this.$refs.audio.currentTime   = time;
      this.$refs.audio.playbackRate  = speed;
      this.hls = false; this.dash = false; this.hlsStream = null;
    },

    audioQualityInfoHandler(q) {
      localStorage.setItem("audioQuality", q.itag);
      localStorage.setItem("audioCodec", this.getCodecName(q.mimeType.replace("; codecs=", ". Codecs: ")));
      const time  = this.$refs.player.currentTime;
      const speed = this.$refs.player.playbackRate;
      this.$refs.player.pause();
      this.$refs.audio.src = q.url;
      this.$refs.audio.currentTime   = time;
      this.$refs.player.currentTime  = time;
      this.$refs.audio.playbackRate  = speed;
      this.$refs.player.playbackRate = speed;
      this.hls = false; this.dash = false; this.hlsStream = null;
      this.audioSources.forEach(s => {
        if (s.url === q.url && s.audioTrack?.id) localStorage.setItem("audioTrackId", s.audioTrack.id);
      });
      const interval = setInterval(() => {
        if (this.$refs.audio.readyState < 3) {
          this.$refs.player.pause();
          this.bufferingDetected = true;
        } else {
          this.bufferingDetected = false;
          this.$refs.player.play();
          clearInterval(interval);
        }
      }, 500);
    },

    async captionsHandler(q) {
      if (q.baseUrl == null) {
        document.getElementById("captions").src = "";
        return;
      }
      let html = await Http.get({
        url: (constants.URLS.YT_MOBILE + q.baseUrl).replace("https://www.youtube.com", ""),
        params: {},
      }).catch(e => e);

      let captions;
      if (html.data) {
        captions = convertTranscriptToVTT(html.data);
      } else {
        const r = await this.$youtube.getCaptions(this.video.id);
        this.video.captions = r.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        for (const track of this.video.captions || []) {
          if (track.languageCode !== q.languageCode) continue;
          html = await Http.get({
            url: (constants.URLS.YT_MOBILE + track.baseUrl).replace("https://www.youtube.com", ""),
            params: {},
          }).catch(e => e);
          captions = convertTranscriptToVTT(html.data);
        }
      }

      const blob = new Blob([captions], { type: "text/plain" });
      const reader = new FileReader();
      reader.onloadend = () => { document.getElementById("captions").src = reader.result; };
      reader.readAsDataURL(blob);

      document.getElementById("__nuxt")?.classList.add("web", "chrome");
    },

    volumeHandler() {},
    brightnessHandler() {},

    // ── Fullscreen ────────────────────────────────────────────────────────────

    fullscreenHandler(pressedButton) {
      if (this.midRotation) { this.midRotation = false; return; }
      if (this.isFullscreen) this.exitFullscreen(pressedButton);
      else                   this.enterFullscreen(pressedButton);
    },

    exitFullscreen(unlock) {
      if (unlock) {
        if (this.verticalFullscreen) {
          screen.orientation.unlock();
          this.fullscreenLock = false;
          this.verticalFullscreen = false;
        } else {
          this.midRotation = true;
          screen.orientation.lock("portrait");
          this.fullscreenLock = true;
          setTimeout(() => { this.fullscreenLock = false; screen.orientation.unlock(); }, 2000);
        }
      }
      this.$vuetube.navigationBar.show();
      this.$vuetube.statusBar.show();
      this.isFullscreen = false;
    },

    enterFullscreen(force) {
      if (force) {
        this.fullscreenLock = true;
        if (this.isVerticalVideo) { screen.orientation.lock("portrait"); this.verticalFullscreen = true; }
        else                      { this.midRotation = true; screen.orientation.lock("landscape"); }
      }
      this.$vuetube.navigationBar.hide();
      this.$vuetube.statusBar.hide();
      this.isFullscreen = true;
      this.$vuetube.addBackAction(new backType(
        () => this.exitFullscreen(true),
        () => this.isFullscreen,
      ));
    },

    getPlayer() {
      return this.$refs.player;
    },
  },
};
</script>

<style scoped>
.dim      { filter: brightness(33%); }
.dim-ish  { filter: brightness(66%); }
.invisible { opacity: 0; }
.skip-button {
  position: absolute; bottom: 10px; right: 10px; margin-bottom: 5rem;
  background-color: var(--v-primary-base); color: white;
  border: none; border-radius: 5px; cursor: pointer; z-index: 9999;
}
</style>

<style>
.chrome video::cue {
  opacity: 1;
  background-color: black;
  transform: translateY(10%) !important;
}
</style>
