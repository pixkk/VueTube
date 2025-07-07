<!--TODO: PLEASE, OPIMIZE ME. DON'T USE PAGE SPECIFICATION. RELY ON LAYOUT-->
<template>
  <div style="height: 100%;">
    <div style="position: fixed; top: calc(4rem + env(safe-area-inset-top)); left: 0; right: 0; z-index: 999; background: white;">
      <v-tabs
        v-model="activeTab"
        mobile-breakpoint="0"
        background-color="background"
        :color="$vuetify.theme.dark ? 'white' : 'black'"
      >
        <v-tab
          v-for="(tab, index) in tabs"
          :key="tab[0]"
          exact
          @click="loadTabContent(index)"
        >
          {{ tab[0] }}
        </v-tab>
      </v-tabs>
    </div>

    <div style="padding-top: calc(3rem + env(safe-area-inset-top)); left: 0; right: 0; ">
      <v-tabs-items v-model="activeTab">
        <v-tab-item
          v-for="(tab, index) in tabs"
          :key="tab[0]"
        >
          <v-card>
            <v-card-text>
              <GeneralPage v-if="index === 0"
                           :avatar-url="getDataChannel().avatar"
                           :banner-url="getDataChannel().banner"
                           :description-preview="getDataChannel().descriptionPreview"
                           :subscribe-text="getDataChannel().subscribe"
                           :subscribers-count="getDataChannel().subscribers"
                           :title="getDataChannel().title"
                           :video-example="null"
                           :videos-count="getDataChannel().videosCount"
                           :subscribe-alt="getDataChannel().subscribeAlt"
                           :isLoading="isLoading"
              />
              <videos v-if="arrayWithTabs?.videos && index === tabsIndexes.videoTab"
                      :videos="getVideosOfChannel()"
              />

              <videos v-if="index !== tabsIndexes.videoTab && useVideoTabsLayout"
                      :videos="currentLayout"
              />
              <community v-if="arrayWithTabs?.communityTab && index === tabsIndexes.communityTab"
                         :community="arrayWithTabs?.communityTab"
                />
              <shorts v-if="arrayWithTabs?.shortsVideosTab && index === tabsIndexes.shortsVideosTab"
                         :shorts="arrayWithTabs?.shortsVideosTab"
                />
              <div v-if="arrayWithTabs?.playlistsTab && index === tabsIndexes.playlistsTab">
                  Playlists will be here...
              </div>
<!--              {{tabsIndexes?.communityTab}}-->
<!--              {{arrayWithTabs}}-->
<!--              <videos v-if="arrayWithTabs?.shortsVideosTab && index === tabsIndexes.shortsVideosTab"-->
<!--                      :videos="getShortsVideosOfChannel()"-->
<!--              />-->
<!--              {{ arrayWithTabs }}-->
              <about v-if="arrayWithTabs?.aboutChannelTab && index === tabsIndexes.aboutChannelTab"
              :full-channel-info="arrayWithTabs?.aboutChannelTab"
                     :another-info="getDataChannel()"
              />
<!--              <p v-if="index === tabs.length - 1">-->
<!--                {{tabsIndexes}}-->

<!--              </p>-->

            </v-card-text>
          </v-card>
        </v-tab-item>
      </v-tabs-items>
    </div>
  </div>
</template>


<script>
import GeneralPage from "./GeneralPage.vue";
import Videos from "./videos.vue";
import Community from "./community.vue";
import About from "./about.vue";
import Shorts from "~/pages/channel/shorts.vue";

