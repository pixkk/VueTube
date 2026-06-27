// Google OAuth 2.0 Device Code Flow — YouTube TV (V2) approach
// Endpoints: https://www.youtube.com/o/oauth2/device/code
//            https://www.youtube.com/o/oauth2/token
// Same method used by SmartTube (AuthApi V2)

import { Http } from "@capacitor-community/http";

// Scope used by YouTube TV clients
const SCOPE = "http://gdata.youtube.com https://www.googleapis.com/auth/youtube-paid-content";
// Grant type for device code flow (TV/limited input)
const GRANT_TYPE_DEVICE = "http://oauth.net/grant_type/device/1.0";
const GRANT_TYPE_REFRESH = "refresh_token";

const DEVICE_CODE_URL = "https://www.youtube.com/o/oauth2/device/code";
const TOKEN_URL = "https://www.youtube.com/o/oauth2/token";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

function getDeviceId() {
  let id = localStorage.getItem("vt_device_id");
  if (!id) {
    id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
    localStorage.setItem("vt_device_id", id);
  }
  return id;
}

const CLIENT_ID = "861556708454-d6dlm3lh05idd8npek18k6be8ba3oc68.apps.googleusercontent.com";
const CLIENT_SECRET = "SboVhoG9s0rNafixCSGGKXAT";

function getCredentials() {
  return { clientId: CLIENT_ID, clientSecret: CLIENT_SECRET };
}

async function postJson(url, body) {
  const resp = await Http.post({
    url,
    headers: { "Content-Type": "application/json" },
    data: JSON.stringify(body),
  });
  return typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
}

async function getJson(url, token) {
  const resp = await Http.get({
    url,
    headers: { Authorization: `Bearer ${token}` },
  });
  return typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
}

export async function requestDeviceCode() {
  const { clientId } = getCredentials();
  if (!clientId) throw new Error("client_credentials_missing");

  const data = await postJson(DEVICE_CODE_URL, {
    client_id: clientId,
    scope: SCOPE,
    device_id: getDeviceId(),
    device_model: "ytlr:sony:bravia 8k ur2",
  });

  if (data.error) throw new Error(data.error);
  return data;
}

export async function pollForToken(deviceCode, intervalSec = 5, maxAttempts = 120) {
  const { clientId, clientSecret } = getCredentials();

  for (let i = 0; i < maxAttempts; i++) {
    await delay(intervalSec * 1000);

    const data = await postJson(TOKEN_URL, {
      code: deviceCode,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: GRANT_TYPE_DEVICE,
    });

    if (data.access_token) return data;
    if (data.error === "access_denied") throw new Error("access_denied");
    if (data.error === "slow_down") intervalSec = Math.min(intervalSec + 5, 30);
    // "authorization_pending" — keep polling
  }
  throw new Error("timeout");
}

export async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getCredentials();
  const data = await postJson(TOKEN_URL, {
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: GRANT_TYPE_REFRESH,
  });
  if (!data.access_token) throw new Error("refresh_failed");
  return data;
}

export async function getUserInfo(accessToken) {
  try {
    return await getJson(USERINFO_URL, accessToken);
  } catch {
    return null;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default (ctx, inject) => {
  const store = ctx.store;

  store.dispatch("auth/init");

  inject("auth", {
    hasCredentials() {
      const { clientId } = getCredentials();
      return !!clientId;
    },

    async signIn(onCode) {
      const codeData = await requestDeviceCode();
      if (onCode) onCode(codeData);

      const tokenData = await pollForToken(
        codeData.device_code,
        codeData.interval || 5
      );

      const userInfo = await getUserInfo(tokenData.access_token);

      await store.dispatch("auth/addAccount", {
        refreshToken: tokenData.refresh_token,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
        email: userInfo?.email,
        name: userInfo?.name,
        avatar: userInfo?.picture,
      });

      return store.getters["auth/activeAccount"];
    },

    signOut(id) {
      store.dispatch("auth/removeAccount", id);
    },

    switchAccount(id) {
      store.dispatch("auth/switchAccount", id);
    },

    async ensureFreshToken() {
      const account = store.getters["auth/activeAccount"];
      if (!account) return null;

      const isExpired =
        !account.expiresAt || Date.now() >= account.expiresAt - 60000;
      if (!isExpired) return account.accessToken;

      const tokenData = await refreshAccessToken(account.refreshToken);
      store.dispatch("auth/updateAccessToken", {
        id: account.id,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in,
      });
      return tokenData.access_token;
    },
  });
};
