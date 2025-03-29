<template>

  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
      style="z-index: 777777;"
      scrollable
    >
      <template #activator="{ on, attrs }">
        <v-card
          v-ripple
          flat
          tile
          class="comment-renderer px-3 background"
          :class="
            $store.state.tweaks.roundWatch && $store.state.tweaks.roundTweak > 0
              ? $vuetify.theme.dark
                ? 'background lighten-1'
                : 'background darken-1'
              : ''
          "
          :style="{
            borderRadius: $store.state.tweaks.roundWatch
              ? `${$store.state.tweaks.roundTweak / 2}rem !important`
              : '0',
            margin:
              $store.state.tweaks.roundWatch &&
              $store.state.tweaks.roundTweak > 0
                ? '1rem'
                : '0',
          }"
          v-bind="attrs"
          v-on="on"
        >
          <v-card-text class="comment-count keep-spaces px-0">
            <template v-for="text in comments?.headerText?.runs">
              <template v-if="text.bold">
                <strong :key="text.text">{{ text.text + "(" + comments?.commentCount?.runs[0]?.text + ")" }}</strong>
              </template>
              <template v-else>{{ text.text }} {{ "(" + comments?.commentCount?.runs[0]?.text + ")" }}</template>
            </template>
          </v-card-text>
<!--          <v-icon v-if="showComments" dense>mdi-unfold-less-horizontal</v-icon>-->
          <v-icon dense>mdi-unfold-more-horizontal</v-icon>
        </v-card>
      </template>
      <v-card class="background"
              v-touch="{
            down: () => (sheet = false),
          }"
      :style="{
            minHeight: 60 + 'vh',}"
      >
        <v-subheader
          v-touch="{
// <!--            down: () => (sheet = false),-->
          }"
        >
          <template v-for="text in comments?.headerText?.runs">
            <template v-if="text.bold">
              <strong :key="text.text">{{ text.text + "(" + comments?.commentCount?.runs[0]?.text + ")" }}</strong>
            </template>
            <template v-else>{{ text.text }} {{ "(" + comments?.commentCount?.runs[0]?.text + ")" }}</template>
          </template>
          <v-spacer />
          <v-btn fab text small @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-subheader>
<v-divider/>
        <v-card-text
          style="max-height: 60vh; flex-direction: column !important"
          class="pa-0 d-flex flex-column-reverse"
        >
          <mainCommentRenderer
            v-model="showComments"
            :comment-data="comments"
            :default-continuation="commentsContinuations"
          ></mainCommentRenderer>

        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>
<script>
import MainCommentRenderer from "../Comments/mainCommentRenderer.vue";

export default {
  components: {MainCommentRenderer},
  props: {
    comments: {
      type: Array,
    },
    commentsContinuations : {

    }
  },
  emits: ["commentsHandler"],
  data: () => ({
    sheet: false,
  }),
}
</script>
