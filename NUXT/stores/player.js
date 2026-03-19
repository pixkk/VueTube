import { defineStore } from "pinia";

export const usePlayerStore = defineStore("player", {
  state: () => ({
    loop: null,
    speed: 1,
    speedAutosave: null,
    preload: null,
    preloadUpTo: 100,
    removeVP9Codec: false,
  }),

  actions: {
    initPlayer() {
      if (localStorage.getItem("loop") === "undefined") {
        localStorage.setItem("loop", "false");
      }
      this.loop =
        localStorage.getItem("loop") !== "undefined"
          ? JSON.parse(localStorage.getItem("loop")) === "true"
          : false;
      this.speed = JSON.parse(localStorage.getItem("speed")) || 1;
      this.speedAutosave = !(
        JSON.parse(localStorage.getItem("speedAutosave")) === false
      );
      this.preload =
        JSON.parse(localStorage.getItem("preload")) === true;
      this.preloadUpTo =
        JSON.parse(localStorage.getItem("preloadUpTo")) || 100;
      if (
        localStorage.getItem("removeVP9Codec") !== "true" &&
        localStorage.getItem("removeVP9Codec") !== "false"
      ) {
        localStorage.setItem("removeVP9Codec", "false");
      }
      console.log("state:");
      console.log(localStorage.getItem("removeVP9Codec"));
      this.removeVP9Codec = Boolean(
        localStorage.getItem("removeVP9Codec")
      );
    },

    setLoop(payload) {
      this.loop = payload;
      localStorage.setItem("loop", payload);
    },
    setSpeed(payload) {
      this.speed = payload;
      localStorage.setItem("speed", payload);
    },
    setSpeedAutosave(payload) {
      this.speedAutosave = payload;
      localStorage.setItem("speedAutosave", payload);
    },
    setPreload(payload) {
      this.preload = payload;
      localStorage.setItem("preload", payload);
    },
    setPreloadUpTo(payload) {
      this.preloadUpTo = payload;
      localStorage.setItem("preloadUpTo", payload);
    },
    setAvailiablityOfVP9Codec(payload) {
      this.removeVP9Codec = payload;
      localStorage.setItem("removeVP9Codec", payload);
    },
    getPreferedCodec() {
      return localStorage.getItem("removeVP9Codec");
    },
  },
});
