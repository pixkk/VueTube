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
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
import LockupVideoModel from "./lockupVideoModel.vue";
import LockupChannelModel from "./lockupChannelModel.vue";
export default {
  props: ["video"],

  components: {
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
