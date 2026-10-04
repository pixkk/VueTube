// Google OAuth 2.0 Device Code Flow — YouTube TV (V2) approach
// Endpoints: https://www.youtube.com/o/oauth2/device/code
//            https://www.youtube.com/o/oauth2/token

import { CapacitorHttp as Http } from "@capacitor/core";
import { useAuthStore } from "~/stores/auth";
import {delay} from "../lib/utils";
import {clientConfigs} from "../lib/constants";

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

// Optional sink for the sign-in debug log (set per signIn call, shown in the UI)
let logSink = null;

function mask(value) {
  if (typeof value !== "string") return value;
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)} (len ${value.length})` : value;
}

function redact(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (/secret|token|code$/i.test(k) && typeof v === "string" && k !== "token_type" && k !== "user_code") out[k] = mask(v);
    else out[k] = v && typeof v === "object" ? redact(v) : v;
  }
  return out;
}

function authLog(step, payload) {
  const line = payload === undefined ? step : `${step}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`;
  console.log("[auth]", line);
  if (logSink) logSink(`${new Date().toISOString().slice(11, 23)} ${line}`);
}

async function postJson(url, body) {
  authLog(`POST ${url}`, redact(body));
  const started = Date.now();
  let resp;
  try {
    resp = await Http.post({
      url,
      headers: { "Content-Type": "application/json" },
      data: JSON.stringify(body),
    });
  } catch (e) {
    authLog("NETWORK ERROR", { name: e?.name, message: e?.message, code: e?.code });
    throw e;
  }
  const raw = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
  authLog(`RESPONSE ${resp.status} (${Date.now() - started}ms)`, {
    contentType: resp.headers?.["Content-Type"] || resp.headers?.["content-type"],
    body: redact(typeof resp.data === "string" ? (() => { try { return JSON.parse(resp.data); } catch { return raw.slice(0, 500); } })() : resp.data),
  });

  let data;
  try {
    data = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
  } catch (e) {
    const err = new Error(`Non-JSON response (HTTP ${resp.status}): ${raw.slice(0, 300)}`);
    err.code = resp.status;
    throw err;
  }
  if (resp.status >= 400 && !["authorization_pending", "slow_down", "access_denied"].includes(data?.error)) {
    const err = new Error(`HTTP ${resp.status} ${url}`);
    err.code = resp.status;
    err.data = { body: data, headers: resp.headers };
    throw err;
  }
  return data;
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

  if (data.error) {
    const err = new Error(data.error);
    err.data = data;
    throw err;
  }
  return data;
}

export async function pollForToken(deviceCode, intervalSec = 5, maxAttempts = 120) {
  const { clientId, clientSecret } = getCredentials();

  const maxNetworkFailures = 6;
  let networkFailures = 0;

  for (let i = 0; i < maxAttempts; i++) {
    await delay(intervalSec * 1000);

    let data;
    try {
      data = await postJson(TOKEN_URL, {
        code: deviceCode,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: GRANT_TYPE_DEVICE,
      });
      networkFailures = 0;
    } catch (e) {
      // HTTP/parse errors carry a numeric code; anything else is a transport failure (DNS, timeout) worth retrying
      const isTransport = typeof e?.code !== "number" && !e?.data;
      if (!isTransport || ++networkFailures > maxNetworkFailures) throw e;
      authLog(`poll #${i + 1} transient network error, retrying`, { message: e?.message, attempt: networkFailures });
      continue;
    }

    authLog(`poll #${i + 1}`, { error: data.error, hasAccessToken: !!data.access_token, hasRefreshToken: !!data.refresh_token });
    if (data.access_token) return data;
    if (data.error && data.error !== "authorization_pending" && data.error !== "slow_down" && data.error !== "access_denied") {
      const err = new Error(data.error);
      err.data = data;
      throw err;
    }
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
      deviceMake: clientConfigs.tvApiVal.deviceMake,
      deviceModel: clientConfigs.tvApiVal.deviceModel,
      userAgent: clientConfigs.tvApiVal.USER_AGENT,
      clientName: clientConfigs.tvApiVal.CLIENTNAME,
      clientVersion: clientConfigs.tvApiVal.VERSION_WEB,
      platform: clientConfigs.tvApiVal.platform,
      browserName: clientConfigs.tvApiVal.browserName,
      browserVersion: clientConfigs.tvApiVal.browserVersion,
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
        "x-youtube-client-version": clientConfigs.tvApiVal.VERSION_WEB,
      },
      data: JSON.stringify({ context: buildTvContext() }),
    });
    const json = typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data;
    const accountEntry = json?.topbar?.guideSectionRenderer?.items?.[0]?.guideAccountEntryRenderer;
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

        async signIn(onCode, onLog) {
          logSink = onLog || null;
          try {
            authLog("sign-in started", { clientId: CLIENT_ID, deviceId: getDeviceId() });
            const codeData = await requestDeviceCode();
            if (onCode) onCode(codeData);

            const tokenData = await pollForToken(
              codeData.device_code,
              codeData.interval || 5
            );

            const accountInfo = await getAccountInfoFromGuide(tokenData.access_token);
            authLog("account info", accountInfo);

            authStore.addAccount({
              refreshToken: tokenData.refresh_token,
              accessToken: tokenData.access_token,
              expiresIn: tokenData.expires_in,
              name: accountInfo?.name,
              avatar: accountInfo?.avatar,
            });

            authLog("sign-in done");
            return authStore.activeAccount;
          } catch (e) {
            authLog("sign-in FAILED", { name: e?.name, message: e?.message, code: e?.code, data: e?.data, stack: e?.stack?.split("\n").slice(0, 3) });
            throw e;
          } finally {
            logSink = null;
          }
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
