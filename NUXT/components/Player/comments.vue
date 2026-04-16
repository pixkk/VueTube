<template>

  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
      style="z-index: 777777;"
    >
      <template #activator="{ props: activatorProps }">
        <v-card
          v-ripple
          variant="flat"
          rounded="0"
          class="comment-renderer px-3 background"
          :class="
            $store.state.tweaks.roundWatch && $store.state.tweaks.roundTweak > 0
              ? $vuetify.theme.current.dark
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
          v-bind="activatorProps"
        >
          <v-card-text class="comment-count keep-spaces px-0">
            <template v-for="text in comments.carouselTitles">
              <template>{{ text.carouselTitleViewModel.title }} {{ "(" + text.carouselTitleViewModel?.subtitle + ")" }}</template>
            </template>
          </v-card-text>
          <v-icon size="small">mdi-unfold-more-horizontal</v-icon>
        </v-card>
      </template>
      <v-card class="background"
      :style="{
            minHeight: 60 + 'vh',}"
      >
        <v-list-subheader
          v-touch="{
          }"
        >
          <template v-for="text in comments.carouselTitles" >
            <v-col
              :style="{
                padding: 0 + '!important',
              }"
              v-touch="{
            down: () => (sheet = false),
          }"
            ><h3>{{ text.carouselTitleViewModel.title }} {{ "(" + text.carouselTitleViewModel?.subtitle + ")" }}</h3></v-col>
          </template>
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-list-subheader>
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
