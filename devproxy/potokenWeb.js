// Web-only poToken mint via a real headless/headed Chromium page.
//
// Wait for window.trayride to exist, fetch tv_config ourselves only to get the
// current challenge's `program` string, and feed that into the page's own
// already-loaded VM.

import { chromium } from "playwright";

async function mintInPage(livingRoomToken, authToken) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
  try {
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)",
    });
    // authToken (if any) is only added to the tv_config fetch inside the
    // page (see below) - NOT here. context-wide headers would also land on
    // the /tv navigation and on GenerateIT, and sending Authorization there
    // breaks both (GenerateIT starts returning 400).

    // BotGuard's whole job is to detect automation like this. Playwright
    // leaves fingerprints - navigator.webdriver, missing window.chrome,
    // an empty plugins list, permissions.query quirks - that a real
    // device never has. Patch them out before any page script runs.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });

      window.chrome = window.chrome || { runtime: {} };

      const originalQuery = window.navigator.permissions?.query;
      if (originalQuery) {
        window.navigator.permissions.query = (parameters) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: Notification.permission })
            : originalQuery(parameters);
      }

      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5].map(() => ({ name: "Chrome PDF Plugin" })),
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    const page = await context.newPage();

    page.on("console", (msg) => console.log(`[potokenWeb:page] ${msg.text()}`));
    await page.goto("https://www.youtube.com/tv", { waitUntil: "load" });

    const result = await page.evaluate(
      async ({ livingRoomToken, authToken }) => {
          const tvConfigResp = await fetch(
              "https://www.youtube.com/tv_config?action_get_config=true&client=lb4&theme=cl",
              {
                  headers: {
                      "device-memory": "16",
                      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
                  },
              }
          );
          const tvConfigText = await tvConfigResp.text();
          const ytTvConfig = JSON.parse(tvConfigText.replace(/^[)\]}'\s]+/, ""));
          const requestKey = ytTvConfig.challengeRequestKey;
          if (!requestKey) {
            throw new Error("potokenWeb: tv_config doesn't contain challengeRequestKey");
          }

          // tv_config doesn't always carry the challenge (program). Then take it
          // from /att/get for the TV client.
          let ch;
          const rawChallenge = ytTvConfig.challengeParams?.R;
          if (rawChallenge) {
            ch = JSON.parse(rawChallenge);
          }
          if (!ch?.bgChallenge?.program) {
            const attResp = await fetch("https://www.youtube.com/youtubei/v1/att/get?prettyPrint=false", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                context: { client: { clientName: "TVHTML5", clientVersion: "7.20260901.15.00" } },
                engagementType: "ENGAGEMENT_TYPE_UNBOUND",
              }),
            });
            if (!attResp.ok) {
              throw new Error(`potokenWeb: /att/get failed with status ${attResp.status}`);
            }
            ch = await attResp.json();
            if (!ch?.bgChallenge?.program) {
              throw new Error(`potokenWeb: /att/get has no bgChallenge: ${JSON.stringify(ch).slice(0, 200)}`);
            }
          }
          const programKey = ch.bgChallenge.program;
          const globalName = ch.bgChallenge.globalName;


        // A program starting with "$" is already the ready-made botguard response:
        // send it to GenerateIT as is, without running the VM.
        const isReadyProgram = typeof programKey === "string" && programKey.startsWith("$");

        let token;
        const poOutput = [{}, undefined, [], undefined];
        if (isReadyProgram) {
          token = programKey;
        } else {
        // Wait for the page's own BotGuard VM bootstrap to finish.
        for (let i = 0; i < 2000 && typeof window[globalName]?.a !== "function"; i++) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        if (typeof window.trayride?.a !== "function") {
          throw new Error("potokenWeb: window.trayride never became available on /tv");
        }

        const z = [[], []];
        const Z = "";
        const r = false;
        const I = undefined;
        const D = function (y, z, C, F) {};
        const b = window.b;
        const v = [
          function (y, z) {
            b?.va?.Eo?.(y, z);
          },
          function (y) {
            b?.va?.Ac?.(y);
          },
          function (y) {
            b?.va?.hG?.(y);
          },
          function (y, z) {
            b?.va?.gG?.(y, z);
          },
        ];

        const callbackHolder = function (y, z, C, F) {
          Promise.resolve().then(function () {
            callbackHolder.minter = y;
            callbackHolder.unknownOne = z;
            callbackHolder.unknownTwo = C;
            callbackHolder.unknownThree = F;
          });
        };

        window[globalName].a(programKey, callbackHolder, true, undefined, D, z, Z, r, v, I);
        while (typeof callbackHolder.minter !== "function") {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        let tokenPromise = new Promise((resolve, reject) => {
          callbackHolder.minter((response) => resolve(response), poOutput);
        });

        token = await tokenPromise;
        }

        const generateITResp = await fetch("https://www.youtube.com/api/jnn/v1/GenerateIT", {
          headers: {
            "content-type": "application/json+protobuf",
            "device-memory": "16",
            "x-goog-api-key": "AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw",
          },
          referrer: "https://www.youtube.com/tv",
          body: JSON.stringify([requestKey, token]),
          method: "POST",
          mode: "cors",
          credentials: "include",
        });
        if (!generateITResp.ok) {
          throw new Error(`potokenWeb: GenerateIT failed with status ${generateITResp.status}`);
        }
        let respJson = await generateITResp.json();

        let integrityToken, estimatedTtlSecs, mintRefreshThreshold;
        if (respJson[0] != null) {
          integrityToken = respJson[0];
          estimatedTtlSecs = respJson[1];
          mintRefreshThreshold = respJson[2];
        } else {
          // respJson[3] is already the session poToken,
          // no tokenMinter step is needed.
          estimatedTtlSecs = respJson[1];
          mintRefreshThreshold = respJson[2];
          return {
            sessionPoToken: respJson[3],
            ttlSecs: estimatedTtlSecs || 43200,
            refreshThresholdSecs: mintRefreshThreshold || 0,
          };
        }

        let decodedString = atob(integrityToken);
        const tokenMinterParam = new Uint8Array(decodedString.length);
        for (let i = 0; i < decodedString.length; i++) tokenMinterParam[i] = decodedString.charCodeAt(i);

        const tokenMinter = poOutput[2][0];
        const contentBindingBytes = new TextEncoder().encode(livingRoomToken);
        const createdToken = tokenMinter(tokenMinterParam)(contentBindingBytes);
        const sessionPoToken = createdToken.toBase64({ alphabet: "base64url" });

        return {
          sessionPoToken,
          ttlSecs: estimatedTtlSecs || 43200,
          refreshThresholdSecs: mintRefreshThreshold || 0,
        };
      },
      { livingRoomToken, authToken }
    );

    const expiresAt = Date.now() + (result.ttlSecs - result.refreshThresholdSecs) * 1000;
    return { sessionPoToken: result.sessionPoToken, expiresAt };
  } finally {
    await browser.close();
  }
}

export async function mintSessionPoToken(livingRoomToken, authToken) {
  if (!livingRoomToken) {
    throw new Error("potokenWeb: livingRoomToken is required");
  }
  return mintInPage(livingRoomToken, authToken);
}
