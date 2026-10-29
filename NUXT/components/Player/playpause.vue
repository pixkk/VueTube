<template>
  <v-btn
      elevation="0"
    icon
      size="3.5rem"
    variant="text"
    color="white"
    :loading="Boolean(buffering)"
    @click="video.paused ? $emit('play') : $emit('pause')"
  >
    <v-icon size="3.5rem">
      {{ ended ? "mdi-replay" : paused ? "mdi-play" : "mdi-pause" }}
    </v-icon>
  </v-btn>
</template>

<script>
export default {
  props: {
    video: {},
    buffering: {
      required: false,
    },
    ended: {
      type: Boolean,
      default: false,
    },
  },
  emits: ["play", "pause"],
  data: () => ({
    paused: false,
  }),
  watch: {
    video: {
      immediate: true,
      handler(video, oldVideo) {
        if (oldVideo) this.unbind(oldVideo);
        if (video) {
          this.paused = video.paused;
          video.addEventListener("play", this.sync);
          video.addEventListener("playing", this.sync);
          video.addEventListener("pause", this.sync);
        }
      },
    },
  },
  beforeUnmount() {
    if (this.video) this.unbind(this.video);
  },
  methods: {
    sync() {
      this.paused = this.video.paused;
    },
    unbind(video) {
      video.removeEventListener("play", this.sync);
      video.removeEventListener("playing", this.sync);
      video.removeEventListener("pause", this.sync);
    },
  },
};
</script>
