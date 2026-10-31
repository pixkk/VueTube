import { defineStore } from "pinia";

const STORAGE_KEY = "vt_auth_accounts";
const ACTIVE_KEY = "vt_auth_active";

function loadAccounts() {
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

export const useAuthStore = defineStore("auth", {
  state: () => ({
    accounts: [],
    activeAccountId: null,
  }),

  getters: {
    activeAccount(state) {
      return state.accounts.find((a) => a.id === state.activeAccountId) || null;
    },
    isSignedIn(state) {
      return !!state.accounts.find((a) => a.id === state.activeAccountId);
    },
    accessToken(state) {
      const account = state.accounts.find((a) => a.id === state.activeAccountId);
      return account?.accessToken || null;
    },
  },

  actions: {
    init() {
      this.accounts = loadAccounts();
      const saved = localStorage.getItem(ACTIVE_KEY);
      this.activeAccountId = saved === null ? this.accounts[0]?.id || null : saved || null;
      syncActiveToken(this.accounts, this.activeAccountId);
    },

    addAccount({ refreshToken, accessToken, expiresIn, email, name, avatar }) {
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
      const idx = this.accounts.findIndex((a) => a.id === account.id);
      if (idx >= 0) {
        this.accounts.splice(idx, 1, account);
      } else {
        this.accounts.push(account);
      }
      saveAccounts(this.accounts);

      this.activeAccountId = id;
      localStorage.setItem(ACTIVE_KEY, id);
      syncActiveToken(this.accounts, id);

      return account;
    },

    switchAccount(id) {
      this.activeAccountId = id || null;
      localStorage.setItem(ACTIVE_KEY, id || "");
      syncActiveToken(this.accounts, id);
    },

    removeAccount(id) {
      this.accounts = this.accounts.filter((a) => a.id !== id);
      saveAccounts(this.accounts);
      if (this.activeAccountId === id) {
        this.activeAccountId = this.accounts[0]?.id || null;
        if (this.activeAccountId) {
          localStorage.setItem(ACTIVE_KEY, this.activeAccountId);
        } else {
          localStorage.removeItem(ACTIVE_KEY);
        }
      }
      syncActiveToken(this.accounts, this.activeAccountId);
    },

    updateAccountInfo({ id, name, avatar }) {
      const account = this.accounts.find((a) => a.id === id);
      if (account) {
        if (name) account.name = name;
        if (avatar) account.avatar = avatar;
        saveAccounts(this.accounts);
      }
    },

    updateAccessToken({ id, accessToken, expiresIn }) {
      const account = this.accounts.find((a) => a.id === id);
      if (account) {
        account.accessToken = accessToken;
        account.expiresAt = Date.now() + (expiresIn || 3600) * 1000;
        saveAccounts(this.accounts);
        syncActiveToken(this.accounts, this.activeAccountId);
      }
    },
  },
});
