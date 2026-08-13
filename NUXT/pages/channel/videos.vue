<template>
  <!--
  * Videos are now polled from '~/components/recommended.vue'
  * This is to allow use of "recommended" videos on other pages such as /watch
  * -Front
  * -->
  <div>
    <!--   Video Loading Animation   -->
    <vid-load-renderer v-if="localVideos.contents && localVideos.contents.length == 0" :count="10" />
    <template v-if="localVideos.contents">
    <div v-for="(section, index) in localVideos.contents" :key="index">
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
    </template>
    <vid-load-renderer v-if="loading" :count="1" />
    <observer
      v-else-if="localVideos.contents && localVideos.contents.length > 0"
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
  data() {
    return {
      loading: false,
      title: "",
      subtitle: "",
      localVideos: this.videos,
    };
  },

  watch: {
    videos(val) {
      this.localVideos = val;
    },
  },

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
      let recommends = this.localVideos;
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
            this.localVideos = { ...this.localVideos };
            this.localVideos.contents = this.localVideos.contents.concat(
              result.contents
            );
            this.localVideos.continuations =
              this.localVideos.continuations.concat(result.continuations);
            if (!this.isShorts) {
              this.$store.state.channel.videoData = this.localVideos;
            }
            else {
              this.$store.state.channel.shortsVideoData = this.localVideos;
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
