<template>
  <!-- Fills its parent container — the parent decides position and size -->
  <div
    class="sponsorblock-segments"
    style="position: absolute; top: 0; bottom: 0; left: 0; right: 0; pointer-events: none;"
  >
    <div
      v-for="(block, i) in (blocks && blocks.segments) || []"
      :key="block.UUID || i"
      style="position: absolute; top: 0; bottom: 0; pointer-events: none; opacity: 0.95;"
      :style="{
        left: clampPercent((block.segment[0] / duration) * 100) + '%',
        width: clampPercent(((block.segment[1] - block.segment[0]) / duration) * 100) + '%',
        background: colors[block.category] || 'gray',
      }"
    />
  </div>
</template>

<script>
export default {
  props: {
    blocks: {
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  data: () => ({
    colors: {
      sponsor: "#00d400",
      selfpromo: "#ffff00",
      exclusive_access: "#008a8a",
      interaction: "#cc00ff",
      poi_highlight: "#ff1493",
      intro: "#00ffff",
      outro: "#0202ed",
      music_offtopic: "#ff9900",
      filter: "#735fb1",
      preview: "#008fd6",
    },
  }),
  methods: {
    clampPercent(v) {
      if (!isFinite(v) || isNaN(v)) return 0;
      return Math.max(0, Math.min(100, v));
    },
  },
};
</script>
