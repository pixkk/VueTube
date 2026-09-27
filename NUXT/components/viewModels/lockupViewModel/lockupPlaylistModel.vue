<template>
  <v-card
    class="entry videoRenderer background overflow-hidden"
    :to="`/watch?v=${video.rendererContext?.commandContext.onTap.innertubeCommand.watchEndpoint?.videoId}&list=${video.rendererContext?.commandContext.onTap.innertubeCommand.watchEndpoint?.playlistId}`"
    :style="{
      borderRadius: roundThumb ? `${roundTweak / 2}rem` : '0',
      margin:
        roundThumb && roundTweak > 0 ? '0 1rem 1rem 1rem' : '0 0 0.25rem 0',
    }"
    flat
  >
    <div style="position: absolute; margin-left: 1.5rem; margin-right: 1.5rem; transform: translateY(20%); height: 1rem; inset: 0; z-index: 0; background-color: rgb(165 165 165)">
<!--      playlist placeholder -->
    </div>
    <div style="position: absolute; margin-left: 1.25rem; margin-right: 1.25rem; transform: translateY(55%); height: 1rem; inset: 0; z-index: 1; background-color: rgb(83 83 83)">
<!--      playlist placeholder -->
    </div>
    <div style="position: relative; margin: 1rem; z-index: 2"
         :class="thumbnailAutoWidth ? 'thumbnail-container-auto-width overflow-hidden' : 'thumbnail-container overflow-hidden'">
      <v-img
        :aspect-ratio="16 / 9"
        :src="thumbnailUrl"
        :style="{
          borderRadius: roundThumb ? `${roundTweak / 12}rem` : '0',
        }"
      />
      <div
        v-if="thumbnailOverlayText && thumbnailOverlayStyle"
        class="videoRuntimeFloat"
        :class="'style-' + thumbnailOverlayStyle"
        style="color: #fff"
      >
        <span class="mdi mdi-access-point"></span>
        {{thumbnailOverlayText}}
      </div>
    </div>
    <div
      id="details"
      class="background mt-1 d-flex flex-row"
      :class="
        roundThumb && roundTweak > 0
          ? theme.global.current.value.dark
            ? 'lighten-1'
            : 'darken-1'
          : ''
      "
      :style="{
        borderRadius: roundThumb ? `${roundTweak / 12}rem` : '0',
      }"
    >
      <a
        v-if="channelIcon"
        class="avatar-link pl-2 pt-2"
        @click.prevent="
          $store.dispatch('channel/fetchChannel', channelUrl),
            $router.push('/channel')
        "
      >
        <v-img v-if="channelIcon" class="avatar-thumbnail" :src="channelIcon" />
      </a>
      <v-card-text class="video-info pt-2" v-emoji>
        <span
          style="margin-top: 0.5em"
          class="font-weight-medium vid-title"
        >
<!--          {{titles}}-->
          {{ titles[0]?.text ? titles[0].text : titles }}
        </span>

        <div
          class="background--text caption"
          :class="theme.global.current.value.dark ? 'text--lighten-5' : 'text--darken-4'"
          v-text="bottomText"
        />
      </v-card-text>
    </div>
  </v-card>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
