<template>
  <div id="watch-body" class="background" style="padding-top: env(safe-area-inset-top);">
    <div id="player-container" ref="playerContainer">
      <!-- // TODO: move component to default.vue -->
      <!-- // TODO: pass sources through vuex instead of props -->
      <player
        v-if="sources.length > 0 && video.title && video.channelName"
        ref="player"
        :video="video"
        :storyboards="storyboards"
        :sources="sources"
        :recommends="recommends"
        :disabled="saveDialog"
        @ready="startWatchTime"
      />
    </div>

    <div
      id="content-container"
      :class="{
        'overflow-y-auto': !showComments,
        'overflow-y-hidden': showComments,
      }"
    >
      <v-card v-if="loaded" class="background rounded-0" variant="flat">
        <div
          v-ripple
          class="d-flex justify-space-between align-start px-4 pt-4 w-100"
          @click="showMore = !showMore"
        >
          <div
            class="w-100"
            :class="{ 'title-fade': !showMore, }"
            :style="
              showMore
                ? 'white-space: normal; overflow-wrap: break-word; word-break: break-word;'
                : 'overflow: hidden; white-space: nowrap;'
            "
          >
            <span
              v-emoji
              :class="{ 'text-wrap': showMore }"
              style="font-size: 0.95rem; line-height: 1.15rem; font-weight: bold"
              v-text="video.title"
            />
          </div>
          <v-icon v-if="showMore" class="ml-4">mdi-chevron-up</v-icon>
          <v-icon v-else class="ml-4">mdi-chevron-down</v-icon>
        </div>

        <div class="d-flex flex-column px-4 mb-1">
          <div class="d-flex" style="gap: 8px">
            <div class="d-flex flex-column">
              <div class="caption background--text" v-text="video.channelName" style=" width: max-content;" />
            </div>

            <div
              class="caption background--text"
              style="text-align: justify; width: max-content; flex-shrink: 0; white-space: nowrap;"
              :class="
                  theme.global.current.value.dark ? 'text--lighten-4' : 'text--darken-4'
                "
              v-text="video.channelSubs + ''"
            />
            <div
              v-if="!showMore"
              style="font-size: 0.75rem; overflow: hidden; white-space: nowrap; width: 100%;"
              class="background--text title-fade"
              :class="
                theme.global.current.value.dark ? 'text--lighten-4' : 'text--darken-4'
              "
            >
              <template
                v-for="text in video.metadata.contents.find(
                  (content) => content.slimVideoInformationRenderer
                ).slimVideoInformationRenderer.collapsedSubtitle.runs"
              >{{ text.text }}</template
              >
            </div>
          </div>
        </div>
        <!-- <v-bottom-sheet
          v-model="showMore"
          color="background"
          style="z-index: 9999999"
        >
          <v-sheet style="padding: 12px">
            <v-btn
      elevation="0" block @click="showMore = !showMore"
              ><v-icon>mdi-chevron-down</v-icon></v-btn
            ><br />

            <slim-video-description-renderer
              class="scroll-y"
              :render="video.renderedData.description"
            />
          </v-sheet>
        </v-bottom-sheet> -->

        <!-- <v-bottom-sheet v-model="share" color="background" style="z-index: 9999999">
          <v-sheet style="padding: 1em">
            <div class="scroll-y">
              {{ response.renderedData.description }}
            </div>
          </v-sheet>
        </v-bottom-sheet> -->
      </v-card>

