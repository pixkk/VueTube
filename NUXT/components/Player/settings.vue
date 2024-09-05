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
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </template>
      <v-card class="background">
        <v-subheader
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          Settings for player
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
          <div class="slider-container"
               style="width: 50%; align-self: center;">
            <span class="slider-label">Volume:</span>
            <v-slider
              @input="handleVolumeChange"
              ref="volumeSlider"
              :max="1"
              :step="0.01"
              :thumb-label="true"
              :thumb-size="25"
              v-model="volume"
              class="slider"
            ></v-slider>
          </div>
          <div class="slider-container"
               style="width: 50%; align-self: center;">
            <span class="slider-label">Brightness:</span>
            <v-slider
              @input="handleBrightnessChange"
              ref="brightnessSlider"
              v-model="brightness"
              :max="1"
              :step="0.01"
              :thumb-label="true"
              :thumb-size="25"
              class="slider"
            ></v-slider>
          </div>
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sheet: false,
      volume: parseFloat(localStorage.getItem("volume")) || 1,
      brightness: parseFloat(localStorage.getItem("brightness")) || 1

    };
  },
  methods: {
    handleVolumeChange(value) {
      document.getElementsByTagName("audio")[0].volume = value;
      localStorage.setItem("volume", value);
    },
    handleBrightnessChange(value) {
      document.getElementsByTagName("video")[0].style.filter = `brightness(${value})`;
      localStorage.setItem("brightness", value);
    }
  },
mounted() {
  document.getElementsByTagName("audio")[0].volume = parseFloat(localStorage.getItem("volume")) || 1;
  document.getElementsByTagName("video")[0].style.filter = `brightness(${parseFloat(localStorage.getItem("brightness")) || 1})`;
}
}
</script>
