<template>
  <div class="d-flex flex-column align-center">
    <v-img
      :src="$store.state.channel.banner"
      class=""
      :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
      contain
      position="top center"
    ></v-img>
    <v-avatar
      size="60"
      class="mt-2 background"
      :class="$vuetify.theme.dark ? 'lighten-1' : 'darken-1'"
    >
      <img
        v-if="!$store.state.channel.loading"
        :src="$store.state.channel.avatar"
      />
      <v-progress-circular v-else indeterminate color="primary" size="60" />
    </v-avatar>
    <h2 class="mt-2">{{ $store.state.channel.title }}</h2>
    <v-btn :aria-label="subscribeAlt" class="py-2" text color="primary">
      {{ $store.state.channel.subscribe }}
    </v-btn>
    <div v-if="!$store.state.channel.loading" style="font-size: 0.75rem">
      {{ $store.state.channel.subscribers }} &middot;
      {{ $store.state.channel.videosCount }}
    </div>
    <v-card
      v-if="!$store.state.channel.loading"
      flat
      to="/channel/about"
      style="font-size: 0.75rem; text-oveflow: ellipsis; overflow: hidden"
      class="background background--text text-center px-4"
      :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
    >
      {{ $store.state.channel.descriptionPreview.slice(0, $store.state.channel.descriptionPreview.indexOf(".") || 100) }}...
      <v-icon
        class="background--text"
        :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
      >
        mdi-chevron-right
      </v-icon>
    </v-card>
    <div>
      <compact-video-renderer
        v-for="videoExample in $store.state.channel.videoExample"
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
  components: { CompactVideoRenderer },
};
</script>