<!--      <v-divider-->
<!--        v-if="-->
<!--          !$store.state.tweaks.roundTweak || !$store.state.tweaks.roundWatch-->
<!--        "-->
<!--      />-->

      <!--   Channel Bar   -->
      <div v-if="loaded">
        <v-card
          variant="flat"
          class="channel-section py-2 px-3 background"
          :class="
            $store.state.tweaks.roundWatch && $store.state.tweaks.roundTweak > 0
              ? theme.global.current.value.dark
                ? 'background lighten-1'
                : 'background darken-1'
              : ''
          "
          :style="{
            borderRadius: $store.state.tweaks.roundWatch
              ? `${$store.state.tweaks.roundTweak / 2}rem`
              : '0',
            margin:
              $store.state.tweaks.roundWatch &&
              $store.state.tweaks.roundTweak > 0
                ? '1rem'
                : '0',
          }"
        >
          <div class="d-flex flex-column" style="flex: 3;">
            <div id="details" class="w-100">
              <NuxtLink
                to="/channel"
                class="avatar-link"
                @click="$store.dispatch('channel/fetchChannel', video.channelUrl)"
              >
                <v-img class="avatar-thumbnail" :src="video.channelImg" />
              </NuxtLink>

              <v-btn style="text-transform: uppercase; font-size: 0.8rem;" class="" color="primary">
                subscribe
              </v-btn>
            </div>
          </div>
          <div
            class="d-flex justify-space-between flex-grow-1"
            :class="
            $store.state.tweaks.roundWatch && $store.state.tweaks.roundTweak > 0
              ? theme.global.current.value.dark
                ? 'background lighten-1'
                : 'background darken-1'
              : ''
          "
            style="flex: 7;"
            :style="{
            borderRadius: $store.state.tweaks.roundWatch
              ? `${$store.state.tweaks.roundTweak / 2}rem`
              : '0',
            margin:
              $store.state.tweaks.roundWatch &&
              $store.state.tweaks.roundTweak > 0
                ? '1rem'
                : '0',
          }"
          >
            <v-btn
              elevation="0"
              v-for="(item, index) in interactions"
              :key="index"
              variant="text"
              class="vertical-button"
              style="
              padding: 8px;
              /*width: 4.2rem !important;*/
              /*height: 4.2rem !important;*/
              min-width: auto;
              text-transform: none !important;
            "
              :disabled="item.disabled"
              @click="callMethodByName(item.actionName)"
            >
              <v-icon :icon="item.icon" size="x-large" />
              <div
                class="mt-1"
                style="font-size: 0.6rem"
                v-text="item.value || item.name"
              />
            </v-btn>
            <!--   End Scrolling Div For Interactions   --->
            <!-- <hr /> -->

            <v-bottom-sheet
              v-model="moreMenu"
              style="z-index: 777777"
            >
              <template #activator="{ props: activatorProps }">
                <v-btn
                  elevation="0"
                  variant="text"
                  class="vertical-button"
                  style="
                    padding: 8px;
                    min-width: auto;
                    text-transform: none !important;
                  "
                  v-bind="activatorProps"
                >
                  <v-icon icon="mdi-dots-vertical" />
                </v-btn>
              </template>

              <v-card class="bg-background">
                <div class="d-flex align-center px-4 py-2">
                  <span class="text-subtitle-2">More</span>
                  <v-spacer />
                  <v-btn
                    elevation="0" icon variant="text" size="small" @click="moreMenu = false">
                    <v-icon>mdi-close</v-icon>
                  </v-btn>
                </div>
                <v-divider />

                <v-card-text style="max-height: 50vh; overflow-y: auto; height: 50vh" class="pa-0 d-flex flex-column">
                  <v-list-item
                    v-for="(item, index) in moreMenuItems"
                    :key="index"
                    :disabled="item.disabled"
                    @click="moreMenu = false; callMethodByName(item.actionName)"
                  >
                    <template #prepend>
                      <v-icon :icon="item.icon" />
                    </template>
                    <v-list-item-title v-text="item.name" />
                  </v-list-item>
                </v-card-text>
              </v-card>
            </v-bottom-sheet>
          </div>
        </v-card>
      </div>

      <v-divider
        v-if="
          !$store.state.tweaks.roundTweak || !$store.state.tweaks.roundWatch
        "
      />

      <!-- Description -->
      <div v-if="showMore">
        <div class="scroll-y ma-4 pt-1">
          <div
            class="mb-4">
            <template
              v-for="text in video.metadata.contents.find(
                  (content) => content.slimVideoInformationRenderer
                ).slimVideoInformationRenderer.collapsedSubtitle.runs"
            >{{ text.text }}</template
            >
          </div>

          <slim-video-description-renderer
            :render="video.renderedData.description"
            :additionalInfo="video.metadata"
          />
        </div>
      </div>

      <v-divider
        v-if="
          showMore &&
          (!$store.state.tweaks.roundTweak || !$store.state.tweaks.roundWatch)
        "
      />

      <!-- Comments -->

      <comments
        v-if="$refs.player && loaded && video?.commentData?.carouselTitles[0]?.carouselTitleViewModel.title && parseFloat(video.commentData?.carouselTitles[0]?.carouselTitleViewModel?.subtitle?.replace(',', '.')) >= 1"
        :commentsContinuations="video.commentContinuation"
        :comments="video?.commentData"
      />
