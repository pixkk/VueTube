<template>
  <dialog-base>
    <template v-slot:header>
      <v-btn icon @click="$emit('changeState', false)">
        <v-icon>mdi-arrow-left</v-icon>
      </v-btn>
      <v-toolbar-title>
        <strong>Replies</strong>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="$emit('closeComments')">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </template>
    <template>
      <comment-thread-renderer :comment="parentComment" />
      <v-divider></v-divider>
      <comment-thread-renderer
        v-for="(comment, index) in comments"
        :key="index"
        :comment="comment"
        :continuationToken="defaultContinuation"
        :ref="`comment-${index}`"
      />
      <observer
        v-if="comments.length > 0"
        @intersect="paginate"
        :target="$refs[`comment-${lastComment}`]"
      />
    </template>
  </dialog-base>
</template>

<script>
import dialogBase from "~/components/dialogBase.vue";
import commentsHeaderRenderer from "~/components/Comments/commentsHeaderRenderer.vue";
import commentThreadRenderer from "~/components/Comments/commentThreadRenderer.vue";
import continuationItemRenderer from "~/components/observer.vue";
import Observer from "../observer.vue";

export default {
  components: {
    Observer,
    dialogBase,
    commentsHeaderRenderer,
    commentThreadRenderer,
    continuationItemRenderer,
  },
  data() {
    return {
      loading: false,
      comments: [],
      defaultContinuation: null,
    };
  },
  model: {
    prop: "showReplies",
    event: "changeState",
  },
  props: ["defaultContinuation", "parentComment", "showReplies"],
  mounted() {
    this.paginate();
  },
  computed: {
    lastComment() {
         return this.comments.length >= 5 ? this.comments.length - 5 : 0;
    },
  },
  methods: {
    paginate() {
      if (this.defaultContinuation) {
        this.loading = true;
        this.$youtube
          .getContinuation(this.defaultContinuation, "next", "web")
          .then((result) => {
            let processed;
            processed = result.data.onResponseReceivedEndpoints.map(
              (endpoints) =>
                endpoints.appendContinuationItemsAction.continuationItems
            );
            processed = processed.flat(1);
            this.comments = this.comments.concat(processed);
            for (let i = 0; i < this.comments.length; i++) {
              this.comments[i].comment = {
                commentRenderer: this.comments[i].commentRenderer
              };
              delete this.comments[i].commentRenderer;
            }
            this.defaultContinuation = this.findContinuation(processed);
            if (this.comments) this.loading = false;
          });
      }
    },

    findContinuation(newResponses) {
      const continuationItemParent = newResponses.find(
        (item) => item.continuationItemRenderer
      );
      const newContinuation =
        continuationItemParent?.continuationItemRenderer.button?.buttonRenderer?.command?.continuationCommand?.token;
      return newContinuation;
    },
  },
};
</script>
