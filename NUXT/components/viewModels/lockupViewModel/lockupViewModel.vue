<template>
  <lockup-video-model
    v-if="video.contentType == 'LOCKUP_CONTENT_TYPE_MUSIC' || video.contentType == 'LOCKUP_CONTENT_TYPE_VIDEO'"
    :video="video"
  >
  </lockup-video-model>
  <lockup-channel-model
    v-if="video.contentType == 'LOCKUP_CONTENT_TYPE_CHANNEL'"
    :video="video"
  >
  </lockup-channel-model>
  <lockup-playlist-model
    v-if="video.contentType == 'LOCKUP_CONTENT_TYPE_PLAYLIST'"
    :video="video"
  >
  </lockup-playlist-model>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
import LockupVideoModel from "./lockupVideoModel.vue";
import LockupChannelModel from "./lockupChannelModel.vue";
import LockupPlaylistModel from "./lockupPlaylistModel.vue";
export default {
  props: ["video"],

  components: {
    LockupPlaylistModel,
    LockupChannelModel,
    LockupVideoModel,
    baseVideoRenderer,
  },

  computed: {

  },

  methods: {

  },
};
</script>
