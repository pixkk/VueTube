const STORAGE_KEY = "vt_auth_accounts";
const ACTIVE_KEY = "vt_auth_active";

function loadAccounts() {
  if (!process.client) return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
}

function syncActiveToken(accounts, activeId) {
  const account = accounts.find((a) => a.id === activeId);
  if (account?.accessToken) {
    localStorage.setItem("vt_active_access_token", account.accessToken);
  } else {
    localStorage.removeItem("vt_active_access_token");
  }
}

export const state = () => ({
  accounts: [],
  activeAccountId: null,
});

export const getters = {
  activeAccount(state) {
    return state.accounts.find((a) => a.id === state.activeAccountId) || null;
  },
  isSignedIn(state, getters) {
    return !!getters.activeAccount;
  },
  accessToken(state, getters) {
    return getters.activeAccount?.accessToken || null;
  },
};

export const mutations = {
  init(state) {
    state.accounts = loadAccounts();
    state.activeAccountId =
      localStorage.getItem(ACTIVE_KEY) ||
      state.accounts[0]?.id ||
      null;
    syncActiveToken(state.accounts, state.activeAccountId);
  },

  upsertAccount(state, account) {
    const idx = state.accounts.findIndex((a) => a.id === account.id);
    if (idx >= 0) {
      state.accounts.splice(idx, 1, account);
    } else {
      state.accounts.push(account);
    }
    saveAccounts(state.accounts);
    syncActiveToken(state.accounts, state.activeAccountId);
  },

  setActiveAccount(state, id) {
    state.activeAccountId = id;
    localStorage.setItem(ACTIVE_KEY, id);
    syncActiveToken(state.accounts, id);
  },

  removeAccount(state, id) {
    state.accounts = state.accounts.filter((a) => a.id !== id);
    saveAccounts(state.accounts);
    if (state.activeAccountId === id) {
      state.activeAccountId = state.accounts[0]?.id || null;
      if (state.activeAccountId) {
        localStorage.setItem(ACTIVE_KEY, state.activeAccountId);
      } else {
        localStorage.removeItem(ACTIVE_KEY);
      }
    }
    syncActiveToken(state.accounts, state.activeAccountId);
  },

  updateAccountInfo(state, { id, name, avatar }) {
    const account = state.accounts.find((a) => a.id === id);
    if (account) {
      if (name) account.name = name;
      if (avatar) account.avatar = avatar;
      saveAccounts(state.accounts);
    }
  },

  updateAccessToken(state, { id, accessToken, expiresAt }) {
    const account = state.accounts.find((a) => a.id === id);
    if (account) {
      account.accessToken = accessToken;
      account.expiresAt = expiresAt;
      saveAccounts(state.accounts);
      syncActiveToken(state.accounts, state.activeAccountId);
    }
  },
};

export const actions = {
  init({ commit }) {
    commit("init");
  },

  addAccount({ commit }, { refreshToken, accessToken, expiresIn, email, name, avatar }) {
    const id = email || Date.now().toString();
    const account = {
      id,
      email: email || "",
      name: name || "Account",
      avatar: avatar || "",
      refreshToken,
      accessToken,
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    };
    commit("upsertAccount", account);
    commit("setActiveAccount", id);
    return account;
  },

  switchAccount({ commit }, id) {
    commit("setActiveAccount", id);
  },

  removeAccount({ commit }, id) {
    commit("removeAccount", id);
  },

  updateAccessToken({ commit, state }, { id, accessToken, expiresIn }) {
    commit("updateAccessToken", {
      id,
      accessToken,
      expiresAt: Date.now() + (expiresIn || 3600) * 1000,
    });
  },
};
