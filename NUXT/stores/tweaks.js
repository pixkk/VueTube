import { defineStore } from "pinia";

export const useTweaksStore = defineStore("tweaks", {
  state: () => ({
    roundTweak: null,
    roundThumb: null,
    roundWatch: null,
    launchTheme: null,
    launchIconTheme: null,
    navigationText: null,
    navigationShift: null,
    navigationIcons: null,
  }),

  actions: {
    initTweaks() {
      this.roundTweak =
        JSON.parse(localStorage.getItem("roundTweak")) || 0;
      this.roundThumb =
        JSON.parse(localStorage.getItem("roundThumb")) === true;
      this.roundWatch =
        JSON.parse(localStorage.getItem("roundWatch")) === true;
      this.launchTheme =
        JSON.parse(localStorage.getItem("launchTheme")) || 0;
      this.launchIconTheme =
        JSON.parse(localStorage.getItem("launchIconTheme")) === true;
      this.navigationText = !(
        JSON.parse(localStorage.getItem("navigationText")) === false
      );
      this.navigationShift = !(
        JSON.parse(localStorage.getItem("navigationShift")) === false
      );
      this.navigationIcons =
        JSON.parse(localStorage.getItem("navigationIcons")) || 0;
    },

    setRoundTweak(payload) {
      if (!isNaN(payload)) {
        this.roundTweak = payload;
        localStorage.setItem("roundTweak", payload);
      }
    },
    setRoundThumb(payload) {
      this.roundThumb = payload;
      localStorage.setItem("roundThumb", payload);
    },
    setRoundWatch(payload) {
      this.roundWatch = payload;
      localStorage.setItem("roundWatch", payload);
    },
    setLaunchTheme(payload) {
      this.launchTheme = payload;
      localStorage.setItem("launchTheme", payload);
    },
    setLaunchIconTheme(payload) {
      this.launchIconTheme = payload;
      localStorage.setItem("launchIconTheme", payload);
    },
    setNavigationText(payload) {
      this.navigationText = payload;
      localStorage.setItem("navigationText", payload);
    },
    setNavigationShift(payload) {
      this.navigationShift = payload;
      localStorage.setItem("navigationShift", payload);
    },
    setNavigationIcons(payload) {
      this.navigationIcons = payload;
      localStorage.setItem("navigationIcons", payload);
    },
  },
});
