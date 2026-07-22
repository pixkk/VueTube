<template>
  <div>
    <v-bottom-sheet
      v-model="sheet"
      style="z-index: 777777"
    >
      <template #activator="{ props: activatorProps }">
        <v-btn
      elevation="0" icon variant="text" size="small" color="white" v-bind="activatorProps">
          {{
            currentVideoFormat
              ? (currentVideoFormat.qualityLabel || currentVideoFormat.quality)
              : (sources.find((src) => src.url == currentSource.src)?.qualityLabel || sources.find((src) => src.url == currentSource.src)?.quality || "Auto")
          }}
        </v-btn>
      </template>

      <v-card class="bg-background">
        <div class="d-flex align-center px-4 py-2">
          <span class="text-subtitle-2">Quality for current video</span>
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
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
                style="padding: 0 !important;"
              >

                <div class="d-flex flex-column">
                  <div
                    class="d-flex align-center px-4 py-2">
                    <v-avatar>
                      <v-icon
                        :color="isVideoActive(src) ? 'primary' : 'grey'"
                      >{{isVideoActive(src) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'}}</v-icon>
                    </v-avatar>
                    <div class="w-100">
                      <v-list-item-title>
                        {{ src.qualityLabel ? src.qualityLabel : "Auto" }} ({{ src.quality }})
                        {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                      </v-list-item-title>
                      <v-list-item-subtitle>
                        {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                        AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                      </v-list-item-subtitle>
                    </div>

                  </div>
                  <v-divider v-if="!$store.state.tweaks.roundTweak" />
                </div>

              </v-list-item>
            </v-card-text>
          </v-window-item>

          <v-window-item>
              <v-card-text style="max-height: 50vh; overflow-y: auto; " class="pa-0 d-flex flex-column">
                <v-list-item
                  v-for="src in audioSources"
                  :key="src.url"
                  @click="handleAudioQualityClick(src)"
                  style="padding: 0 !important;"
                >
                  <div class="d-flex flex-column">
                    <div
                      class="d-flex align-center px-4 py-2">
                      <v-avatar>
                        <v-icon
                          :color="isAudioActive(src) ? 'primary' : 'grey'"
                        >{{isAudioActive(src) ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'}}</v-icon>
                      </v-avatar>
                      <div class="w-100">
                        <v-list-item-title>
                          {{ src?.audioTrack?.displayName ? src?.audioTrack?.displayName : "" }} ({{ src.quality }})
                          {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                        </v-list-item-title>
                        <v-list-item-subtitle>
                          {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                          AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                        </v-list-item-subtitle>
                      </div>

                    </div>
                    <v-divider v-if="!$store.state.tweaks.roundTweak" />
                  </div>
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
    currentVideoFormat: {
      type: Object,
      default: null,
    },
    currentAudioFormat: {
      type: Object,
      default: null,
    },
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
    isVideoActive(src) {
      if (this.currentVideoFormat) {
        return this.currentVideoFormat === src;
      }
      return this.currentSource.src === src.url;
    },
    isAudioActive(src) {
      if (this.currentAudioFormat) {
        return this.currentAudioFormat === src;
      }
      return this.currentAudioSource.src === src.url;
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
