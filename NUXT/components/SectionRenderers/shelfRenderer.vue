<template>
  <div class="fill-width">
    <h4
      v-if="shelfTitle"
      class="font-weight-bold shelf-header"
      :style="{
        marginLeft:
          $store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak > 0
            ? '1rem'
            : '0',
      }"
    >
      {{ shelfTitle }}
    </h4>
    <div class="pa-0 min-height-0">
      <component
        :is="Object.keys(render.content)[0]"
        v-if="render.content && getComponents()[Object.keys(render.content)[0]]"
        :render="render.content[Object.keys(render.content)[0]]"
      ></component>
    </div>
    <div
      v-if="render.separator && render.separator.hasBottomSeparator"
      class="separator-bottom background"
      :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
      :style="{ height: render.separator.height + 'px' }"
    ></div>
  </div>
</template>

<script>
import verticalListRenderer from "~/components/ListRenderers/verticalListRenderer.vue";
import horizontalListRenderer from "~/components/ListRenderers/horizontalListRenderer.vue";

export default {
  components: {
    horizontalListRenderer,
    verticalListRenderer,
  },
  props: ["render"],

  computed: {
    shelfTitle() {
      const h = this.render?.headerRenderer;
      if (!h) return null;
      // TV format: shelfHeaderRenderer.title.simpleText
      const tvTitle = h.shelfHeaderRenderer?.title?.simpleText;
      if (tvTitle) return tvTitle;
      // Non-TV format: elementRenderer path
      return h.elementRenderer?.newElement?.type?.componentType?.model
        ?.shelfHeaderModel?.shelfHeaderData?.title || null;
    },
  },

  methods: {
    getComponents() {
      return this.$options.components;
    },
  },
};
</script>

<style scoped>
.shelf-header {
  width: 100%; /* Prevent Loading Weirdness */
  padding: 10px;
}
</style>