<!--      <div v-if="loaded && video?.commentData?.commentCount?.runs && parseFloat(video.commentData?.commentCount?.runs[0]?.text.replace(',', '.')) >= 1" @click="toggleComment">-->
<!--        <v-card-->
<!--          v-ripple-->
<!--          flat-->
<!--          tile-->
<!--          class="comment-renderer px-3 background"-->
<!--          :class="-->
<!--            $store.state.tweaks.roundWatch && $store.state.tweaks.roundTweak > 0-->
<!--              ? theme.global.current.value.dark-->
<!--                ? 'background lighten-1'-->
<!--                : 'background darken-1'-->
<!--              : ''-->
<!--          "-->
<!--          :style="{-->
<!--            borderRadius: $store.state.tweaks.roundWatch-->
<!--              ? `${$store.state.tweaks.roundTweak / 2}rem !important`-->
<!--              : '0',-->
<!--            margin:-->
<!--              $store.state.tweaks.roundWatch &&-->
<!--              $store.state.tweaks.roundTweak > 0-->
<!--                ? '1rem'-->
<!--                : '0',-->
<!--          }"-->
<!--        >-->
<!--          <v-card-text class="comment-count keep-spaces px-0">-->
<!--            <template v-for="text in video.commentData?.headerText?.runs">-->
<!--              <template v-if="text.bold">-->
<!--                <strong :key="text.text">{{ text.text + "(" + video.commentData?.commentCount?.runs[0]?.text + ")" }}</strong>-->
<!--              </template>-->
<!--              <template v-else>{{ text.text }} {{ "(" + video.commentData?.commentCount?.runs[0]?.text + ")" }}</template>-->
<!--            </template>-->
<!--          </v-card-text>-->
<!--          <v-icon v-if="showComments" dense>mdi-unfold-less-horizontal</v-icon>-->
<!--          <v-icon v-else dense>mdi-unfold-more-horizontal</v-icon>-->
<!--        </v-card>-->
<!--      </div>-->

      <v-divider
        v-if="
          !$store.state.tweaks.roundTweak || !$store.state.tweaks.roundWatch
        "
      />

      <div
        v-if="loaded && video.commentData"
        :class="showComments ? 'comments-open' : ''"
        :style="showComments ? '' : 'display: none'"
        class="scroll-y comments"
      >
        <mainCommentRenderer
          v-model="showComments"
          :comment-data="video.commentData"
          :default-continuation="video.commentContinuation"
        ></mainCommentRenderer>
      </div>

      <!-- <swipeable-bottom-sheet
      :v-model="showComments"
      style="z-index: 9999999"
    ></swipeable-bottom-sheet> -->

      <!-- Related Videos -->
      <div v-if="!loaded">
        <v-skeleton-loader
          type="list-item-two-line, actions, divider, list-item-avatar, divider, list-item-three-line"
        />
        <vid-load-renderer :count="5" />
      </div>
      <item-section-renderer
        v-else
        :render="recommends"
        :style="{
          marginTop: $store.state.tweaks.roundTweak > 0 ? '1rem' : '0',
        }"
      />
    </div>
    <v-dialog v-model="saveDialog" width="500">
      <v-card
        class="rounded-lg"
        :class="
          theme.global.current.value.dark ? 'background lighten-1' : 'background darken-1'
        "
      >
        <v-card-title class="text-h5">Save To Playlist</v-card-title>
        <v-spacer></v-spacer>
        <v-checkbox
          v-for="(playlist, index) in playlists"
          :key="index"
          v-model="playlistsCheckbox[index]"
          class="mx-5"
          :label="playlist.name"
          @change="updatePlaylist($event, index)"
        />
        <v-divider />
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
      elevation="0" color="primary" variant="text" @click="saveDialog = false"> Done </v-btn>
        </v-card-actions>
      </v-card></v-dialog
    >
  </div>
