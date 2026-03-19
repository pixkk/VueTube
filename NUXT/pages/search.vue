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
      const continuationCode = this.renderer.continuations?.find(
        (element) => element.nextContinuationData
      )?.nextContinuationData.continuation;

      if (continuationCode) {
        this.$youtube
          .getContinuation(
            continuationCode,
            "search"
          )
          .then((result) => {
            this.loading = false;
            // console.warn(this.renderer.contents)
            // console.warn(this.renderer.continuations)
            // console.warn(result.data)
            if (result.data.continuationContents) {
              this.renderer.contents.push(...result.data.continuationContents.sectionListContinuation.contents);
              this.renderer.continuations = result.data.continuationContents.sectionListContinuation.continuations;

              // console.warn(this.renderer.contents)
              // console.warn(this.renderer.continuations)
            }
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
