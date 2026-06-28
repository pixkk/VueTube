<template>
  <v-btn
    fab
    text
    large
    color="white"
    :loading="Boolean(buffering)"
    @click="
      handleClick()
    "
  >
    <v-icon size="3.5rem">
      {{ paused ? "mdi-play" : "mdi-pause" }}
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
  },
  methods: {
    handleClick() {
      try {
        this.paused = !this.video.paused;

        if (this.video.paused) {
          this.$emit('play');
        } else {
          this.$emit('pause');
        }
      } catch (err) {
        console.error(err);
      }
    }
  },
  emits: ["play", "pause"],
  data: () => ({
    paused: false,
  }),
};
</script>
