<template>
  <div>
    <v-bottom-sheet
      v-model="sheet"
      :attach="$parent.$refs.vidcontainer"
      style="z-index: 777777"
      scrollable
    >
      <template #activator="{ on, attrs }">
        <v-btn fab text small color="white" v-bind="attrs" v-on="on">
          {{
            sources.find((src) => src.url == currentSource.src)?.qualityLabel
              ? sources.find((src) => src.url == currentSource.src)?.qualityLabel
              : sources.find((src) => src.url == currentSource.src)?.quality || "Auto"
          }}
        </v-btn>
      </template>

      <v-card class="background">
        <v-subheader>
          Quality for current video
          <v-spacer />
          <v-btn fab text small color="white" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-subheader>
        <v-divider />

        <v-tabs v-model="tab" class="w-100">
          <v-tab class="flex-grow-1">Video</v-tab>
          <v-tab class="flex-grow-1">Audio</v-tab>
        </v-tabs>

        <v-tabs-items v-model="tab" v-touch="{ left: nextTab, right: prevTab }">
          <v-tab-item>
            <v-card-text style="max-height: 50vh; overflow-y: auto; " class="pa-0 d-flex flex-column">
              <v-list-item
                v-for="src in sources"
                :key="src.url"
                two-line
                @click="(sheet = false), $emit('quality', src.url)"
              >
                <v-list-item-avatar>
                  <v-icon
                    :color="currentSource.src === src.url ? 'primary' : 'grey'"
                    v-text="currentSource.src === src.url ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                  ></v-icon>
                </v-list-item-avatar>
                <v-list-item-content>
                  <v-list-item-title>
                    {{ src.qualityLabel ? src.qualityLabel : "Auto" }} ({{ src.quality }})
                    {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                    AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                  </v-list-item-subtitle>
                </v-list-item-content>
              </v-list-item>
            </v-card-text>
          </v-tab-item>

          <v-tab-item>
              <v-card-text style="max-height: 50vh; overflow-y: auto; " class="pa-0 d-flex flex-column">
                <v-list-item
                  v-for="src in audioSources"
                  :key="src.url"
                  two-line
                  @click="(sheet = false), $emit('qualityAudio', src.url)"
                >
                  <v-list-item-avatar>
                    <v-icon
                      :color="currentAudioSource.src === src.url ? 'primary' : 'grey'"
                      v-text="currentAudioSource.src === src.url ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                    ></v-icon>
                  </v-list-item-avatar>
                  <v-list-item-content>
                    <v-list-item-title>
                      {{ src?.audioTrack?.displayName ? src?.audioTrack?.displayName : "" }} ({{ src.quality }})
                      {{ (src.bitrate / 1000000).toFixed(2) }}Mbps
                    </v-list-item-title>
                    <v-list-item-subtitle>
                      {{ src.mimeType.replaceAll("; codecs=", ". Codecs: ") }}.
                      AVG bitrate: {{ (src.averageBitrate / 1000000).toFixed(2) }}Mbps
                    </v-list-item-subtitle>
                  </v-list-item-content>
                </v-list-item>
              </v-card-text>
          </v-tab-item>
        </v-tabs-items>
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
  emits: ["quality", "qualityAudio"],
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
  },
};
</script>
