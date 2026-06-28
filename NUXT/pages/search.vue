<template>
  <div class="background">
    <!--   Video Loading Animation   -->
    <vid-load-renderer v-if="!renderer || !renderer.contents" />
    <sectionListRenderer :render="renderer" />
    <vid-load-renderer v-if="loading" :count="1" />
    <observer v-if="!loading && renderer && renderer.contents" @intersect="paginate" />
  </div>
</template>

<script>
import sectionListRenderer from "~/components/ListRenderers/sectionListRenderer.vue";
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";

export default {
  components: {
    sectionListRenderer,
    VidLoadRenderer,
  },
  data() {
    return {
      renderer: [],
      loading: false,
    };
  },
  watch: {
    // Watches for new searches while the current search page is active.
    $route: {
      deep: true,
      handler(newSearch, oldSearch) {
        if (newSearch.query.q != oldSearch.query.q) {
          this.getSearch();
        }
      },
    },
  },
  mounted() {
    this.getSearch();
  },
  methods: {
    getSearch() {
      this.$store.commit("search/setLoading", true);
      const searchQuestion = this.$route.query.q;
      this.$youtube.search(searchQuestion).then((response) => {
        this.$store.commit("search/setLoading", false);
        this.renderer = response;
      });
    },
    paginate() {
      this.loading = true;
      console.warn(this.renderer)
      const continuationCode = this.renderer.continuations?.find(
        (element) => element.nextContinuationData
      )?.nextContinuationData.continuation;

      if (continuationCode) {
        this.$youtube.searchContinuation(continuationCode).then((result) => {
          this.loading = false;
          if (!result) return;

          // Both TV and non-TV: append new contents to the end of the list
          this.renderer.contents.push(...result.contents);
          this.renderer.continuations = result.continuations;
        });
      } else {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped>
.entry {
  width: 100%; /* Prevent Loading Weirdness */
}
.videoRuntimeFloat {
  position: absolute;
  bottom: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 5px;
  padding: 0px 4px 0px 4px;
}
</style>