export default {
  components: {Shorts, About, Community, Videos, GeneralPage},
  mounted() {
    this.isLoading = true;
  },
  data() {
    return {
      activeTab: 0,
      isLoading: false,
      loadedContent: {},
      executedTabs: new Set(),
      channelData: this.$store.state.channel.channelData,
      videoData: this.$store.state.channel.videoList,
      shortsVideoData: this.$store.state.channel.shortsVideoData,
      useVideoTabsLayout: false,
      currentLayout: {},
      arrayWithTabs: {
        communityTab: {},
        playlistsTab: {},
        aboutChannelTab: {},
        shortsVideosTab: {}
      },
      tabsIndexes: {
        channel: 0,
        communityTab: -1,
        playlistsTab: -1,
        aboutChannelTab: -1,
        shortsVideosTab: -1
      }
    };
  },
  computed: {
    tabs() {
      return this.$store.state.channel.arrayWithContinuations;
    },
  },
  watch: {
    tabs(newTabs) {
      if (newTabs.length && !this.executedTabs.has(newTabs[0][1])) {
        this.loadTabContent(0);
      }
    }
  },
  methods: {
getTabIndexes() {
  return this.tabsIndexes;
},

    getDataChannel() {
      return this.$store.state.channel.channelData;
    },
    getVideosOfChannel() {
      return this.$store.state.channel.videoData;
    },
    getShortsVideosOfChannel() {
      return this.$store.state.channel.shortsVideoData;
    },
    getCommunity() {
      return this.$store.state.channel.community;
    },
    getCommunityTab() {
      return this.$store.state.channel.community;
    },
    loadTabContent(index) {
      const token = this.tabs[index][1];
      // if (this.executedTabs.has(token)) return;
      if (this.executedTabs.has(token)) {
        return
      }

      this.executedTabs.add(token);

      this.isLoading = true;
      if (token) {
        this.doSomethingWithToken(token, index);
      } else {
        this.doSomethingWhenTokenIsNull(index);
      }
      this.isLoading = false;
    },
    async doSomethingWithToken(token, index) {
      // setTimeout(() => {
      let res = await this.$youtube.getChannelTab(this.$store.state.channel.channelRequest, token);
      this.$set(this.loadedContent, index, res);
      if (res.frameworkUpdates) {
        this.channelData = this.$store.state.channel.channelData;
        this.arrayWithTabs.channelData = this.channelData;
      }
      console.warn(res);
      switch (res?.continuationContents?.richGridContinuation?.style) {
        case "RICH_GRID_STYLE_SHORTS_GRID": {
          this.tabsIndexes.shortsVideosTab = index;
          this.arrayWithTabs.shortsVideosTab = res?.continuationContents?.richGridContinuation;
          return;
        }
        case "RICH_GRID_STYLE_SLIM": {
          this.useVideoTabsLayout = true;
          this.currentLayout = res?.continuationContents?.richGridContinuation;
          return;
        }
      }
      let sectionListContents = res?.continuationContents?.sectionListContinuation;
      console.error(sectionListContents)
      console.error(sectionListContents)
      console.error(sectionListContents)
      if (sectionListContents) {
        // console.error(sectionListContents?.contents[0]?.itemSectionRenderer?.targetId === "backstage-item-section" || sectionListContents.contents[0]?.itemSectionRenderer?.sectionIdentifier === "comment-item-section");
        if (sectionListContents.contents[0]?.itemSectionRenderer?.targetId === "backstage-item-section" || sectionListContents.contents[0]?.itemSectionRenderer?.sectionIdentifier === "comment-item-section") {
          this.tabsIndexes.communityTab = index;
          this.arrayWithTabs.communityTab = sectionListContents;
        }
        if (sectionListContents.contents[0]?.itemSectionRenderer?.contents[0]?.compactPlaylistRenderer) {
          this.tabsIndexes.playlistsTab = index;
          this.arrayWithTabs.playlistsTab = sectionListContents.contents[0]?.itemSectionRenderer?.contents;
        }
      }

      if (res?.onResponseReceivedEndpoints) {
        if (res?.onResponseReceivedEndpoints[0]?.appendContinuationItemsAction
          ?.continuationItems[0]?.aboutChannelRenderer?.metadata?.aboutChannelViewModel) {
          this.tabsIndexes.aboutChannelTab = index;
          this.arrayWithTabs.aboutChannelTab = res?.onResponseReceivedEndpoints[0]?.appendContinuationItemsAction?.continuationItems[0]?.aboutChannelRenderer?.metadata?.aboutChannelViewModel;
        }
      }

      // community = await this.$youtube.getChannel(channelRequest, "community");
      // videos = await this.$youtube.getChannel(channelRequest, "videos");
      // aboutChannelInfo = await this.$youtube.getChannel(channelRequest, "aboutChannelInfo", channel.header.pageHeaderRenderer.content.pageHeaderViewModel.attribution?.attributionViewModel?.suffix?.commandRuns ? channel.header.pageHeaderRenderer.content.pageHeaderViewModel.attribution?.attributionViewModel?.suffix?.commandRuns[0]?.onTap?.innertubeCommand?.showEngagementPanelEndpoint?.engagementPanel?.engagementPanelSectionListRenderer?.content?.sectionListRenderer?.contents[0]?.itemSectionRenderer.contents[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token : channel.header.pageHeaderRenderer.content.pageHeaderViewModel.description.descriptionPreviewViewModel.rendererContext.commandContext.onTap.innertubeCommand.showEngagementPanelEndpoint.engagementPanel.engagementPanelSectionListRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].continuationItemRenderer.continuationEndpoint.continuationCommand.token);
      // fullChannelInfo = aboutChannelInfo.onResponseReceivedEndpoints[0].appendContinuationItemsAction.continuationItems[0].aboutChannelRenderer.metadata.aboutChannelViewModel;
      // videoList = await this.$youtube.channelVideos(videos);
      // }, 300);
    },
    async doSomethingWhenTokenIsNull(index) {
      let res = this.getDataChannel();
      this.arrayWithTabs.videos = res.videoList;
      this.$store.state.channel.videoData = this.arrayWithTabs.videos;
      this.$set(this.loadedContent, index, this.arrayWithTabs.videos);
      this.tabsIndexes.videoTab = 1;
    },
    beforeDestroy() {
      this.executedTabs = new Set();
    }
  }
};
</script>
