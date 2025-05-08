<template>
  <div class="">
    <h3 class="my-2">{{anotherInfo.title}}</h3>
    <p v-html="fullChannelInfo.description ? fullChannelInfo.description.replaceAll('\n', '<br/>') :anotherInfo?.descriptionPreview "></p>
    <br />
    <br />
    <h3 class="my-2" v-if="fullChannelInfo.customLinksLabel">{{fullChannelInfo.customLinksLabel.content}}</h3>
    <div v-ripple class="py-2 d-flex flex-column">
      <!--      <span class="ml-4 primary&#45;&#45;text">Social Media</span>-->
      <div v-for="link in fullChannelInfo.links" class="mb-1" v-if="fullChannelInfo.links">

        <a
          @click.stop.prevent="
            openExternal('https://' + link.channelExternalLinkViewModel.link.content)
          "
        >
<!--          <v-icon x-large class="actionIcon">mdi-github</v-icon>-->
          <v-avatar tile size="24" color="none">
            <v-img
              alt="John"
              :src=link.channelExternalLinkViewModel.favicon.sources[1].url
            ></v-img>
          </v-avatar>
          {{ link.channelExternalLinkViewModel.title.content }} - {{link.channelExternalLinkViewModel.link.content}}</a
        >
      </div>
    </div>
    <br />
    <h3 class="my-2">{{fullChannelInfo.additionalInfoLabel.content}}</h3>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-web</v-icon>
      <span class="ml-4">{{ fullChannelInfo.displayCanonicalChannelUrl }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-account-group</v-icon>
      <span class="ml-4">{{ fullChannelInfo.subscriberCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-play-box</v-icon>
      <span class="ml-4">{{ fullChannelInfo.videoCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-chart-line</v-icon>
      <span class="ml-4">{{ fullChannelInfo.viewCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-information-outline</v-icon>
      <span class="ml-4">{{ fullChannelInfo.joinedDateText.content }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row" v-if="fullChannelInfo.country">
      <v-icon size="24" color="primary">mdi-earth</v-icon>
      <span class="ml-4">{{ fullChannelInfo.country }}</span>
    </div>
  </div>
</template>
<script>
export default {
  props: [
    "fullChannelInfo",
    "anotherInfo"
  ],
  methods: {
    openExternal(url) {
      this.$vuetube.openExternal(url);
    },
  },
}
</script>
