// PoToken (Proof of Origin) generation via BotGuard.
// 1. Fetch a BotGuard challenge from the Create endpoint (api/jnn/v1/Create), keyed by the
//    fixed WEB-family REQUEST_KEY.
// 2. Run the challenge through BotGuard to get a snapshot response.
// 3. Exchange the snapshot for an integrity token via GenerateIT, and use that token directly
//    as the poToken (serviceIntegrityDimensions.poToken) — no WebPoMinter/minting involved.
// Library: bgutils-js

import { CapacitorHttp as Http } from "@capacitor/core";
import { BotGuardClient, getChallenge } from "bgutils-js/botguard";
import { buildURL } from "bgutils-js/utils";

// Public request key used by YouTube's own BotGuard challenge.
// Z1elNkAKLpSR3oPOUMSN - for TV, O43z0dpjhgX20SCx4KAo - for WEB
const REQUEST_KEY = "Z1elNkAKLpSR3oPOUMSN";

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
    const te = typeof teResp.data === "string" ? teResp.data : String(teResp.data);
    el.textContent = te;
    document.head.appendChild(el);
  }
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
  // const [integrityToken, estimatedTtlSecs, mintRefreshThreshold] = await resp.json();
  const [emptyVal, estimatedTtlSecs, mintRefreshThreshold = 100, integrityToken] = await resp.json();
  return { integrityToken, estimatedTtlSecs, mintRefreshThreshold };
}

async function mintIntegrityToken() {
  let resp = await Http.get({
    url: "https://www.youtube.com/tv_config",
    params: { action_get_config: "true", client: "lb4", theme: "cl" },
    headers: {
      "device-memory": "16",
      "authorization": `Bearer ${localStorage.getItem("vt_active_access_token")}`,
    },
    webFetchExtra: { credentials: "include" },
  });
  let f = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data);
  f = f.replace(")]}'\n", "");
  f = JSON.parse(f);
  console.log("f", f);
  let ch = JSON.parse(f.challengeParams.R)
  // console.log("ch1", f.challengeParams.R);
  console.log("ch", ch);
  // const challenge = await getChallenge({
  //   requestKey: REQUEST_KEY,
  //   fetchFunction: capacitorFetch,
  //   interpreterHash: ch.bgChallenge.interpreterHash,
  //   useYouTubeAPI: false,
  // });

  await loadInterpreter(ch.bgChallenge);
  console.log("globalName", ch.bgChallenge.globalName)
  console.log("program", ch.bgChallenge.program)

  const botguardClient = await BotGuardClient.create({
    globalObject: window,
    globalName: ch.bgChallenge.globalName,
    program: ch.bgChallenge.program,
  });

  const webPoSignalOutput = [];
  const botguardResponse = await botguardClient.snapshot({ webPoSignalOutput });

  const integrityTokenResponse = await generateIntegrityToken(botguardResponse);

  const ttlSecs = integrityTokenResponse.estimatedTtlSecs || 21600;
  const refreshThresholdSecs = integrityTokenResponse.mintRefreshThreshold || 0;
  const expiresAt = Date.now() + (ttlSecs - refreshThresholdSecs) * 1000;

  return { token: integrityTokenResponse.integrityToken, expiresAt };
}

let cache = null; // { token, expiresAt }
let creating = null;

// Returns the raw integrityToken from GenerateIT, cached until it's close to expiry.
async function ensureIntegrityToken() {
  if (cache && Date.now() < cache.expiresAt && cache.token?.length > 0) {
    return cache.token;
  }
  if (!creating) {
    creating = mintIntegrityToken()
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
  console.log("token", token);
  return token;
}

// Content-bound token for a /player request, bound to the videoId.
export async function getContentPoToken(videoId) {
  if (typeof window === "undefined" || !videoId) return null;
  try {
    return await ensureIntegrityToken();
  } catch (err) {
    console.warn("[potoken] Failed to generate content poToken", err);
    return null;
  }
}

// Session-bound token, bound to visitorData.
export async function getSessionPoToken(visitorData) {
  if (typeof window === "undefined" || !visitorData) return null;
  try {
    return await ensureIntegrityToken();
  } catch (err) {
    console.warn("[potoken] Failed to generate session poToken", err);
    return null;
  }
}
