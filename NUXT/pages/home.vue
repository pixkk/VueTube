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
      <div v-for="(section, index) in recommends" :key="index">
<!--        {{section.contents[0]}}-->

        <horizontal-list-renderer :render="section.contents[0]" />
      </div>
      <vid-load-renderer v-if="loading" :count="1" />
      <observer @intersect="paginate" v-else-if="recommends.length > 0" />
    </div>
  </div>
</template>

<script>
import horizontalListRenderer from "~/components/ListRenderers/horizontalListRenderer.vue";
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import Observer from "~/components/observer.vue";
import {useTheme} from "vuetify/framework";
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
      this.$youtube
        .recommend()
        .then((result) => {
          if (result) {
            if (result.title) {
              this.title = result.title;
              this.subtitle = result.subtitle;
            } else {
              this.recommends = [result];
            }

          }
        })
        .catch((error) => {
          console.error(error);
        });
    }
  },
  async setup() {
    const { $vuetube } = useNuxtApp()
    const theme = useTheme()

    const isDark = JSON.parse(localStorage.getItem("darkTheme")) === true

    // theme.global.name.value = isDark ? 'dark' : 'light'
    theme.change(isDark ? 'dark' : 'light')

    if (localStorage.getItem("primaryDark"))
      theme.themes.value.dark.colors.primary = localStorage.getItem("primaryDark")

    if (localStorage.getItem("primaryLight"))
      theme.themes.value.light.colors.primary = localStorage.getItem("primaryLight")

    if (localStorage.getItem("backgroundDark"))
      theme.themes.value.dark.colors.background = localStorage.getItem("backgroundDark")

    if (localStorage.getItem("backgroundLight"))
      theme.themes.value.light.colors.background = localStorage.getItem("backgroundLight")

    const current = theme.current.value.colors
    const backgroundColor = current.background || '#121212'

    $vuetube.navigationBar.setTheme(backgroundColor, !isDark)
    $vuetube.statusBar.setTheme(backgroundColor, isDark)

  }
};
</script>
<style>
a {
  -webkit-user-drag: none;
}
</style>
