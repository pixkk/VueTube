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
          <v-icon>mdi-movie-open-settings-outline</v-icon>
        </v-btn>
      </template>
      <v-card class="bg-background">
        <div
          class="d-flex align-center px-4 py-2"
          v-touch="{
            down: () => (sheet = false),
          }"
        >
          <span class="text-subtitle-2">Settings for player</span>
          <v-spacer />
          <v-btn
      elevation="0" icon variant="text" size="small" @click="sheet = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </div>
        <v-divider />
        <v-card-text
          style="max-height: 50vh; flex-direction: column !important"
          class="pa-0 d-flex flex-column-reverse"
        >
          <div class="slider-container"
               style="width: 50%; align-self: center;">
            <span class="slider-label">Volume:</span>
            <v-slider
              @update:modelValue="handleVolumeChange"
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
              @update:modelValue="handleBrightnessChange"
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
      volume: localStorage.getItem("volume") !== null ? parseFloat(localStorage.getItem("volume")) : 1,
      brightness: localStorage.getItem("brightness") !== null ? parseFloat(localStorage.getItem("brightness")) : 1

    };
  },
  methods: {
    handleVolumeChange(value) {
      document.getElementsByTagName("audio")[0].volume = value;
      document.getElementsByTagName("video")[0].volume = value;
      localStorage.setItem("volume", value);
    },
    handleBrightnessChange(value) {
      document.getElementsByTagName("video")[0].style.filter = `brightness(${value})`;
      localStorage.setItem("brightness", value);
    }
  },
mounted() {
  document.getElementsByTagName("audio")[0].volume = localStorage.getItem("volume") !== null ? parseFloat(localStorage.getItem("volume")) : 1;
  document.getElementsByTagName("video")[0].volume = localStorage.getItem("volume") !== null ? parseFloat(localStorage.getItem("volume")) : 1;
  document.getElementsByTagName("video")[0].style.filter = `brightness(${localStorage.getItem("brightness") !== null ? parseFloat(localStorage.getItem("brightness")) : 1})`;
}
}
</script>
