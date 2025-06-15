import Vue from "vue";

export const state = () => ({
  recommendedVideos: [],
  watchTelemetry: null,
  sponsorBlockIntegration: true,
  sponsorBlockSegmentsSettingsValue: "",
  recommendationsFix: false,
  channelData: {},
  channel: {},
});

function updateObject(testObject, value) {
  var retrievedObject = JSON.parse(localStorage.getItem(sponsorBlockSegmentsSettingsValue));

  if (retrievedObject) {
    retrievedObject[testObject] = value;
    return retrievedObject;
  } else {
    var newObject = {};
    newObject[testObject] = value;
    return newObject;
  }
}


export const mutations = {
  initRecommendationsFixPreference(state) {
    if (localStorage.getItem("recommendationsFix") == null || localStorage.getItem("recommendationsFix") === undefined ) {
      localStorage.setItem("recommendationsFix", "false");
    }
    state.recommendationsFix = !(JSON.parse(localStorage.getItem("recommendationsFix")) === false)
  },
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
  setRecommendationsFixPreference(state, payload) {
    state.recommendationsFix = payload;
    localStorage.setItem("recommendationsFix", payload);
  },
  setTelemetryPreference(state, payload) {
    state.watchTelemetry = payload;
    localStorage.setItem("watchTelemetry", payload);
  },
  setSponsorBlockIntegration(state, payload) {
    state.sponsorBlockIntegration = payload;
    localStorage.setItem("sponsorBlockIntegration", payload);
  },
  updateSponsorBlockSegmentsSettingsValue(state, payload) {
    // let sbssv = JSON.parse(
    //   localStorage.getItem("sponsorBlockSegmentsSettingsValue")
    // );
    console.log(payload);
    let typeAndValue = payload.split("||");
    console.log(typeAndValue);
    let type = typeAndValue[0];
    let value = typeAndValue[1];
    let settings = updateObject(type, value);
    state.sponsorBlockSegmentsSettingsValue = settings;
    localStorage.setItem("sponsorBlockIntegrationSegmentsSettings", settings);
  },
  updateRecommendedVideos(state, payload) {
    Vue.set(state, "recommendedVideos", payload);
  },
  SET_CHANNEL_DATA(state, payload) {
    Vue.set(state, "channelData", payload);
  },
  updateChannelData(state, payload) {
    state.channel.totalData.contents = state.channel.totalData.contents.concat(payload.contents);
    state.channel.totalData.continuations = state.channel.totalData.continuations.concat(payload.continuations);
  },
  updateCommunityData(state, payload) {
    state.channel.community.contents = state.channel.community.contents.concat(payload.contents);
    state.channel.community.continuations = state.channel.community.continuations.concat(payload.continuations);
  },


};
