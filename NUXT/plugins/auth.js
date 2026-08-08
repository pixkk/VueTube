// Google OAuth 2.0 Device Code Flow — YouTube TV (V2) approach
// Endpoints: https://www.youtube.com/o/oauth2/device/code
//            https://www.youtube.com/o/oauth2/token

import { CapacitorHttp as Http } from "@capacitor/core";
import { useAuthStore } from "~/stores/auth";
import {delay} from "../lib/utils";

// Scope used by YouTube TV clients
const SCOPE = "http://gdata.youtube.com https://www.googleapis.com/auth/youtube-paid-content";
// Grant type for device code flow (TV/limited input)
const GRANT_TYPE_DEVICE = "http://oauth.net/grant_type/device/1.0";
const GRANT_TYPE_REFRESH = "refresh_token";

const DEVICE_CODE_URL = "https://www.youtube.com/o/oauth2/device/code";
const TOKEN_URL = "https://www.youtube.com/o/oauth2/token";
const REVOKE_URL = "https://www.youtube.com/o/oauth2/revoke";
const GUIDE_URL = "https://www.youtube.com/youtubei/v1/guide";

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

function buildTvContext() {
  const hl = (typeof localStorage !== "undefined" && localStorage.getItem("language")) || "en";
  return {
    client: {
      hl,
      gl: "US",
      deviceMake: "Sony",
      deviceModel: "BRAVIA 8K UR2",
      userAgent: "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
      clientName: "TVHTML5",
      clientVersion: "7.20260713.15.00",
      platform: "TV",
      browserName: "Opera",
      browserVersion: "46.0.2207.0",
    },
    user: { enableSafetyMode: false },
    request: { internalExperimentFlags: [], consistencyTokenJars: [] },
  };
}

export async function getAccountInfoFromGuide(accessToken) {
  try {
    const resp = await Http.post({
      url: GUIDE_URL,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-youtube-client-name": "7",
        "x-youtube-client-version": "7.20260125.19.00",
      },
      data: JSON.stringify({ context: buildTvContext() }),
    });
    const json = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    const accountEntry = json?.items?.[0]?.guideSectionRenderer?.items?.[0]?.guideAccountEntryRenderer;
    if (!accountEntry) return null;
    const name = accountEntry.title?.simpleText || accountEntry.title?.accessibility?.accessibilityData?.label || null;
    const avatar = accountEntry.thumbnail?.thumbnails?.slice(-1)[0]?.url || null;
    return { name, avatar };
  } catch {
    return null;
  }
}

// Refreshes the active account's token (if needed) and its display name/avatar.
// Takes no store argument (unlike the Nuxt 2 original) — Pinia stores are
// singletons reachable via useAuthStore() from anywhere, no Vuex store instance
// needs to be threaded through.
export async function refreshAccountInfo() {
  const authStore = useAuthStore();
  const account = authStore.activeAccount;
  if (!account) return;

  const isExpired = !account.expiresAt || Date.now() >= account.expiresAt - 60000;
  let token = account.accessToken;
  if (isExpired) {
    const tokenData = await refreshAccessToken(account.refreshToken);
    authStore.updateAccessToken({
      id: account.id,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
    });
    token = tokenData.access_token;
  }

  const info = await getAccountInfoFromGuide(token);
  if (info) {
    authStore.updateAccountInfo({ id: account.id, ...info });
  }
}

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  authStore.init();

  return {
    provide: {
      auth: {
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

          const accountInfo = await getAccountInfoFromGuide(tokenData.access_token);

          authStore.addAccount({
            refreshToken: tokenData.refresh_token,
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
            name: accountInfo?.name,
            avatar: accountInfo?.avatar,
          });

          return authStore.activeAccount;
        },

        async signOut(id) {
          const account = authStore.accounts.find((a) => a.id === id);
          if (account?.refreshToken) {
            try {
              await Http.post({
                url: REVOKE_URL,
                headers: { "Content-Type": "application/json" },
                data: JSON.stringify({ token: account.refreshToken }),
              });
            } catch {
              // ignore revoke errors — remove account regardless
            }
          }
          authStore.removeAccount(id);
        },

        switchAccount(id) {
          authStore.switchAccount(id);
        },

        async refreshAccountInfo(id) {
          const targetId = id || authStore.activeAccountId;
          const account = authStore.accounts.find((a) => a.id === targetId);
          if (!account) return;
          const token = await this.ensureFreshToken();
          if (!token) return;
          const info = await getAccountInfoFromGuide(token);
          if (info) {
            authStore.updateAccountInfo({ id: targetId, ...info });
          }
        },

        async ensureFreshToken() {
          const account = authStore.activeAccount;
          if (!account) return null;

          const isExpired =
            !account.expiresAt || Date.now() >= account.expiresAt - 60000;
          if (!isExpired) return account.accessToken;

          const tokenData = await refreshAccessToken(account.refreshToken);
          authStore.updateAccessToken({
            id: account.id,
            accessToken: tokenData.access_token,
            expiresIn: tokenData.expires_in,
          });
          return tokenData.access_token;
        },
      },
    },
  };
});
