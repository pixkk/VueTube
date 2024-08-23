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
<!--          <v-slider-->
<!--            id="volumeSlider"-->
<!--            :max="1"-->
<!--            :step="0.1"-->
<!--            :thumb-label="true"-->
<!--            :thumb-size="20"-->
<!--           ></v-slider>-->
<!--          <v-slider-->
<!--            id="brightnessSlider"-->
<!--            :max="1"-->
<!--            :step="0.1"-->
<!--            :thumb-label="true"-->
<!--            :thumb-size="20"-->
<!--          ></v-slider>-->





        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>
<script>
export default {
  props: {},
  emits: ["volumeHandler", "brightnessHandler"],
  data: () => ({
    sheet: false,
  }),

  mounted() {
    document.addEventListener("DOMContentLoaded", function(event) {


    console.warn("DISPLAYED")
      const volumeSlider = document.getElementById('volumeSlider');
      console.log(volumeSlider);
      console.log(document);
      const brightnessSlider = document.getElementById('brightnessSlider');
      document.getElementsByTagName("audio")[0].volume = localStorage.getItem("volume") || 1;
      document.getElementsByTagName("video")[0].style.filter = `brightness(${localStorage.getItem("brightness") || 1})`;

      // volumeSlider.addEventListener('input', function() {
      //   document.getElementsByTagName("audio")[0].volume = volumeSlider.value;
      //   localStorage.setItem("volume", volumeSlider.value);
      // });

      // brightnessSlider.addEventListener('input', function() {
      //   document.getElementsByTagName("video")[0].style.filter = `brightness(${brightnessSlider.value})`;
      //   localStorage.setItem("brightness", brightnessSlider.value);
      // });
    });
  }
}
</script>
