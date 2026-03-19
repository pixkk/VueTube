<template>
  <v-card
    class="entry videoRenderer background overflow-hidden"
    :to="`/watch?v=${vidId}`"
    :style="{
      borderRadius: roundThumb ? `${roundTweak / 2}rem` : '0',
      margin:
        roundThumb && roundTweak > 0 ? '0 1rem 1rem 1rem' : '0 0 0.25rem 0',
    }"
    flat
  >
    <div style="position: relative"
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
        v-text="thumbnailOverlayText"
      />
    </div>
    <div
      id="details"
      class="background mt-1 d-flex flex-row"
      :class="
        roundThumb && roundTweak > 0
          ? $vuetify.theme.dark
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
          :class="$vuetify.theme.dark ? 'text--lighten-5' : 'text--darken-4'"
          v-text="bottomText"
        />
      </v-card-text>
    </div>
  </v-card>
</template>

<script>
export default {
  props: {
    vidId: {
      type: String,
      required: true,
    },
    thumbnails: {
      type: Array,
      required: true,
    },
    channelUrl: {
      // type: String,
      required: true,
    },
    channelIcon: {
      // type: String,
      required: true,
    },
    titles: {
      // type: Array,
      required: true,
    },
    bottomText: {
      type: String,
      required: true,
    },
    thumbnailOverlayText: {
      type: String,
    },
    thumbnailOverlayStyle: {
      type: String,
    },
    thumbnailAutoWidth: {
      type: Boolean,
      required: false,
    },
  },
  data() {
    return {
      thumbnailUrl: '', // This will hold the resolved URL from getThumbnail
    };
  },

  computed: {
    roundTweak() {
      return this.$store.state.tweaks.roundTweak;
    },
    roundThumb() {
      return this.$store.state.tweaks.roundThumb;
    },
  },
  async mounted() {
    this.thumbnailUrl = await this.$youtube.getThumbnail(this.vidId, 'max', this.thumbnails);
  }
};
</script>

<style scoped>
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
