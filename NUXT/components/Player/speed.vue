<template>
  <div>
    <v-bottom-sheet
      v-model="sheet"
      style="z-index: 777777"
    >
      <template #activator="{ props: activatorProps }">
        <v-btn
      elevation="0"
          icon
          variant="text"
          size="small"
          :color="$route.name === 'watch' ? 'white' : ''"
          v-bind="activatorProps"
        >
          {{ currentSpeed }}X
        </v-btn>
      </template>
      <v-card class="bg-background">
        <div
          class="d-flex align-center px-4 py-2"
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          <span class="text-subtitle-2">Playback Speed</span>
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-divider />

        <v-card-text
          style="max-height: 50vh; overflow-y: auto; height: 50vh"
          class="pa-0 d-flex flex-column"
        >
          <v-list-item
            v-for="speed in speeds"
            :key="speed"
            @click="(sheet = false), $emit('speed', speed)"
            style="padding: 0 !important;"
          >

            <div class="d-flex flex-column">
              <div
                class="d-flex align-center px-4 py-2">
                <v-avatar>
                  <v-icon
                    :color="currentSpeed === speed ? 'primary' : 'grey'"
                  >{{currentSpeed === speed ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'}}</v-icon>
                </v-avatar>
                <div class="w-100">
                  <v-list-item-title>
                    {{ speed }}X
                  </v-list-item-title>
<!--                  <v-list-item-subtitle>-->
<!--                  </v-list-item-subtitle>-->
                </div>

              </div>
              <v-divider v-if="!$store.state.tweaks.roundTweak" />
            </div>

          </v-list-item>
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
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
  props: {
    currentSpeed: {
      type: Number,
      required: true,
    },
  },
  emits: ["speed"],
  data: () => ({
    sheet: false,
    speeds: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4],
  }),
};
</script>
