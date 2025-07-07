<template>
  <!--
  * Videos are now polled from '~/components/recommended.vue'
  * This is to allow use of "recommended" videos on other pages such as /watch
  * -Front
  * -->
  <div style="display: flex; flex-wrap: wrap">
    <!--   Video Loading Animation   -->
    <vid-load-renderer v-if="shorts.contents && shorts.contents.length == 0" :count="10" />
    <div v-if="shorts.contents" v-for="(section, index) in shorts.contents" :key="index" v-show="section.richItemRenderer" class="shorts-grid-item">
      <shorts-renderer v-if="section.richItemRenderer?.content?.shortsLockupViewModel"
      :shorts="section.richItemRenderer?.content?.shortsLockupViewModel" style="display: flex; flex-direction: column"
      />
    </div>
    <vid-load-renderer v-if="loading" :count="1" />
    <observer
      v-else-if="shorts.contents && shorts.contents.length > 0"
      @intersect="paginate"
    />
  </div>
</template>

<script>
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import Observer from "~/components/observer.vue";
import VideoWithContextRenderer from "~/components/gridRenderers/videoWithContextRenderer.vue";
import CompactVideoRenderer from "../../components/CompactRenderers/compactVideoRenderer.vue";
import ShortsRenderer from "~/components/channelRenderers/shortsRenderer.vue";
export default {
  components: {ShortsRenderer, CompactVideoRenderer, VideoWithContextRenderer, VidLoadRenderer, Observer },

  props: [
    "shorts",
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
    // console.warn("Mounted")
    // console.log(this.$store.state.channel.channelData);
  },
  methods: {
    paginate() {
      let recommends = this.shorts;
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
            this.shorts = { ...this.shorts };
            this.shorts.contents = this.shorts.contents.concat(
              result.contents
            );
            this.shorts.continuations =
              this.shorts.continuations.concat(result.continuations);
            this.$store.state.channel.shortsVideoData = this.shorts;
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
.shorts-grid-item {
  width: calc(100% / 3);
  padding-left: 0.1rem; padding-right: 0.1rem;
}
</style>
