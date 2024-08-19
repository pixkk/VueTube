<template>
  <!--
  * Videos are now polled from '~/components/recommended.vue'
  * This is to allow use of "recommended" videos on other pages such as /watch
  * -Front
  * -->
  <div>
    <!--   Video Loading Animation   -->
    <vid-load-renderer v-if="channelData.contents && channelData.contents.length == 0" :count="10" />
    <div v-if="channelData.contents" v-for="(section, index) in channelData.contents" :key="index">
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
      v-else-if="channelData.contents && channelData.contents.length > 0"
      @intersect="paginate"
    />
  </div>
</template>

<script>
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import Observer from "~/components/observer.vue";
import VideoWithContextRenderer from "@/components/gridRenderers/videoWithContextRenderer.vue";
export default {
  components: { VideoWithContextRenderer, VidLoadRenderer, Observer },
  data: () => ({
    loading: false,
    title: "",
    subtitle: "",
  }),

  computed: {
    channelData: {
      get() {
        return { ...this.$store.state.channel.totalData };
      },
      set(val) {
        this.$store.commit("updateChannelData", val);
      },
    },
  },

  mounted() {
    // console.log(this.$store.state.channel.channelData);
  },
  methods: {
    paginate() {
      let recommends = this.channelData;
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
            this.channelData = { ...this.channelData };
            this.channelData.contents = this.channelData.contents.concat(
              result.contents
            );
            this.channelData.continuations =
              this.channelData.continuations.concat(result.continuations);
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
