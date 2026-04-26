<template>
  <!-- Thin progress bar: sits at the very bottom of the player.
       Visible only when controls are hidden — when controls appear, the seekbar takes over. -->
  <div
    :class="controls ? 'invisible' : ''"
    style="position: absolute; z-index: 5; width: 100%; left: 0; bottom: 0;"
  >
    <v-progress-linear
      style="background: #ffffff22;"
      background-opacity="0.5"
      background-color="white"
      :buffer-value="buffered"
      :model-value="(currentTime / duration) * 100"
      color="primary"
      :height="seeking ? 4 : 2"
    />
    <!-- Sponsorblock segments over the thin bar -->
    <sponsorblock
      v-if="blocks && blocks.segments"
      :blocks="blocks"
      :duration="duration"
    />
  </div>
</template>
<script>
import sponsorblock from "~/components/Player/sponsorblock.vue";

export default {
  components: { sponsorblock },
  props: {
    duration: {
      type: Number,
      required: true,
    },
    seeking: {
      type: Boolean,
      required: true,
    },
    fullscreen: {
      type: Boolean,
      required: true,
    },
    currentTime: {
      type: Number,
      required: true,
    },
    controls: {},
    buffered: {
      type: Number,
      required: true,
    },
    blocks: {
      default: null,
    },
  },
};
</script>
