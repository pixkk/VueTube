<template>
  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
      style="z-index: 777777"
    >
      <template #activator="{ props: activatorProps }">
        <v-btn
      elevation="0" icon variant="text" size="small" color="white" v-bind="activatorProps">
          {{
            sources.find((src) => src.url == currentSource.src)?.qualityLabel
              ? sources.find((src) => src.url == currentSource.src)?.qualityLabel
              : sources.find((src) => src.url == currentSource.src)?.quality || "Auto"
          }}
        </v-btn>
      </template>

      <v-card class="background">
        <v-list-subheader>
          Quality for current video
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" color="white" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-list-subheader>
        <v-divider />

        <v-tabs v-model="tab" class="w-100">
          <v-tab class="flex-grow-1">Video</v-tab>
          <v-tab class="flex-grow-1">Audio</v-tab>
        </v-tabs>

        <v-window v-model="tab" v-touch="{ left: nextTab, right: prevTab }">
          <v-window-item>
            <v-card-text style="max-height: 50vh; overflow-y: auto; " class="pa-0 d-flex flex-column">
              <v-list-item
                v-for="src in sources"
                :key="src.url"
                @click="handleQualityClick(src)"
              >
                <v-avatar>
                  <v-icon
                    :color="currentSource.src === src.url ? 'primary' : 'grey'"
                    v-text="currentSource.src === src.url ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                  ></v-icon>
                </v-avatar>
                  <v-list-item-title>
                    {{ src.qualityLabel ? src.qualityLabel : "Auto" }} ({{ src.quality }})
                    {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                    AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                  </v-list-item-subtitle>
              </v-list-item>
            </v-card-text>
          </v-window-item>

          <v-window-item>
              <v-card-text style="max-height: 50vh; overflow-y: auto; " class="pa-0 d-flex flex-column">
                <v-list-item
                  v-for="src in audioSources"
                  :key="src.url"
                  @click="handleAudioQualityClick(src)"
                >
                  <v-avatar>
                    <v-icon
                      :color="currentAudioSource.src === src.url ? 'primary' : 'grey'"
                      v-text="currentAudioSource.src === src.url ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    ></v-icon>
                  </v-avatar>
                    <v-list-item-title>
                      {{ src?.audioTrack?.displayName ? src?.audioTrack?.displayName : "" }} ({{ src.quality }})
                      {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                      AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                    </v-list-item-subtitle>
                </v-list-item>
              </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script>
export default {
  props: {
    currentSource: {},
    currentAudioSource: {},
    sources: {
      type: Array,
      required: true,
    },
    audioSources: {
      type: Array,
      required: true,
    },
  },
  emits: ["qualityAudioInfo", "qualityInfo"],
  data: () => ({
    sheet: false,
    tab: 0,
  }),
  methods: {
    nextTab() {
      if (this.tab < 1) this.tab++;
    },
    prevTab() {
      if (this.tab > 0) this.tab--;
    },

    handleAudioQualityClick(src) {
      this.sheet = false;
      this.$emit('qualityAudioInfo', src);
    },
    handleQualityClick(src) {
      this.sheet = false;
      this.$emit('qualityInfo', src)
    },
  },
};
</script>
