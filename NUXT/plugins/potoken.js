// PoToken (Proof of Origin) generation via BotGuard.
// 1. Mint a BotGuard integrity token once per visitorData ("session" scope).
// 2. Reuse the resulting minter to mint a content-bound token per videoId
//    for every /player request, and a session-bound token from visitorData.
// Library: bgutils-js
// TODO: migrate from bgutils-js

import { Http } from "@capacitor-community/http";
import { BotGuardClient, getChallenge } from "bgutils-js/dist/exports/botguard.js";
import { WebPoMinter } from "bgutils-js/dist/exports/webpo.js";
import { buildURL, getHeaders } from "bgutils-js/dist/exports/utils.js";

// Public request key used by YouTube's own WEB-family BotGuard challenge.
const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

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

function loadInterpreter(challenge) {
  const script = challenge.interpreterJavascript
    ?.privateDoNotAccessOrElseSafeScriptWrappedValue;
  if (!script) {
    throw new Error("potoken: BotGuard challenge did not include an interpreter script");
  }

  const scriptId = challenge.interpreterHash || `bg-vm-${Date.now()}`;
  if (!document.getElementById(scriptId)) {
    const el = document.createElement("script");
    el.id = scriptId;
    el.textContent = script;
    document.head.appendChild(el);
  }
}

async function generateIntegrityToken(botguardResponse) {
  const resp = await capacitorFetch(buildURL("GenerateIT", true), {
    headers: getHeaders(),
    body: JSON.stringify([REQUEST_KEY, botguardResponse]),
  });
  if (!resp.ok) {
    throw new Error(`potoken: GenerateIT failed with status ${resp.status}`);
  }
  const [integrityToken, estimatedTtlSecs, mintRefreshThreshold] = await resp.json();
  return { integrityToken, estimatedTtlSecs, mintRefreshThreshold };
}

async function createMinter() {
  const challenge = await getChallenge({
    requestKey: REQUEST_KEY,
    fetchFunction: capacitorFetch,
    useYouTubeAPI: true,
  });

  loadInterpreter(challenge);

  const botguardClient = await BotGuardClient.create({
    globalObject: window,
    globalName: challenge.globalName,
    program: challenge.program,
  });

  const webPoSignalOutput = [];
  const botguardResponse = await botguardClient.snapshot({ webPoSignalOutput });

  const integrityTokenResponse = await generateIntegrityToken(botguardResponse);
  const minter = await WebPoMinter.create(integrityTokenResponse, webPoSignalOutput);

  const ttlSecs = integrityTokenResponse.estimatedTtlSecs || 21600;
  const refreshThresholdSecs = integrityTokenResponse.mintRefreshThreshold || 0;
  const expiresAt = Date.now() + (ttlSecs - refreshThresholdSecs) * 1000;

  return { minter, expiresAt };
}

let cache = null; // { minter, expiresAt }
let creating = null;

async function ensureMinter() {
  if (cache && Date.now() < cache.expiresAt) {
    return cache.minter;
  }
  if (!creating) {
    creating = createMinter()
      .then((result) => {
        cache = result;
        creating = null;
        return result.minter;
      })
      .catch((err) => {
        creating = null;
        throw err;
      });
  }
  return creating;
}

// Content-bound token for a /player request, bound to the videoId.
export async function getContentPoToken(videoId) {
  if (typeof window === "undefined" || !videoId) return null;
  try {
    const minter = await ensureMinter();
    return await minter.mintAsWebsafeString(videoId);
  } catch (err) {
    console.warn("[potoken] Failed to generate content poToken", err);
    return null;
  }
}

// Session-bound token, bound to visitorData.
export async function getSessionPoToken(visitorData) {
  if (typeof window === "undefined" || !visitorData) return null;
  try {
    const minter = await ensureMinter();
    return await minter.mintAsWebsafeString(visitorData);
  } catch (err) {
    console.warn("[potoken] Failed to generate session poToken", err);
    return null;
  }
}
