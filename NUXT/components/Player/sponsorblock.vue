<template>
  <div
    class="sponsorblock-segments"
    :style="{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: fullscreen
        ? (controls ? '4rem' : '0')
        : '0',
      height: controls ? '4px' : (seeking ? '4px' : '2px'),
      pointerEvents: 'none',
      zIndex: 9999,
    }"
  >
    <div
      v-for="(block, i) in (blocks && blocks.segments) || []"
      :key="block.UUID || i"
      :style="{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: clampPercent((block.segment[0] / duration) * 100) + '%',
        width: clampPercent(((block.segment[1] - block.segment[0]) / duration) * 100) + '%',
        background: colors[block.category] || 'gray',
        opacity: 0.95,
        pointerEvents: 'none',
      }"
    />
  </div>
</template>

<script>
export default {
  props: {
    blocks: {
      // type: Array,
      required: true,
    },
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
    controls: {},
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
