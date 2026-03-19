import { defineStore } from "pinia";

export const useSearchStore = defineStore("search", {
  state: () => ({
    loading: false,
  }),

  actions: {
    setLoading(payload) {
      this.loading = payload;
    },
  },
});
