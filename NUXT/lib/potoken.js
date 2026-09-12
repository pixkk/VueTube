import {Capacitor, CapacitorHttp as Http} from "@capacitor/core";
import {httpGetText} from "./utils";

// Web/dev only: BotGuard needs a genuine browser runtime pinned to a real
// youtube.com page, which this app's own web build doesn't have.
// devproxy runs a real (Playwright) browser
// on demand for this. Never used on native platforms.
const DEV_PROXY_POTOKEN_URL = "http://localhost:8787/potoken/session";

function getStoredAuthToken() {
  const token = localStorage.getItem("vt_active_access_token");
  return token || undefined;
}

async function devProxyGetSessionPoToken(livingRoomToken) {
  const resp = await fetch(DEV_PROXY_POTOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ livingRoomToken, authToken: getStoredAuthToken() }),
  });
  const json = await resp.json();
  if (json.error) throw new Error(`devproxy: ${json.error}`);
  return json; // { sessionPoToken, expiresAt }
}

// Public request key used by YouTube's own BotGuard challenge.
// Z1elNkAKLpSR3oPOUMSN - for TV, O43z0dpjhgX20SCx4KAo - for WEB
let REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";
let tokenMinter = null;

async function capacitorFetch(url, options = {}) {
  const resp = await Http.post({
    url,
    headers: options.headers || {},
    data: options.body,
  }).catch((error) => error);

  if (resp instanceof Error) {
    throw resp;
  }

  return {
    ok: resp.status >= 200 && resp.status < 300,
    status: resp.status,
    json: async () => (typeof resp.data === "string" ? JSON.parse(resp.data) : resp.data),
  };
}

