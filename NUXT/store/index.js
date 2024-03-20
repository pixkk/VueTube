import Vue from "vue";

export const state = () => ({
  recommendedVideos: [],
  watchTelemetry: null,
  sponsorBlockIntegration: true,
});

export const mutations = {
  initTelemetryPreference(state) {
    if (process.client) {
      state.watchTelemetry = !(
        // false if false, defaults to true
        (JSON.parse(localStorage.getItem("watchTelemetry")) === false)
      );
      state.sponsorBlockIntegration = !(
        JSON.parse(localStorage.getItem("sponsorBlockIntegration")) === false
      );
      // JSON.parse(localStorage.getItem("watchTelemetry")) === true; // defaults to false
    }
  },
  setTelemetryPreference(state, payload) {
    state.watchTelemetry = payload;
    localStorage.setItem("watchTelemetry", payload);
  },
  setSponsorBlockIntegration(state, payload) {
    state.sponsorBlockIntegration = payload;
    localStorage.setItem("sponsorBlockIntegration", payload);
  },
  updateRecommendedVideos(state, payload) {
    Vue.set(state, "recommendedVideos", payload);
  },
};
