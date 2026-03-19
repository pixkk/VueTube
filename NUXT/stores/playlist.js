import { defineStore } from "pinia";

export const usePlaylistStore = defineStore("playlist", {
  state: () => ({
    playlists: [],
    currentPlaylist: null,
  }),

  actions: {
    initPlaylists() {
      this.playlists =
        JSON.parse(localStorage.getItem("playlists")) || [];
    },

    createPlaylist(name) {
      this.playlists.push({
        name,
        videos: [],
        time: new Date(Date.now()),
      });
      localStorage.setItem("playlists", JSON.stringify(this.playlists));
    },

    removePlaylist(index) {
      this.playlists.splice(index, 1);
      localStorage.setItem("playlists", JSON.stringify(this.playlists));
    },

    addToPlaylist({ index, video }) {
      this.playlists[index].videos.unshift(video);
      this.playlists[index].time = Date.now();
      localStorage.setItem("playlists", JSON.stringify(this.playlists));
    },

    removeFromPlaylist({ playlistIndex, video }) {
      const videoIndex = this.playlists[playlistIndex].videos.findIndex(
        (playlistVideo) => playlistVideo.id === video.id
      );
      if (videoIndex === -1) throw new Error("Unable To Find Video");
      this.playlists[playlistIndex].videos.splice(videoIndex, 1);
      this.playlists[playlistIndex].time = Date.now();
      localStorage.setItem("playlists", JSON.stringify(this.playlists));
    },

    changeToPlaylist(videoIndex) {
      this.currentPlaylist = {
        index: videoIndex,
        ...this.playlists[videoIndex],
      };
    },

    exitPlaylist() {
      this.currentPlaylist = null;
    },
  },
});
