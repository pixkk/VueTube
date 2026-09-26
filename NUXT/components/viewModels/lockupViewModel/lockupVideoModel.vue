<template>
  <base-video-renderer
    :vidId="video.contentId || video.rendererContext?.commandContext.onTap.innertubeCommand.watchEndpoint?.videoId"
    :thumbnails="video.contentImage?.thumbnailViewModel?.image.sources || video.contentImage?.collectionThumbnailViewModel?.primaryThumbnail.thumbnailViewModel.image.sources"
    :thumbnailOverlayStyle="thumbnailOverlayStyle"
    :thumbnailOverlayText="thumbnailOverlayText"
    :channelUrl="
      $rendererUtils.getNavigationEndpoints(channelEndpoint)
    "
    :channelIcon="null"
    :titles="video.metadata.lockupMetadataViewModel.title.content"
    :bottomText="parseBottom()"
  >
  </base-video-renderer>
</template>

<script>
import baseVideoRenderer from "~/components/UtilRenderers/baseVideoRenderer.vue";
export default {
  props: ["video"],

  components: {
    baseVideoRenderer,
  },

  computed: {
    thumbnailOverlayText() {
      let text = "-";
      if (this.video.contentType == "LOCKUP_CONTENT_TYPE_CHANNEL") {
        return ""
      }

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