import {fixUrl} from "../../../lib/utils";
import {useTheme} from "vuetify/framework";
export default {
  props: ["video"],

  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
  components: {
    baseVideoRenderer,
  },

  async mounted() {
  },
  computed: {
    bottomText() {
      return this.parseBottom();
    },
    thumbnailAutoWidth() {
      return true;
    },
    channelIcon() {
      return null;
    },
    channelUrl() {
      return $rendererUtils.getNavigationEndpoints(this.channelEndpoint);
    },
    thumbnails() {
      return this.video.contentImage?.thumbnailViewModel?.image.sources || this.video.contentImage?.collectionThumbnailViewModel?.primaryThumbnail.thumbnailViewModel.image.sources;
    },
    thumbnailUrl() {
      return this.thumbnails[this.thumbnails.length - 1]?.url;
    },

    roundTweak() {
      return this.$store.state.tweaks.roundTweak;
    },
    roundThumb() {
      return this.$store.state.tweaks.roundThumb;
    },

    titles() {
      return this.video.metadata.lockupMetadataViewModel.title.content;
    },
    channelEndpoint() {
      let menuRendererItems = this.video.rendererContext?.commandContext.onLongPress.innertubeCommand.showMenuCommand.menu.menuRenderer.items;
      return menuRendererItems[menuRendererItems.length - 1]?.menuNavigationItemRenderer?.navigationEndpoint
    },
    thumbnailOverlayText() {
      let text = "-";
      let thumbnailViewModel = this.video.contentImage?.collectionThumbnailViewModel?.primaryThumbnail.thumbnailViewModel || this.video.contentImage?.thumbnailViewModel;

      thumbnailViewModel?.overlays?.forEach((thumbnail) => {
        if (thumbnail.thumbnailOverlayBadgeViewModel?.thumbnailBadges) {
          text = thumbnail.thumbnailOverlayBadgeViewModel.thumbnailBadges[0].thumbnailBadgeViewModel.text;
        }
        else {
          text = thumbnail.thumbnailBottomOverlayViewModel?.badges[0]?.thumbnailBadgeViewModel.text;
        }
      });
      return text;
    },
    thumbnailOverlayStyle() {
      let text = "-";
      let thumbnailViewModel = this.video.contentImage?.collectionThumbnailViewModel?.thumbnailViewModel || this.video.contentImage?.thumbnailViewModel;
      thumbnailViewModel?.overlays?.forEach((thumbnail) => {
        if (thumbnail.thumbnailOverlayBadgeViewModel) {
          text = thumbnail.thumbnailOverlayBadgeViewModel.thumbnailBadges[0].thumbnailBadgeViewModel.icon.sources[0].clientResource.imageName;
        }
      });
      return text!== "-" ? text : "DEFAULT";
    },
  },

  methods: {
    parseBottom() {
      let contentMetadataViewModel = this.video.metadata.lockupMetadataViewModel.metadata.contentMetadataViewModel;
      let bottomText = [];
      if (contentMetadataViewModel.metadataRows) {
        bottomText = contentMetadataViewModel.metadataRows
          .flatMap(row => row?.metadataParts || [])
          .map(part => part?.text.content);
      }

      return bottomText.join(" · ");
    },
  },
};
</script>
<style>

.entry {
  width: 100%; /* Prevent Loading Weirdness */
}
.videoRuntimeFloat {
  position: absolute;
  bottom: 10px;
  right: 10px;
  border-radius: 4px;
  padding: 0px 4px 0px 4px;
  font-size: 0.66rem;
}

.videoRuntimeFloat.style-DEFAULT {
  background: rgba(0, 0, 0, 0.5);
}
.videoRuntimeFloat.style-SHORTS {
  background: rgba(0, 0, 0, 0.5);
}

.videoRuntimeFloat.style-LIVE {
  background: rgba(255, 0, 0, 0.5);
}

.videoRuntimeFloat.style-UPCOMING {
  background: rgba(0, 0, 0, 0.5);
}
.videoRuntimeFloat.style-MIX {
  background: rgba(0, 0, 0, 0.5);
}

.vid-title {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  text-overflow: ellipsis;
  overflow: hidden;
}

.avatar-thumbnail {
  margin-top: 0.5rem;
  margin-left: 0.5rem;
  border-radius: 50%;
  width: 35px;
  height: 35px;
}

#details {
  display: flex;
  flex-direction: row;
  flex-basis: auto;
}

@media screen and (orientation: landscape) {
  .entry {
    margin-bottom: 8px;
  }
  .thumbnail-container {
    width: 50vh;
    float: left;
  }
  .thumbnail-container-auto-width {
    width: auto;
  }
  #details {
    flex-direction: column-reverse;
  }
  .avatar-thumbnail {
    margin-top: 0;
    margin-left: 16px;
  }
  .video-info {
    padding-top: 0 !important;
    padding-bottom: 0;
    margin-top: 0;
  }
}
</style>
