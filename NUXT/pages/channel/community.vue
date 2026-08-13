<template>
  <div>

<!--    <vid-load-renderer v-if="communityData.contents.length == 0" :count="10" />-->
    <template v-if="localCommunity?.contents[0]?.itemSectionRenderer?.contents[0]">
    <div v-for="(section, index) in localCommunity.contents[0].itemSectionRenderer.contents" :key="index">
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
        :class="theme.global.current.value.dark ? 'lighten-1' : 'darken-1'"
        style="height: 4px"
      ></div>

    </div>
    </template>

    <vid-load-renderer v-if="loading" :count="1" />
    <observer
      v-else-if="localCommunity?.contents[0]?.itemSectionRenderer?.contents.length > 0"
      @intersect="paginate"
    />
  </div>
</template>

<script>
import communityCard from "../../components/communityCard.vue";
import VideoWithContextRenderer from "@/components/gridRenderers/videoWithContextRenderer.vue";
import {useTheme} from "vuetify";
export default {
  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
  components: {
    VideoWithContextRenderer,
    communityCard,
  },
  data() {
    return {
      loading: false,
      title: "",
      subtitle: "",
      localCommunity: this.communityData,
    };
  },
  props: ["communityData"],
  watch: {
    communityData(val) {
      this.localCommunity = val;
    },
  },
  methods: {
    paginate() {
      let recommends = this.localCommunity;
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
            this.localCommunity = { ...recommends };
            this.localCommunity.contents[0].itemSectionRenderer.contents = this.localCommunity.contents[0]?.itemSectionRenderer?.contents.concat(
              result.contents
            );

            this.$store.commit("channel/setCommunity", this.localCommunity);
          });
      } else {
        this.loading = false;
      }
    },
  },
};
</script>
