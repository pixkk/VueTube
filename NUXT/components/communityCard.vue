<template>
  <v-card
    v-ripple
    flat
    class="background"
    :class="
      $store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak > 0
        ? $vuetify.theme.dark
          ? 'lighten-1'
          : 'darken-1'
        : ''
    "
    :style="{
      borderRadius: $store.state.tweaks.roundThumb
        ? `${$store.state.tweaks.roundTweak / 2}rem`
        : '0',
      margin:
        $store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak > 0
          ? '0 1rem 1rem 1rem'
          : '0 0 0.25rem 0',
    }"
  >
    <div class="d-flex flex-row pa-4">
      <v-avatar size="50" color="primary">
        <img :src="channelThumbnail" />
      </v-avatar>
      <div class="d-flex flex-column my-auto pl-4">
        <b>{{ channelName }}</b>
        <div
          class="background--text"
          :class="$vuetify.theme.dark ? 'text--lighten-4' : 'text--darken-4'"
        >
          {{ publishedTime }}
        </div>
      </div>
      <v-spacer />
      <v-btn
        fab
        text
        elevation="0"
        style="width: 50px !important; height: 50px !important"
      >
        <v-icon>mdi-share-outline</v-icon>
      </v-btn>
    </div>
    <div v-emoji class="px-4" v-html="postText">

    </div>
    <div v-emoji class="px-4">
      <Voting v-if="backstageAttachment.backstageAttachment.pollRenderer" :question="``" :answers="getAnswers">

      </Voting>
    </div>
    <v-img
        v-if="backstageAttachment.backstageAttachment.backstageImageRenderer"
      contain
      class="background my-4"
      :class="$vuetify.theme.dark ? 'lighten-2' : 'darken-2'"
      style="max-height: 15rem"
      :style="{
        borderRadius: `${$store.state.tweaks.roundTweak / 4}rem`,
        marginLeft:
          !($store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak) >
          0
            ? '1rem'
            : '0',
        marginRight:
          !($store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak) >
          0
            ? '1rem'
            : '0',
      }"
      :src="backstageAttachment.backstageAttachment.backstageImageRenderer.image.thumbnails[backstageAttachment.backstageAttachment.backstageImageRenderer.image.thumbnails.length - 1].url"
    />
    <div class="d-flex flex-row px-4 pb-4">
      <v-icon>mdi-thumb-up-outline</v-icon>
      <b class="mx-2">{{ votesCount }}</b>
      <v-icon class="ml-2">mdi-thumb-down-outline</v-icon>
    </div>
  </v-card>
</template>

<script>
// import YtTextFormatter from "~/components/UtilRenderers/YtTextFormatterNew.vue";
export default {
  components: {},
  props: [
    "channelName",
    "publishedTime",
    "channelThumbnail",
    "text",
    "attachment",
    "votesCount",
    "backstageAttachment",
  ],
  computed: {
    postText() {
      let text = "";
      // console.log(this.video);
      this.text.runs.forEach((run) => {
        text += run.text;
      });
      let regex = /(https?:\/\/[^\s]+)/g;
      text = text.replace(regex, '<a onclick=openExternal("$1")>$1</a>');
      return text;
    },
    getAnswers() {
      // if (this.backstageAttachment.pollRenderer) {
      let answers = [];
      let id = 0;
      this.backstageAttachment.backstageAttachment.pollRenderer.choices.forEach((choice) => {
        answers.push({ value: choice.signinEndpoint.clickTrackingParams, text: choice.image ? "<style> .txt {display: flex!important;flex-direction: row!important;justify-content: space-evenly!important;align-items: center!important;}</style><img style='height: 10rem!important;' src=\"" + choice.image.thumbnails[choice.image.thumbnails.length-1].url + "\"/><span>" + choice.text.runs[0].text + "</span>" : "<span>"+choice.text.runs[0].text+"</span>", votes: 99});
        id++;
      });
      return answers;
        // return [
        //   { value: 1, text: 'Vue', votes: 53 },
        //   { value: 2, text: 'React', votes: 35 },
        //   { value: 3, text: 'Angular', votes: 30 },
        //   { value: 4, text: 'Other', votes: 10 }
        // ];
      // }
    }
  },

};
</script>

