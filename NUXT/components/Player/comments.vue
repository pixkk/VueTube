<template>

  <div>
    <v-bottom-sheet
      v-model="sheet"
      style="z-index: 777777;"
    >
      <template #activator="{ props: activatorProps }">
        <v-card
          v-ripple
          variant="flat"
          rounded="0"
          class="comment-renderer px-3 bg-background"
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
            <span v-for="(text, i) in comments.carouselTitles" :key="i">
              {{ text.carouselTitleViewModel.title }} {{ "(" + text.carouselTitleViewModel?.subtitle + ")" }}
            </span>
          </v-card-text>
          <v-icon size="small">mdi-unfold-more-horizontal</v-icon>
        </v-card>
      </template>
      <v-card class="bg-background"
      :style="{
            minHeight: 60 + 'vh',}"
      >
        <div
          class="d-flex align-center px-4 py-2"
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          <h3 v-for="(text, i) in comments.carouselTitles" :key="i" class="text-subtitle-1 font-weight-bold">
            {{ text.carouselTitleViewModel.title }} {{ "(" + text.carouselTitleViewModel?.subtitle + ")" }}
          </h3>
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-divider/>
        <v-card-text
          style="max-height: 60vh; overflow-y: auto;"
          class="pa-0 d-flex flex-column"
        >
          <mainCommentRenderer
            :showComments="showComments"
            @changeState="showComments = $event"
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
      type: Object,
    },
    commentsContinuations : {

    }
  },
  emits: ["commentsHandler"],
  data: () => ({
    sheet: false,
    showComments: false,
  }),
}
</script>
