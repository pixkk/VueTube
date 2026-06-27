<template>
  <div>
    <v-list-item
      v-for="(video, index) in render.items"
      :key="index"
      class="pa-0 min-height-0"
    >
      <component
        v-if="getComponents()[Object.keys(video)[0]]"
        :is="Object.keys(video)[0]"
        :key="video[Object.keys(video)[0]].videoId"
        :video="video[Object.keys(video)[0]]"
      ></component>
    </v-list-item>
  </div>
</template>

<script>
import compactVideoRenderer from "~/components/CompactRenderers/compactVideoRenderer.vue";
import gridVideoRenderer from "~/components/gridRenderers/gridVideoRenderer.vue";
import tileRenderer from "~/components/gridRenderers/tileRenderer.vue";

export default {
  components: {
    gridVideoRenderer,
    compactVideoRenderer,
    tileRenderer,
  },
  props: ["render"],

  methods: {
    getComponents() {
      return this.$options.components;
    },
  },

  mounted() {
    console.log("horizontalListRenderer received: ", this.render);
  },
};
</script>
