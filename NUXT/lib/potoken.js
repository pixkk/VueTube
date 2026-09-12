import {CapacitorHttp as Http} from "@capacitor/core";
import {httpGetText} from "./utils";

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
        ...(this.isAuthedUser()
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

let cache = null; // { token, expiresAt }
let creating = null;

// Returns the raw integrityToken from GenerateIT, cached until it's close to expiry.
async function ensureIntegrityToken(ytTvConfig) {
  if (cache && Date.now() < cache.expiresAt && cache.token?.length > 0) {
    return cache.token;
  }
  if (!creating) {
    creating = mintIntegrityToken(ytTvConfig)
      .then((result) => {
        cache = result;
        creating = null;
        return result.token;
      })
      .catch((err) => {
        creating = null;
        throw err;
      });
  }
  return creating;
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

// Session-bound token, bound to livingRoomToken.
export async function getSessionPoToken(livingRoomToken, ytTvConfig = null) {
  if (typeof window === "undefined" || !livingRoomToken) return null;
  let token = await ensureIntegrityToken(ytTvConfig);

  let decodedString = atob(token)
  console.warn(tokenMinter)
  for (var tokenMinterParam = new Uint8Array(decodedString.length), i = 0; i < decodedString.length; i++)
    tokenMinterParam[i] = decodedString.charCodeAt(i);

  const contentBindingBytes = new TextEncoder().encode(livingRoomToken);
  let createdToken = tokenMinter(tokenMinterParam)(contentBindingBytes);
  // console.warn(createdToken);
  console.log("createdToken", createdToken.toBase64({ alphabet: "base64url" }));
  return createdToken.toBase64({ alphabet: "base64url" });
}
