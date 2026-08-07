<template>
  <!--
  * Videos are now polled from '~/components/recommended.vue'
  * This is to allow use of "recommended" videos on other pages such as /watch
  * -Front
  * -->
  <div>
    <div v-if="title.length > 0" class="title text-center" style="height: 100%; display: flex; justify-content: center; align-items: center; flex-direction: column;">
      <div style="width: 90%;">
        <h4>{{ title !== undefined ? title : "Try search some videos!" }}</h4>
        <h6>{{ subtitle }}</h6>
      </div>
    </div>
    <div v-if="title.length <= 0">
      <!--   Video Loading Animation   -->
      <vid-load-renderer v-if="recommends.length == 0" :count="10" />
      <v-pull-to-refresh
      @load="loadRecommendations"
      >
        <div v-for="(section, index) in recommends" :key="index">
          <!--        {{section.contents[0]}}-->

          <horizontal-list-renderer :render="section.contents[0]" />
        </div>
        <vid-load-renderer v-if="loading" :count="1" />
        <observer @intersect="paginate" v-else-if="recommends.length > 0" />
      </v-pull-to-refresh>

    </div>
  </div>
</template>

<script>
import horizontalListRenderer from "~/components/ListRenderers/horizontalListRenderer.vue";
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import Observer from "~/components/observer.vue";
export default {
  components: { horizontalListRenderer, VidLoadRenderer, Observer },
  data: () => ({
    loading: false,
    title: "",
    subtitle: "",
  }),

  computed: {
    recommends: {
      get() {
        return [...this.$store.state.recommendedVideos];
      },
      set(val) {
        this.$store.commit("updateRecommendedVideos", val);
      },
    },
  },
  methods: {
    paginate() {
      this.loading = true;
      const continuationCode = this.recommends[
        this.recommends.length - 1
      ].continuations.find((element) => element.nextContinuationData)
        ?.nextContinuationData.continuation;
      if (continuationCode) {
        this.$youtube
          .recommendContinuation(
            this.recommends[this.recommends.length - 1].continuations.find(
              (element) => element.nextContinuationData
            ).nextContinuationData.continuation,
            "browse"
          )
          .then((result) => {
            this.loading = false;
            this.recommends.push(result);
          });
      } else {
        this.loading = false;
      }
    },
    async loadRecommendations(options) {
      try {
        const result = await this.$youtube.recommend();
        if (result) {
          if (result.title) {
            this.title = result.title;
            this.subtitle = result.subtitle;
          } else {
            this.recommends = [result];
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        options?.done?.();
      }
    }
  },

  async mounted() {
    if (localStorage.getItem("devmode") === "true") {
      this.$store.commit("initTelemetryPreference");
      this.$store.commit("initRecommendationsFixPreference");
      this.$store.commit("tweaks/initTweaks");
      this.$store.commit("player/initPlayer");
      this.$store.commit("history/initHistory");
      this.$store.commit("playlist/initPlaylists");
      await this.$vuetube.launchBackHandling();

      await this.$youtube.getAPI();
    }
    if (!this.recommends.length) {
      await this.loadRecommendations();
    }
  },
};
</script>
<style>
a {
  -webkit-user-drag: none;
}
</style>
