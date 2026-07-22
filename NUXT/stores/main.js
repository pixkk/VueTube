import { defineStore } from "pinia";

export const useMainStore = defineStore("main", {
  state: () => ({
    recommendedVideos: [],
    watchTelemetry: null,
    sponsorBlockIntegration: true,
    sponsorBlockSegmentsSettingsValue: "",
    recommendationsFix: false,
    channelData: {},
    channel: {},
    pendingTvParams: null,
  }),

  actions: {
    setPendingTvParams(params) {
      this.pendingTvParams = params;
    },

    initRecommendationsFixPreference() {
      if (
        localStorage.getItem("recommendationsFix") == null ||
        localStorage.getItem("recommendationsFix") === undefined
      ) {
        localStorage.setItem("recommendationsFix", "false");
      }
      this.recommendationsFix = !(
        JSON.parse(localStorage.getItem("recommendationsFix")) === false
      );
    },

    initTelemetryPreference() {
      this.watchTelemetry = !(
        JSON.parse(localStorage.getItem("watchTelemetry")) === false
      );
      this.sponsorBlockIntegration = !(
        JSON.parse(localStorage.getItem("sponsorBlockIntegration")) === false
      );
    },

    setRecommendationsFixPreference(payload) {
      this.recommendationsFix = payload;
      localStorage.setItem("recommendationsFix", payload);
    },

    setTelemetryPreference(payload) {
      this.watchTelemetry = payload;
      localStorage.setItem("watchTelemetry", payload);
    },

    setSponsorBlockIntegration(payload) {
      this.sponsorBlockIntegration = payload;
      localStorage.setItem("sponsorBlockIntegration", payload);
    },

    updateSponsorBlockSegmentsSettingsValue(payload) {
      console.log(payload);
      let typeAndValue = payload.split("||");
      console.log(typeAndValue);
      let type = typeAndValue[0];
      let value = typeAndValue[1];
      let settings = updateObject(type, value);
      this.sponsorBlockSegmentsSettingsValue = settings;
      localStorage.setItem(
        "sponsorBlockIntegrationSegmentsSettings",
        settings
      );
    },

    updateRecommendedVideos(payload) {
      this.recommendedVideos = payload;
    },

    SET_CHANNEL_DATA(payload) {
      this.channelData = payload;
    },

    updateChannelData(payload) {
      this.channel.totalData.contents =
        this.channel.totalData.contents.concat(payload.contents);
      this.channel.totalData.continuations =
        this.channel.totalData.continuations.concat(payload.continuations);
    },

    updateCommunityData(payload) {
      this.channel.community.contents =
        this.channel.community.contents.concat(payload.contents);
      this.channel.community.continuations =
        this.channel.community.continuations.concat(payload.continuations);
    },
  },
});

function updateObject(testObject, value) {
  var retrievedObject = JSON.parse(
    localStorage.getItem("sponsorBlockSegmentsSettingsValue")
  );
  if (retrievedObject) {
    retrievedObject[testObject] = value;
    return retrievedObject;
  } else {
    var newObject = {};
    newObject[testObject] = value;
    return newObject;
  }
}
