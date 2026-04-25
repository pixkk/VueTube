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
          color="white"
          v-bind="activatorProps"
        >
          <v-icon>mdi-closed-caption-outline</v-icon>
        </v-btn>
      </template>
      <v-card class="bg-background">
        <div
          class="d-flex align-center px-4 py-2"
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          <span class="text-subtitle-2">Captions for current video</span>
          <v-spacer />
          <v-btn
            elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-divider />
        <v-card-text
          style="max-height: 50vh; overflow-y: auto;"
          class="pa-0 d-flex flex-column"
        >
          <div
            v-for="src in captions"
            :key="src.name?.runs ? src.name?.runs[0]?.text : src.name.simpleText"
            class="overflow-visible"
          >
            <v-list-item
              @click="(sheet = false), $emit('captionsHandler', src)">

              <v-list-item-title >
                {{src.name?.runs ? src.name?.runs[0]?.text : src.name.simpleText}}
              </v-list-item-title>

            </v-list-item>

            <v-divider />
          </div>

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
