export const state = () => ({
    historyVideos: [],
  });

  export const mutations = {
    initHistory(state) {
      if (process.client) {
        // read local storage and parse the list of objects
        let history = localStorage
          .getItem("historyVideos");
        if (history) {
          state.historyVideos = JSON.parse(history);
        }
      }
    },
    addHistory(state, video) {
      state.historyVideos = state.historyVideos.filter((v) => v.id != video.id); // remove video if it is already in the history list
      state.historyVideos.unshift(video);
      // console.warn(state.historyVideos);
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(state.historyVideos)
      );
    },
    removeHistory(state, index) {
      state.historyVideos.splice(index, 1);
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(state.historyVideos)
      );
    },
    clearHistory(state) {
      state.historyVideos = [];
      localStorage.setItem(
        "historyVideos",
        JSON.stringify(state.historyVideos)
      );
    },
  };
