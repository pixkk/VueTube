export const state = () => ({
  loop: null,
  speed: 1,
  speedAutosave: null,
  preload: null,
  preloadUpTo: 100,
  removeVP9Codec: false,
  // quality: null,
  // qualityAutoSwitch: null,
  // shortFullscreen: null,
  // autoplay: null,
  // shorts: null,
  // music: null,
});
export const mutations = {
  initPlayer(state) {
    if (process.client) {
      if (localStorage.getItem("loop") === "undefined") {
        localStorage.setItem("loop", "false");
      }
      state.loop =
        localStorage.getItem("loop") !== "undefined"
          ? JSON.parse(localStorage.getItem("loop")) === 'true'
          : false; // defaults to false
      state.speed = JSON.parse(localStorage.getItem("speed")) || 1; // defaults to 1
      state.speedAutosave = !(
        // false if false, defaults to true
        (JSON.parse(localStorage.getItem("speedAutosave")) === false)
      );
      state.preload = JSON.parse(localStorage.getItem("preload")) === true; // defaults to false
      state.preloadUpTo =
        JSON.parse(localStorage.getItem("preloadUpTo")) || 100; // defaults to 100(percent)
      if (localStorage.getItem("removeVP9Codec") !== ("true" || "false")) {
        localStorage.setItem("removeVP9Codec", "false");
      }
      console.log("state:")
      console.log(localStorage.getItem("removeVP9Codec"))
      state.removeVP9Codec = Boolean(localStorage.getItem("removeVP9Codec"))
    }
  },
  setLoop(state, payload) {
    state.loop = payload;
    localStorage.setItem("loop", payload);
  },
  setSpeed(state, payload) {
    state.speed = payload;
    localStorage.setItem("speed", payload);
  },
  setSpeedAutosave(state, payload) {
    state.speedAutosave = payload;
    localStorage.setItem("speedAutosave", payload);
  },
  setPreload(state, payload) {
    state.preload = payload;
    localStorage.setItem("preload", payload);
  },
  setPreloadUpTo(state, payload) {
    state.preloadUpTo = payload;
    localStorage.setItem("preloadUpTo", payload);
  },
  setAvailiablityOfVP9Codec(state, payload) {
    state.removeVP9Codec = payload;
    localStorage.setItem("removeVP9Codec", payload);
  },
  getPreferedCodec() {
    localStorage.getItem("removeVP9Codec");
  },
};
