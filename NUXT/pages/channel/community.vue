<template>
  <div>

<!--    <vid-load-renderer v-if="communityData.contents.length == 0" :count="10" />-->
    <div v-if="community?.contents[0]?.itemSectionRenderer?.contents[0]" v-for="(section, index) in community.contents[0].itemSectionRenderer.contents" :key="index">
<!--        {{-->
<!--        section.backstagePostThreadRenderer.post.backstagePostRenderer}}-->
      <community-card
          v-if="section.backstagePostThreadRenderer"
        :channel-name="
          section.backstagePostThreadRenderer.post.backstagePostRenderer
            .authorText.runs[0].text
        "
        :channel-thumbnail="`https:`+section.backstagePostThreadRenderer.post.backstagePostRenderer.authorThumbnail.thumbnails[section.backstagePostThreadRenderer.post.backstagePostRenderer.authorThumbnail.thumbnails.length - 1].url"
        :published-time="section.backstagePostThreadRenderer.post.backstagePostRenderer.publishedTimeText.runs[0].text"
        :text="section.backstagePostThreadRenderer.post.backstagePostRenderer.contentText"
        :votes-count="section.backstagePostThreadRenderer.post.backstagePostRenderer.voteCount?.runs[0]?.text || ''"
        :backstage-attachment="section.backstagePostThreadRenderer.post.backstagePostRenderer"
      />
      <div
        v-if="
        !($store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak > 0)
      "
        class="separator-bottom background"
        :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
        style="height: 4px"
      ></div>

    </div>

    <vid-load-renderer v-if="loading" :count="1" />
    <observer
      v-else-if="community?.contents[0]?.itemSectionRenderer?.contents.length > 0"
      @intersect="paginate"
    />
  </div>
</template>

<script>
import communityCard from "../../components/communityCard.vue";
import VideoWithContextRenderer from "@/components/gridRenderers/videoWithContextRenderer.vue";
export default {
  components: {
    VideoWithContextRenderer,
    communityCard,
  },
  data: () => ({
    loading: false,
    title: "",
    subtitle: "",
  }),
  props: ["community"],
  computed: {
    // communityData: {
    //   get() {
    //     return { ...this.$store.state.channel.community };
    //   },
    //   set(val) {
    //     this.$store.commit("updateCommunityData", val);
    //   },
    // },
  },
  methods: {
    paginate() {
      let recommends = this.community;
      this.loading = true;
      const continuationCode =
          recommends?.contents[0]?.itemSectionRenderer?.contents[recommends?.contents[0]?.itemSectionRenderer?.contents.length - 1]
          ?.continuationItemRenderer?.continuationEndpoint?.continuationCommand
          ?.token;
      if (continuationCode) {
        this.$youtube
          .recommendContinuationForChannel(continuationCode, "browse")
          .then((result) => {
            this.loading = false;
            this.community = { ...this.community };
            this.community.contents[0].itemSectionRenderer.contents = this.community.contents[0]?.itemSectionRenderer?.contents.concat(
              result.contents
            );

            // this.community.contents[0].itemSectionRenderer.contents =
            //   this.community.contents[0]?.itemSectionRenderer?.continuations.concat(result.continuations);
            this.$store.state.channel.community = this.community;
          });
      } else {
        this.loading = false;
      }
    },
  },
};
</script>
