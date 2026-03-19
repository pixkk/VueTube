import { defineStore } from "pinia";

export const useHistoryStore = defineStore("history", {
  state: () => ({
    historyVideos: [],
  }),

  actions: {
    initHistory() {
      let history = localStorage.getItem("historyVideos");
      if (history) {
        this.historyVideos = JSON.parse(history);
      }
    },

    addHistory(video) {
      this.historyVideos = this.historyVideos.filter(
        (v) => v.id != video.id
      );
      this.historyVideos.unshift(video);
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(this.historyVideos)
      );
    },

    removeHistory(index) {
      this.historyVideos.splice(index, 1);
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(this.historyVideos)
      );
    },

    clearHistory() {
      this.historyVideos = [];
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(this.historyVideos)
      );
    },
  },
});
