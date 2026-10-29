<template>
  <v-btn
      elevation="0"
    icon
      size="3.5rem"
    variant="text"
    color="white"
    :loading="Boolean(buffering)"
    @click="
      (paused = !video.paused), video.paused ? $emit('play') : $emit('pause')
    "
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
};
</script>
