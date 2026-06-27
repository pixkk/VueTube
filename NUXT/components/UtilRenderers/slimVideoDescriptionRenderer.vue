<template>
  <div class="description">
    <yt-text-formatter v-if="attributed" :text-runs="attributed" />
    <div v-else-if="plainText" style="white-space: pre-line">{{ plainText }}</div>
  </div>
</template>

<script>
import YtTextFormatter from "~/components/UtilRenderers/YtTextFormatterNew.vue";

export default {
  components: { YtTextFormatter },
  props: ["render"],
  computed: {
    attributed() {
      return this.render?.attributedDescriptionBodyText?.content
        ? this.render.attributedDescriptionBodyText
        : null;
    },
    plainText() {
      const runs = this.render?.descriptionBodyText?.runs;
      return runs ? runs.map((r) => r.text).join("") : null;
    },
  },
};
</script>

<style scoped>
.description {
  white-space: pre-line;
  font-size: 0.9rem;
}
</style>
