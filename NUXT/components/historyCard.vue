<template>
  <v-card
    v-ripple
    class="background d-flex flex-row overflow-hidden mb-4 mx-4"
    style="height: 4.5rem !important; justify-content: space-between;"
    :class="
      $store.state.tweaks.roundThumb && $store.state.tweaks.roundTweak > 0
        ? theme.global.current.value.dark
          ? 'lighten-1'
          : 'darken-1'
        : ''
    "
    :style="{
      borderRadius: $store.state.tweaks.roundThumb
        ? `${$store.state.tweaks.roundTweak / 3}rem`
        : '0',
    }"
    flat
  >
    <v-card
      class="d-flex flex-row elevation-0 w-100"
      :to="`/watch?v=${video.id}`"
    >
      <v-img
        :src="thumbnail"
        aspect-ratio="16/9"
        cover
        style="position: relative; width: 8rem"
        :class="theme.global.current.value.dark ? 'lighten-3' : 'darken-3'"
        :style="{
          borderRadius: $store.state.tweaks.roundThumb
            ? `${$store.state.tweaks.roundTweak / 3}rem`
            : '0',
        }"
      >
      </v-img>
      <div
        v-emoji
        style="font-size: 0.75rem !important"
        class="d-flex flex-column ml-2 w-100"
      >
        <b
          class="text-left"
          style="
             {
              height: 1.5rem;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              word-wrap: break-word;
              white-space: normal;
            }
          "
          >{{ video.title }}
        </b>
        <div
          class="background--text caption mt-2 text-left d-inline-block text-truncate"
          :class="theme.global.current.value.dark ? 'text--lighten-4' : 'text--darken-4'"
          style="
             {
              height: 0.75rem;
            }
          "
        >
          {{ video.channel }}
        </div>
      </div>
    </v-card>

<!--    <v-spacer></v-spacer>-->
    <div class="d-flex flex-column">
      <v-btn
      elevation="0"
        variant="text"
        rounded="0"
        :elevation="0"
        class="flex-grow-1"
        style="width: 2rem !important"
        @click="deleted"
      >
        <v-icon>mdi-delete</v-icon>
      </v-btn>
    </div>
  </v-card>
</template>

<script>
import {useTheme} from "vuetify";

export default {
  setup() {
    const theme = useTheme()

    return {
      theme
    }
  },
  props: ["video"],
  computed: {
    thumbnail() {
      return `https://img.youtube.com/vi/${this.video.id}/hqdefault.jpg`;
    },
  },
  methods: {
    deleted() {
      this.$emit("deleted");
    },
  },
};
</script>