</template>

<script>
import { Share } from "@capacitor/share";
import { getCpn } from "~/lib/utils";
import player from "~/components/Player/index.vue";
import VidLoadRenderer from "~/components/vidLoadRenderer.vue";
import ItemSectionRenderer from "~/components/SectionRenderers/itemSectionRenderer.vue";
import mainCommentRenderer from "~/components/Comments/mainCommentRenderer.vue";
import SlimVideoDescriptionRenderer from "~/components/UtilRenderers/slimVideoDescriptionRenderer.vue";

import backType from "~/lib/classes/backType";
import Comments from "../components/Player/comments.vue";
import {useTheme} from "vuetify";

export default {
  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
  components: {
    Comments,
    player,
    VidLoadRenderer,
    ItemSectionRenderer,
    mainCommentRenderer,
    SlimVideoDescriptionRenderer,
  },
  layout: "empty",
  // transition(to) { // TODO: fix layout switching
  //   return to.name == "watch"
  //     ? { name: "slide-up", mode: "" }
  //     : { name: "slide-down", mode: "" };
  // },
  data: function () {
    return this.initializeState();
  },

  computed: {
    playlists() {
      return this.$store.state.playlist.playlists;
    },
  },
  watch: {
    // Watch for change in the route query string (in this case, ?v=xxxxxxxx to ?v=yyyyyyyy)
    $route: {
      deep: true,
      handler(newRt, oldRt) {
        if (newRt.query.v && newRt.query.v != oldRt.query.v) {
          // Exit fullscreen if currently in fullscreen
          // if (this.$refs.player) this.$refs.player.webkitExitFullscreen();
          // Reset player and run getVideo function again
          // this.startTime = Math.floor(Date.now() / 1000);
          // this.getVideo();
          clearInterval(this.interval);
          Object.assign(this.$data, this.initializeState());
          this.mountedInit();
          // Switching videos inside /watch reuses this component instance
          // (same route), so stale back-actions from the previous video
          // (fullscreen exit, comment dismiss, etc.) would otherwise linger
          // in the shared back-stack and get consumed by the next back press.
          this.$vuetube.resetBackActions();
        }
      },
    },
  },

  mounted() {

    if (localStorage.getItem("devmode") === "true") {
      this.$store.commit("initTelemetryPreference");
      this.$store.commit("initRecommendationsFixPreference");
      this.$store.commit("tweaks/initTweaks");
      this.$store.commit("player/initPlayer");
      this.$store.commit("history/initHistory");
      this.$store.commit("playlist/initPlaylists");
      this.$vuetube.launchBackHandling();

      // this.$youtube.getAPI();
    }
    this.mountedInit();
    this.$vuetube.resetBackActions();
  },
  beforeUnmount() {
    clearInterval(this.interval);
  },

  methods: {
    getVideo() {
      this.loaded = false;

      const tvParams = this.$store.state.pendingTvParams;
      this.$youtube.getVid(this.$route.query.v, tvParams).then((result) => {
        // TODO: sourt "tiny" (no qualityLabel) as audio and rest as video
        // Drop premium/alt-track (xtags) variants from the video candidates, and keep
        // the audio filter on its own line so no video-only or duplicate formats leak in.
        const videoSources = result.availableResolutionsAdaptive
          .filter(s => !s.xtags && s.mimeType.includes("video"));
        const audioSources = result.availableResolutionsAdaptive
          .filter(s => s.mimeType.includes("audio"));
        this.sources = videoSources.concat(audioSources);
        this.captions = result.captions;
        this.storyboards = result.storyboards;
        console.log("Video info data", result);
        this.video = result;
        // this.video.endscreen = result.endscreen ? result.endscreen : null;
        this.video.title = this.video.title ? this.video.title : "null";
        this.video.channelName = this.video.channelName ? this.video.channelName : "null";

        //---   Content Stuff   ---//
        // this.interactions[0].value = result.metadata.likes.toLocaleString();
        this.$youtube.getReturnYoutubeDislike(this.$route.query.v, (data) => {
          this.likes = result.metadata.likesShort || result.metadata.likes || data.likes;
          this.dislikes = data.dislikes;
          this.interactions[0].value = this.likes?.toLocaleString();
          this.interactions[1].value = this.dislikes?.toLocaleString();
        });
        this.loaded = true;
        this.recommends = result.renderedData.recommendations;
        console.log("recommendations:", this.recommends);

        // Store To History
        this.$store.commit("history/addHistory", {
          id: this.video.id,
          title: this.video.title,
          channel: this.video.channelName,
        });

        this.playlistsCheckbox = this.playlists?.map(
          (playlist) =>
            playlist.videos.findIndex(
              (playlistVideo) => playlistVideo.id === this.video.id
            ) !== -1
        );

        //---   API WatchTime call   ---//
        if (this.$store.state.watchTelemetry || true) {
          this.playbackTracking = result.playbackTracking;
          this.cpn = getCpn();
        }
      });


      if (!document.pictureInPictureEnabled) {
        //this.interactions[this.interactions.length - 1].disabled = true;
        //this.interactions[this.interactions.length - 1].hidden = true;
      }
    },
    callMethodByName(name) {
      // Helper function needed because of issues when directly calling method
      // using item.action in the v-for loop
      this[name]();
    },
    async pip() {
      if (document.pictureInPictureElement) {
        // await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        // await this.$refs.player.getPlayer().requestPictureInPicture();
      }
    },
    async share() {
      // this.share = !this.share;
      await Share.share({
        title: this.video.title,
        text: this.video.title,
        url:
          "https://youtu.be/" +
          this.$route.query.v +
          "?t=" +
          Math.round(this.$refs.player.getPlayer().currentTime) +
          "s",
        dialogTitle: "Share video",
      });
    },
    // Port of TrackingService/TrackingApi from MediaServiceCore.
    startWatchTime() {
      this.watchLengthSec = parseFloat(this.video.lengthSeconds) || 0;
      this.watchOldPositionSec = 0; // mPosition - last known position of the open record
      this.watchRecordOpen = false; // containsRecord()
      this.watchRecordUpdatedAt = 0;
      this.updateWatchTime();
      clearInterval(this.interval);
      this.interval = setInterval(this.updateWatchTime, 10000);
    },

    // TrackingService.updateWatchTimeFull
    updateWatchTime() {
      const player = this.$refs.player.getPlayer();
      const positionSec = player.currentTime;
      const lengthSec = this.watchLengthSec;

      const startPointTime = 30; // start watching after 0.5 minute
      const outdatedRecordTime = 30 * 60 * 1000; // create new history record if last watchtime request was 30 minutes ago
      const endRecordTime = lengthSec * 0.02; // if video is almost watched (more than 98% watched),

      const oldPositionSec = this.watchRecordOpen
        ? this.watchOldPositionSec
        : (positionSec < startPointTime ? 0 : positionSec);

      const isVideoAlmostWatched = lengthSec > 0 && lengthSec - positionSec < endRecordTime;

      if (isVideoAlmostWatched) {
        this.sendPlaybackStats({ cpn: this.cpn, final: 1 });
        this.sendWatchtimeStats({ cpn: this.cpn, final: 1, st: lengthSec, et: lengthSec, cmt: lengthSec });
        this.watchOldPositionSec = lengthSec;
      } else {
        const needNewRecord = !this.watchRecordOpen || Date.now() - this.watchRecordUpdatedAt > outdatedRecordTime;
        if (needNewRecord) {
          this.sendPlaybackStats({ cpn: this.cpn, len: lengthSec, cmt: oldPositionSec });
        }
        this.sendWatchtimeStats({ cpn: this.cpn, len: lengthSec, st: oldPositionSec, et: positionSec, cmt: positionSec });
        this.watchOldPositionSec = positionSec;
      }
      this.watchRecordOpen = true;
      this.watchRecordUpdatedAt = Date.now();
    },

    sendPlaybackStats(params) {
      this.$youtube.saveApiStats(
        { ver: 2, ...params },
        this.playbackTracking.videostatsPlaybackUrl.baseUrl,
      );
    },

    sendWatchtimeStats(params) {
      this.$youtube.saveApiStats(
        { ver: 2, ...params },
        this.playbackTracking.videostatsWatchtimeUrl.baseUrl,
      );
    },

    initializeState() {
      return {
        moreMenu: false,
        interactions: [
          {
            name: "Likes",
            icon: "mdi-thumb-up-outline",
            // action: this.like(),
            actionName: "like",
            value: this.likes,
            disabled: true,
          },
          {
            name: "Dislikes",
            icon: "mdi-thumb-down-outline",
            // action: this.dislike(),
            actionName: "dislike",
            value: this.dislikes,
            disabled: true,
          },
          {
            name: "Share",
            icon: "mdi-share-outline",
            // action: this.share(),
            actionName: "share",
            disabled: false,
          },
          {
            name: "Save",
            icon: "mdi-plus-box-multiple-outline",
            // action: this.save()
            actionName: "save",
            disabled: false,
          },
          // {
          //   name: "Speed",
          //   icon: "mdi-speedometer",
          //   actionName: "speed",
          //   disabled: false,
          // },
        ],
        moreMenuItems: [
          {
            name: "PiP",
            icon: "mdi-picture-in-picture-bottom-right",
            actionName: "pip",
            disabled: true,
          },
        ],
        showMore: false,
        showComments: false,
        // share: false,
        sources: [],
        storyboards: null,
        captions: [],
        recommends: null,
        loaded: false,
        interval: null,
        video: null,
        backHierarchy: [],
        saveDialog: false,
        playlistsCheckbox: [],
      };
    },

    mountedInit() {
      this.startTime = Math.floor(Date.now() / 1000);
      this.getVideo();
      //  Reset vertical scrolling
      const scrollableList = document.querySelectorAll(".overflow-y-auto");
      scrollableList.forEach((scrollable) => {
        scrollable.scrollTo(0, 0);
      });
    },

    // Toggle this.showComments to true or false. If it is true, then add the dismiss function to backStack.
    toggleComment() {
      document.getElementById("content-container").scrollTo(0, 0);
      this.showComments = !this.showComments;
      if (this.showComments) {
        const dismissComment = new backType(
          () => {
            this.showComments = false;
          },
          () => {
            return this.showComments;
          }
        );
        this.$vuetube.addBackAction(dismissComment);
      }
    },

    save() {
      this.saveDialog = true;
    },

    updatePlaylist(event, index) {
      if (event) {
        this.$store.commit("playlist/addToPlaylist", {
          video: {
            id: this.video.id,
            title: this.video.title,
            channel: this.video.channelName,
          },
          index,
        });
      } else {
        this.$store.commit("playlist/removeFromPlaylist", {
          video: this.video,
          playlistIndex: index,
        });
      }
    },
  },
};
</script>

<style>
.title-fade {
  -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
  mask-image: linear-gradient(to right, black 85%, transparent 100%);
}
.comments {
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0;
  z-index: 2;
  height: 100%;
  max-height: 100%;
  position: absolute;
  pointer-events: none;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
}
.comments-open {
  transform: translatey(0);
  pointer-events: auto;
  opacity: 1;
}
#watch-body {
  height: 100%;
  max-height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

#content-container {
  height: 100%;
  position: relative;
}

.vertical-button span.v-btn__content {
  flex-direction: column;
  justify-content: space-around;
  flex: 1 1 0;
}

.channel-section,
.comment-renderer {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.channel-section #details,
.comment-renderer .comment-count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.channel-section .channel-byline {
  min-width: 0;
}

.channel-section .avatar-thumbnail {
  border-radius: 50%;
  width: 35px;
  height: 35px;
}

.channel-section .channel-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.keep-spaces {
  white-space: pre-wrap;
}

.v-card__title {
  word-break: break-word;
}
</style>
