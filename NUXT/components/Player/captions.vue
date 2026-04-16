<template>

  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
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
      <v-card class="background">
        <v-list-subheader
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          Captions for current video
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-list-subheader>
        <v-divider />
        <v-card-text
          style="max-height: 50vh; flex-direction: column !important"
          class="pa-0 d-flex flex-column-reverse"
        >
          <v-list
            v-for="src in captions"
            :key="src.name?.runs ? src.name?.runs[0]?.text : src.name.simpleText"
            >
            <v-list-item
              @click="(sheet = false), $emit('captionsHandler', src)">

                <v-list-item-title >
                  {{src.name?.runs ? src.name?.runs[0]?.text : src.name.simpleText}}
                </v-list-item-title>

            </v-list-item>

            <v-divider />
          </v-list>

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
