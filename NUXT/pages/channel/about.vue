<template>
  <div class="px-6 py-3">
    <p v-html="$store.state.channel.fullChannelInfo.description ? $store.state.channel.fullChannelInfo.description.replaceAll('\n', '<br/>') :$store.state.channel.descriptionPreview "></p>
    <br />
    <br />
    <h3 class="my-2" v-if="$store.state.channel.fullChannelInfo.customLinksLabel">{{$store.state.channel.fullChannelInfo.customLinksLabel.content}}</h3>
    <div v-ripple class="py-2 d-flex flex-column">
      <!--      <span class="ml-4 primary&#45;&#45;text">Social Media</span>-->
      <div v-for="link in $store.state.channel.fullChannelInfo.links" class="mb-1" v-if="$store.state.channel.fullChannelInfo.links">

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
    <h3 class="my-2">{{$store.state.channel.fullChannelInfo.additionalInfoLabel.content}}</h3>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-web</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.displayCanonicalChannelUrl }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-account-group</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.subscriberCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-play-box</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.videoCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-chart-line</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.viewCountText }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row">
      <v-icon size="24" color="primary">mdi-information-outline</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.joinedDateText.content }}</span>
    </div>
    <div v-ripple class="py-2 d-flex flex-row" v-if="$store.state.channel.fullChannelInfo.country">
      <v-icon size="24" color="primary">mdi-earth</v-icon>
      <span class="ml-4">{{ $store.state.channel.fullChannelInfo.country }}</span>
    </div>
  </div>
</template>
<script>
export default {

  methods: {
    openExternal(url) {
      this.$vuetube.openExternal(url);
    },
  },
}
</script>
