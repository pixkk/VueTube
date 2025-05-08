<template>
  <div class="d-flex flex-column align-center">
    <v-img
      v-if="!isLoading"
        :src="this.$props.bannerUrl"
        class=""
        :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
        contain
        position="top center"
    ></v-img>
    <v-progress-linear v-else indeterminate color="primary" size="60" />
    <v-avatar
        size="60"
        class="mt-2 background"
        :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
    >
      <img
          v-if="!isLoading"
          :src="this.$props.avatarUrl"
      />
      <v-progress-circular v-else indeterminate color="primary" size="60" />
    </v-avatar>
    <h2 class="mt-2">{{ this.$props.title }}</h2>
    <v-btn :aria-label="this.$props.subscribeAlt" class="py-2" text color="primary">
      {{ this.$props.subscribeText }}
    </v-btn>
    <div v-if="!isLoading" style="font-size: 0.75rem">
      {{ this.$props.subscribersCount }} &middot;
      {{ this.$props.videosCount }}
    </div>
    <v-card
        v-if="!isLoading"
        flat
        style="font-size: 0.75rem; text-oveflow: ellipsis; overflow: hidden"
        class="background background--text text-center px-4"
        :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
    >
      {{ this.$props.descriptionPreview.slice(0, this.$props.descriptionPreview.indexOf(".") || 100) }}...
      <v-icon
          class="background--text"
          :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
      >
        mdi-chevron-right
      </v-icon>
    </v-card>
    <div>
      <compact-video-renderer
          v-for="videoExample in this.$props.videoExample"
          :key="Math.random() * 10000"
          :video="
        videoExample.elementRenderer.newElement.type.componentType.model
          .videoWithContextModel
          ? videoExample.elementRenderer.newElement.type.componentType.model
              .videoWithContextModel.videoWithContextData
          : videoExample.elementRenderer.newElement.type.componentType.model
              .gridVideoModel.videoData
      "
      />
    </div>
  </div>
</template>
<script>
import CompactVideoRenderer from "../../components/CompactRenderers/compactVideoRenderer.vue";

export default {
  components: {CompactVideoRenderer},

  props: [
      "bannerUrl",
      "avatarUrl",
      "title",
      "subscribeText",
      "subscribersCount",
      "videosCount",
      "descriptionPreview",
      "videoExample",
    "subscribeAlt",
    "isLoading"
  ],
}
</script>
