<template>

  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
      style="z-index: 777777"
      scrollable
    >
      <template #activator="{ on, attrs }">
        <v-btn
          fab
          text
          small
          color="white"
          v-bind="attrs"
          v-on="on"
        >
          <v-icon>mdi-closed-caption-outline</v-icon>
        </v-btn>
      </template>
      <v-card class="background">
        <v-subheader
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          Captions for current video
          <v-spacer />
          <v-btn fab text small @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-subheader>
        <v-divider />
        <v-card-text
          style="max-height: 50vh; flex-direction: column !important"
          class="pa-0 d-flex flex-column-reverse"
        >
          <v-list-item-group
            v-for="src in captions"
            :key="src.name.runs[0].text"
            >
            <v-list-item
              @click="(sheet = false), $emit('captionsHandler', src)">
              <v-list-item-content>
                <v-list-item-title >
                  {{src.name.runs[0].text}}
                </v-list-item-title>
              </v-list-item-content>
            </v-list-item>

            <v-divider />
          </v-list-item-group>

        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>
<script>
export default {
  props: {
    captions: {
      type: Array,
    },
  },
  emits: ["captionsHandler"],
  data: () => ({
    sheet: false,
  }),
}
</script>
