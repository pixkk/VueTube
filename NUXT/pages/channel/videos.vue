<template>
  <!--
  * Videos are now polled from '~/components/recommended.vue'
  * This is to allow use of "recommended" videos on other pages such as /watch
  * -Front
  * -->
  <div>
    <!--   Video Loading Animation   -->
    <vid-load-renderer v-if="videos.contents && videos.contents.length == 0" :count="10" />
    <div v-if="videos.contents" v-for="(section, index) in videos.contents" :key="index">
      <compact-video-renderer
        v-if="section.richItemRenderer?.content?.compactVideoRenderer?.videoId"
        :video="section.richItemRenderer?.content?.compactVideoRenderer"
      />
      <video-with-context-renderer
        v-if="
          section.richItemRenderer?.content?.videoWithContextRenderer?.videoId
        "
        :video="section.richItemRenderer?.content?.videoWithContextRenderer"
      />
    </div>
    <vid-load-renderer v-if="loading" :count="1" />
    <observer
      v-else-if="videos.contents && videos.contents.length > 0"
      @intersect="paginate"
    />
  </div>
</template>

<script>
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import Observer from "~/components/observer.vue";
import VideoWithContextRenderer from "~/components/gridRenderers/videoWithContextRenderer.vue";
import CompactVideoRenderer from "../../components/CompactRenderers/compactVideoRenderer.vue";
export default {
  components: {CompactVideoRenderer, VideoWithContextRenderer, VidLoadRenderer, Observer },

  props: [
    "videos",
    "isShorts"
  ],
  data: () => ({
    loading: false,
    title: "",
    subtitle: "",
  }),

  computed: {
    // channelData: {
    //   get() {
    //     return { ...this.$store.state.channel.totalData };
    //   },
    //   set(val) {
    //     this.$store.commit("updateChannelData", val);
    //   },
    // },
  },

  mounted() {
    console.warn("Mounted")
    // console.log(this.$store.state.channel.channelData);
  },
  methods: {
    paginate() {
      let recommends = this.videos;
      this.loading = true;
      const continuationCode =
        recommends.contents[recommends.contents.length - 1]
          ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand
          ?.token;
      if (continuationCode) {
        this.$youtube
          .recommendContinuationForChannel(continuationCode, "browse")
          .then((result) => {
            this.loading = false;
            this.videos = { ...this.videos };
            this.videos.contents = this.videos.contents.concat(
              result.contents
            );
            this.videos.continuations =
              this.videos.continuations.concat(result.continuations);
            if (!this.isShorts) {
              this.$store.state.channel.videoData = this.videos;
            }
            else {
              this.$store.state.channel.shortsVideoData = this.videos;
            }
          });
      } else {
        this.loading = false;
      }
    },
  },
};
</script>
<style>
a {
  -webkit-user-drag: none;
}
</style>
