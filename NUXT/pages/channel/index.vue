<!--TODO: PLEASE, OPIMIZE ME. DON'T USE PAGE SPECIFICATION. RELY ON LAYOUT-->
<template>
  <div style="height: 100%;">
    <div style="position: fixed; top: calc(4rem + env(safe-area-inset-top)); left: 0; right: 0; z-index: 999; background: white;">
      <v-tabs
        v-model="activeTab"
        mobile-breakpoint="0"
        background-color="background"
        :color="theme.global.current.value.dark ? 'white' : 'black'"
      >
        <v-tab
          v-for="(tab, index) in tabs"
          :key="tab[0]"
          exact
        >
          {{ tab[0] }}
        </v-tab>
      </v-tabs>
    </div>

    <div style="padding-top: calc(3rem + env(safe-area-inset-top)); left: 0; right: 0; ">
      <v-window v-model="activeTab">
        <v-window-item
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
              <videos v-if="tabTypes[index] === 'video'"
                      :videos="getVideosOfChannel()"
              />

              <videos v-if="tabTypes[index] === 'slim'"
                      :videos="tabContents[index]"
              />
              <community v-if="tabTypes[index] === 'community'"
                         :communityData="tabContents[index]"
                />
              <shorts v-if="tabTypes[index] === 'shorts'"
                         :shortsData="tabContents[index]"
                />
              <div v-if="tabTypes[index] === 'playlists'">
                  Playlists will be here...
              </div>
              <about v-if="tabTypes[index] === 'about'"
              :full-channel-info="tabContents[index]"
                     :another-info="getDataChannel()"
              />

            </v-card-text>
          </v-card>
        </v-window-item>
      </v-window>
    </div>
  </div>
</template>


<script>
import GeneralPage from "./GeneralPage.vue";
import Videos from "./videos.vue";
import Community from "./community.vue";
import About from "./about.vue";
import Shorts from "~/pages/channel/shorts.vue";
import {useTheme} from "vuetify";

export default {
  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
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
      // Content is keyed by tab index so that switching tabs never lets one
      // tab's freshly-loaded data bleed into another tab's slot.
      tabTypes: {},
      tabContents: {},
    };
  },
  computed: {
    tabs() {
      return this.$store.state.channel.arrayWithContinuations;
    },
  },
  watch: {
    activeTab(newIndex) {
      console.log('Active tab changed to:', newIndex);
      this.loadTabContent(newIndex);
    },
    tabs(newTabs) {
      if (newTabs.length && !this.executedTabs.has(newTabs[0][1])) {
        this.loadTabContent(0);
      }
    }
  },
  methods: {
    getDataChannel() {
      return this.$store.state.channel.channelData;
    },
    getVideosOfChannel() {
      return this.$store.state.channel.videoData;
    },
    loadTabContent(index) {
      console.log(index)
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
      let res = await this.$youtube.getChannelTab(this.$store.state.channel.channelRequest, token);
      this.loadedContent[index] = res;
      if (res.frameworkUpdates) {
        this.channelData = this.$store.state.channel.channelData;
      }
      switch (res?.continuationContents?.richGridContinuation?.style) {
        case "RICH_GRID_STYLE_SHORTS_GRID": {
          this.tabTypes[index] = "shorts";
          this.tabContents[index] = res?.continuationContents?.richGridContinuation;
          return;
        }
        case "RICH_GRID_STYLE_SLIM": {
          this.tabTypes[index] = "slim";
          this.tabContents[index] = res?.continuationContents?.richGridContinuation;
          return;
        }
      }
      let sectionListContents = res?.continuationContents?.sectionListContinuation;
      if (sectionListContents) {
        if (sectionListContents.contents[0]?.itemSectionRenderer?.targetId === "backstage-item-section" || sectionListContents.contents[0]?.itemSectionRenderer?.sectionIdentifier === "comment-item-section") {
          this.tabTypes[index] = "community";
          this.tabContents[index] = sectionListContents;
        }
        if (sectionListContents.contents[0]?.itemSectionRenderer?.contents[0]?.compactPlaylistRenderer) {
          this.tabTypes[index] = "playlists";
          this.tabContents[index] = sectionListContents.contents[0]?.itemSectionRenderer?.contents;
        }
      }

      if (res?.onResponseReceivedEndpoints) {
        if (res?.onResponseReceivedEndpoints[0]?.appendContinuationItemsAction
          ?.continuationItems[0]?.aboutChannelRenderer?.metadata?.aboutChannelViewModel) {
          this.tabTypes[index] = "about";
          this.tabContents[index] = res?.onResponseReceivedEndpoints[0]?.appendContinuationItemsAction?.continuationItems[0]?.aboutChannelRenderer?.metadata?.aboutChannelViewModel;
        }
      }
    },
    async doSomethingWhenTokenIsNull(index) {
      let res = this.getDataChannel();
      this.loadedContent[index] = res.videoList;
      this.$store.state.channel.videoData = res.videoList;
      this.tabTypes[index] = "video";
    },
  },
  beforeUnmount() {
    this.executedTabs = new Set();
  }
};
</script>