async function loadInterpreter(challenge) {
  const script = challenge.interpreterJavascript
    ?.privateDoNotAccessOrElseSafeScriptWrappedValue || challenge.interpreterUrl.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
  if (!script) {
    throw new Error("potoken: BotGuard challenge did not include an interpreter script");
  }

  const scriptId = challenge.interpreterHash || `bg-vm-${Date.now()}`;
  if (!document.getElementById(scriptId)) {
    const el = document.createElement("script");
    el.id = scriptId;
    const teResp = await Http.get({ url: "https:" + script });
    el.textContent = typeof teResp.data === "string" ? teResp.data : String(teResp.data);
    document.head.appendChild(el);
  }
}
function buildURL(endpointName, useYouTubeAPI) {
  return `${useYouTubeAPI ? 'https://www.youtube.com' : 'https://jnn-pa.googleapis.com'}/${useYouTubeAPI ? 'api/jnn/v1' : '$rpc/google.internal.waa.v1.Waa'}/${endpointName}`;
}
async function generateIntegrityToken(botguardResponse) {
  const headers = {
    'content-type': 'application/json+protobuf',
    'x-goog-api-key': 'AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw',
  };
  const resp = await capacitorFetch(buildURL("GenerateIT", true), {
    headers: headers,
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  if (!resp.ok) {
    throw new Error(`potoken: GenerateIT failed with status ${resp.status}`);
  }
  // Response shape is [null, estimatedTtlSecs, mintRefreshThreshold, integrityToken].
  // or [integrityToken, estimatedTtlSecs, mintRefreshThreshold].
  let respJson = await resp.json();
  let integrityToken, estimatedTtlSecs, mintRefreshThreshold;
  if (respJson[0]) {
    integrityToken = respJson[0];
    estimatedTtlSecs = respJson[1];
    mintRefreshThreshold = respJson[2];
  }
  else {
    integrityToken = respJson[3];
    estimatedTtlSecs = respJson[1];
    mintRefreshThreshold = respJson[2];
  }
  return { integrityToken, estimatedTtlSecs, mintRefreshThreshold };
}
function isAuthedUser() {
  return !!localStorage.getItem("vt_active_access_token") || false;
}
async function mintIntegrityToken(ytTvConfig = null) {
  if (!ytTvConfig)  {
    ytTvConfig = await httpGetText({
      url: "https://www.youtube.com/tv_config?action_get_config=true&client=lb4&theme=cl",
      headers: {
        "device-memory": "16",
        ...(isAuthedUser()
          ? { "authorization": `Bearer ${localStorage.getItem("vt_active_access_token")}` }
          : {}),
      },
    });
    ytTvConfig = JSON.parse(ytTvConfig.data.replace(/^[)\]}'\s]+/, ""));
  }
  console.log("ytTvConfig", ytTvConfig);
  let ch = JSON.parse(ytTvConfig.challengeParams.R)
  // console.log("challengeParams", f.challengeParams.R);
  // console.log("challengeResponse", ch);

  REQUEST_KEY = ytTvConfig.challengeRequestKey;
  await loadInterpreter(ch.bgChallenge);
  let globalName = ch.bgChallenge.globalName;
  let programKey = ch.bgChallenge.program;
  console.log("globalName", globalName)
  console.log("programKey", programKey)

  let D = function (y, z, C, F) {}
  let v = [function (y, z) {}, function (y) {}, function (y) {}, function (y, z) {}];
  let callbackHolder = function (y, z, C, F) {
    Promise.resolve().then(function () {
      callbackHolder.minter = y;
      callbackHolder.unknownOne = z;
      callbackHolder.unknownTwo = C;
      callbackHolder.unknownThree = F;
    });
  };

  window[globalName]?.a(programKey, callbackHolder, true, undefined, D, [[], []], "", false, v, undefined);
  while (typeof callbackHolder.minter !== "function") {
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  let poOutput =  [{}, undefined, [], undefined];
  let tokenPromise = new Promise((resolve, reject) => {
    callbackHolder.minter((response) => resolve(response), poOutput);
    tokenMinter = poOutput[2][0];
  });

  let token = await tokenPromise;
  const integrityTokenResponse = await generateIntegrityToken(token);

  const ttlSecs = integrityTokenResponse.estimatedTtlSecs || 43200;
  const refreshThresholdSecs = integrityTokenResponse.mintRefreshThreshold || 0;
  const expiresAt = Date.now() + (ttlSecs - refreshThresholdSecs) * 1000;
  return { token: integrityTokenResponse.integrityToken, expiresAt };
}

// NOTE: integrityToken caching used to live here (cache/creating around
// ensureIntegrityToken), but it was removed on purpose: only the final
// session poToken is cached now. The mobile (native WebView) mint
// chain below is re-run from scratch on any cache
// miss/expiry/error. The web variant may end up with a different
// integrity-token lifecycle/caching strategy of its own once implemented,
// so don't reintroduce a shared integrity-token cache here without
// checking that plan first.
async function ensureIntegrityToken(ytTvConfig) {
  const result = await mintIntegrityToken(ytTvConfig);
  return result.token;
}

export async function getPoToken() {
  let token = await ensureIntegrityToken();
  // token = tokenMinter(Uint8Array.from(atob(token), char => char.charCodeAt(0))).toBase64()
  // token = "MlMSMhfhwSgU5RIJjtpcJQmJ-VsZyP5dYpRUrMMAnE9DdzL3XQDjawMe3N4weLtU3inPjVBPZ5vaB_6hZ4L_lAbgOGfeF1S-0TQCNrerCLJ8RXqsdQ==";
  console.log("token", token);
  return token;
}

// Content-bound token for a /player request, bound to the videoId.
export async function getContentPoToken(videoId) {
  if (typeof window === "undefined" || !videoId) return null;
  let token = await ensureIntegrityToken();
  // token = tokenMinter(Uint8Array.from(atob(token), char => char.charCodeAt(0))).toBase64()
  // token = "MlTMVHZqFblEwcxpaIOiKWbEZ1hvS0IruoOyivXO+Br20krvOa8vbALLyQa2PFcxvQG/6gXiWxbaH4qlQBJ3lR2hEvq3kciuIYUlhaiY2Vk4ybUHBzU=";
  console.log("token", token);
  return token;
}

let sessionCache = null; // { livingRoomToken, token, expiresAt }

// Session-bound token, bound to livingRoomToken. This is the only token
// that gets cached — see the note above ensureIntegrityToken. On any
// miss/expiry the whole mint chain (tv_config -> BotGuard VM -> GenerateIT
// -> tokenMinter -> this) is re-run from scratch.
export async function getSessionPoToken(livingRoomToken, ytTvConfig = null) {
  if (typeof window === "undefined" || !livingRoomToken) return null;

  if (
    sessionCache &&
    sessionCache.livingRoomToken === livingRoomToken &&
    Date.now() < sessionCache.expiresAt &&
    sessionCache.token?.length > 0
  ) {
    return sessionCache.token;
  }


  if (!Capacitor.isNativePlatform()) {
    const result = await devProxyGetSessionPoToken(livingRoomToken);
    sessionCache = {
      livingRoomToken,
      token: result.sessionPoToken,
      expiresAt: result.expiresAt,
    };
    return result.sessionPoToken;
  }

  let token = await ensureIntegrityToken(ytTvConfig);

  let decodedString = atob(token)
  console.warn(tokenMinter)
  for (var tokenMinterParam = new Uint8Array(decodedString.length), i = 0; i < decodedString.length; i++)
    tokenMinterParam[i] = decodedString.charCodeAt(i);

  const contentBindingBytes = new TextEncoder().encode(livingRoomToken);
  let createdToken = tokenMinter(tokenMinterParam)(contentBindingBytes);
  // console.warn(createdToken);
  const sessionPoToken = createdToken.toBase64({ alphabet: "base64url" });
  console.log("createdToken", sessionPoToken);

  sessionCache = {
    livingRoomToken,
    token: sessionPoToken,
    expiresAt: Date.now() + 43200 * 1000,
  };

  return sessionPoToken;
}
