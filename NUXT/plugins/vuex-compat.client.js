import { useMainStore } from "~/stores/main";
import { useTweaksStore } from "~/stores/tweaks";
import { usePlayerStore } from "~/stores/player";
import { useHistoryStore } from "~/stores/history";
import { usePlaylistStore } from "~/stores/playlist";
import { useSearchStore } from "~/stores/search";
import { useChannelStore } from "~/stores/channel";

const storeMap = {
  main: useMainStore,
  tweaks: useTweaksStore,
  player: usePlayerStore,
  history: useHistoryStore,
  playlist: usePlaylistStore,
  search: useSearchStore,
  channel: useChannelStore,
};

function resolveModuleAndAction(type) {
  if (type.includes("/")) {
    const idx = type.indexOf("/");
    return [type.slice(0, idx), type.slice(idx + 1)];
  }
  return ["main", type];
}

class VuexCompat {
  constructor() {
    this._stores = {};
    for (const [name, factory] of Object.entries(storeMap)) {
      this._stores[name] = factory();
    }
  }

  get state() {
    const stores = this._stores;
    return new Proxy(stores.main.$state, {
      get(target, prop) {
        if (prop in stores && prop !== "main") {
          return stores[prop].$state;
        }
        return target[prop];
      },
    });
  }

  commit(type, payload) {
    const [mod, action] = resolveModuleAndAction(type);
    const store = this._stores[mod];
    if (store && typeof store[action] === "function") {
      store[action](payload);
    } else {
      console.warn(`[vuex-compat] Unknown commit: ${type}`);
    }
  }

  dispatch(type, payload) {
    const [mod, action] = resolveModuleAndAction(type);
    const store = this._stores[mod];
    if (store && typeof store[action] === "function") {
      return store[action](payload);
    }
    console.warn(`[vuex-compat] Unknown dispatch: ${type}`);
  }

  getters = {};
}

export default defineNuxtPlugin(() => {
  const compat = new VuexCompat();

  return {
    provide: {
      store: compat,
    },
  };
});
