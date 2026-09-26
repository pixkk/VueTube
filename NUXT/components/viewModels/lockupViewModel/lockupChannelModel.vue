<template>
  <div style="display: flex; margin: 1rem; gap: 1rem; justify-content: normal; align-items: center">
    <img :src="channelLogoSrc" style="border-radius: 50%; max-width: 20vw;max-height: 20vw;"/>
    <div style="display: flex; flex-direction: column; justify-content: center; width: 100%;">

      <div style="font-size: 5vw; font-weight: bold;">
        {{ video.metadata.lockupMetadataViewModel.title.content }}
      </div>
      <div style="font-size: 2.5vw; color: #666;">
        {{ this.parseBottom() }}
      </div>
      <div @click="
        $store.dispatch(
          'channel/fetchChannel',
          $rendererUtils.getNavigationEndpoints(channelEndpoint())
        )
      ">
        <v-btn
          to="/channel"
          @click="
        $store.dispatch(
          'channel/fetchChannel',
          $rendererUtils.getNavigationEndpoints(channelEndpoint)
        )
      " color="primary">{{ video.rendererContext.commandContext.onLongPress.innertubeCommand.showMenuCommand.menu.menuRenderer.items[0].menuNavigationItemRenderer.text.runs[0].text }}</v-btn>
      </div>

    </div>
  </div>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
import {fixUrl} from "../../../lib/utils";
export default {
  props: ["video"],

  components: {
    baseVideoRenderer,
  },

  computed: {
    channelLogoSrc() {
      let imageArray = this.video.contentImage.thumbnailViewModel.image.sources;
      return fixUrl(imageArray[imageArray.length - 1].url);
    },
    channelEndpoint() {
      let menuRendererItems = this.video.rendererContext?.commandContext.onLongPress.innertubeCommand.showMenuCommand.menu.menuRenderer.items;
      return menuRendererItems[menuRendererItems.length - 1]?.menuNavigationItemRenderer?.navigationEndpoint
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
