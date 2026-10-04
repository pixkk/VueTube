package com.pixkk.vuetube;

import android.annotation.SuppressLint;
import android.util.Log;
import android.view.ViewGroup;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.JSObject;
import org.json.JSONObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "PoToken")
public class PoTokenPlugin extends Plugin {

    // Mirrors devproxy/potokenWeb.js: a real navigation to
    // https://www.youtube.com/tv lets us reuse the BotGuard VM that page
    // bootstraps on its own, instead of loading our own interpreter script
    // and building a parallel harness. Runs in a separate, hidden WebView
    // so the app's own main WebView (whose origin is youtube.com via
    // capacitor.config.json, but not www.youtube.com/tv) isn't touched.
    private static final String SCRIPT_TEMPLATE =
        "(async () => {" +
        "  try {" +
        "    console.log('potoken: step 1 - fetching tv_config');" +
        "    const livingRoomToken = %s;" +
        "    const authToken = %s;" +
        "    const tvConfigResp = await fetch(" +
        "      'https://www.youtube.com/tv_config?action_get_config=true&client=lb4&theme=cl'," +
        "      { headers: { 'device-memory': '16', ...(authToken ? { authorization: `Bearer ${authToken}` } : {}) } }" +
        "    );" +
        "    const tvConfigText = await tvConfigResp.text();" +
        "    const ytTvConfig = JSON.parse(tvConfigText.replace(/^[)\\]}'\\s]+/, ''));" +
        "    const ch = JSON.parse(ytTvConfig.challengeParams.R);" +
        "    const requestKey = ytTvConfig.challengeRequestKey;" +
        "    const programKey = ch.bgChallenge.program;" +
        "    const globalName = ch.bgChallenge.globalName;" +
        "    console.log('potoken: step 2 - got tv_config, globalName=' + globalName);" +
        "" +
        "    for (let i = 0; i < 2000 && typeof window[globalName]?.a !== 'function'; i++) {" +
        "      await new Promise((resolve) => setTimeout(resolve, 10));" +
        "    }" +
        "    if (typeof window[globalName]?.a !== 'function') {" +
        "      throw new Error('potoken: window[' + globalName + '] never became available on /tv');" +
        "    }" +
        "    console.log('potoken: step 3 - window[' + globalName + '] is ready');" +
        "" +
        "    const D = function (y, z, C, F) {};" +
        "    const v = [function (y, z) {}, function (y) {}, function (y) {}, function (y, z) {}];" +
        "    const callbackHolder = function (y, z, C, F) {" +
        "      Promise.resolve().then(function () {" +
        "        callbackHolder.minter = y;" +
        "        callbackHolder.unknownOne = z;" +
        "        callbackHolder.unknownTwo = C;" +
        "        callbackHolder.unknownThree = F;" +
        "      });" +
        "    };" +
        "" +
        "    window[globalName].a(programKey, callbackHolder, true, undefined, D, [[], []], '', false, v, undefined);" +
        "    console.log('potoken: step 4 - called .a(), waiting for minter callback');" +
        "    for (let i = 0; i < 2000 && typeof callbackHolder.minter !== 'function'; i++) {" +
        "      await new Promise((resolve) => setTimeout(resolve, 10));" +
        "    }" +
        "    if (typeof callbackHolder.minter !== 'function') {" +
        "      throw new Error('potoken: BotGuard minter callback never arrived');" +
        "    }" +
        "    console.log('potoken: step 5 - got minter callback');" +
        "" +
        "    let poOutput = [{}, undefined, [], undefined];" +
        "    let tokenPromise = new Promise((resolve) => {" +
        "      callbackHolder.minter((response) => resolve(response), poOutput);" +
        "    });" +
        "    let token = await tokenPromise;" +
        "    console.log('potoken: step 6 - got botguard response, calling GenerateIT');" +
        "" +
        "    const generateITResp = await fetch('https://www.youtube.com/api/jnn/v1/GenerateIT', {" +
        "      headers: {" +
        "        'content-type': 'application/json+protobuf'," +
        "        'device-memory': '16'," +
        "        'x-goog-api-key': 'AIzaSyDyT5W0Jh49F30Pqqtyfdf7pDLFKLJoAnw'" +
        "      }," +
        "      referrer: 'https://www.youtube.com/tv'," +
        "      body: JSON.stringify([requestKey, token])," +
        "      method: 'POST'," +
        "      mode: 'cors'," +
        "      credentials: 'include'" +
        "    });" +
        "    if (!generateITResp.ok) {" +
        "      throw new Error('GenerateIT failed with status ' + generateITResp.status);" +
        "    }" +
        "    console.log('potoken: step 7 - GenerateIT ok');" +
        "    let respJson = await generateITResp.json();" +
        "" +
        "    let integrityToken, estimatedTtlSecs, mintRefreshThreshold;" +
        "    if (respJson[0]) {" +
        "      integrityToken = respJson[0]; estimatedTtlSecs = respJson[1]; mintRefreshThreshold = respJson[2];" +
        "    } else {" +
        "      integrityToken = respJson[3]; estimatedTtlSecs = respJson[1]; mintRefreshThreshold = respJson[2];" +
        "    }" +
        "" +
        "    let decodedString = atob(integrityToken);" +
        "    const tokenMinterParam = new Uint8Array(decodedString.length);" +
        "    for (let i = 0; i < decodedString.length; i++) tokenMinterParam[i] = decodedString.charCodeAt(i);" +
        "" +
        "    const tokenMinter = poOutput[2][0];" +
        "    const contentBindingBytes = new TextEncoder().encode(livingRoomToken);" +
        "    const createdToken = tokenMinter(tokenMinterParam)(contentBindingBytes);" +
        "    let createdTokenBin = '';" +
        "    for (let i = 0; i < createdToken.length; i++) createdTokenBin += String.fromCharCode(createdToken[i]);" +
        "    const sessionPoToken = btoa(createdTokenBin).replace(/\\+/g, '-').replace(/\\//g, '_');" +
        "" +
        "    const ttlSecs = estimatedTtlSecs || 43200;" +
        "    const refreshThresholdSecs = mintRefreshThreshold || 0;" +
        "    const expiresAt = Date.now() + (ttlSecs - refreshThresholdSecs) * 1000;" +
        "" +
        "    console.log('potoken: step 8 - minted sessionPoToken, length=' + sessionPoToken.length);" +
        "    PoTokenBridge.onResult(JSON.stringify({ sessionPoToken, expiresAt }));" +
        "  } catch (e) {" +
        "    console.error('potoken: FAILED - ' + String(e && e.message || e));" +
        "    PoTokenBridge.onError(String(e && e.message || e));" +
        "  }" +
        "})();";

    @PluginMethod
    public void mintSessionPoToken(PluginCall call) {
        String livingRoomToken = call.getString("livingRoomToken");
        String authToken = call.getString("authToken");

        if (livingRoomToken == null || livingRoomToken.isEmpty()) {
            call.reject("livingRoomToken is required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                mintOnUiThread(call, livingRoomToken, authToken);
            } catch (Exception e) {
                Log.e("PoTokenWebView", "mintOnUiThread threw", e);
                call.reject("potoken: " + e.getMessage());
            }
        });
    }

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    private void mintOnUiThread(PluginCall call, String livingRoomToken, String authToken) {
        WebView webView = new WebView(getActivity());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setUserAgentString(
            "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)"
        );

        // Attached at full real size (a detached/1x1 WebView produced a
        // different, likely flagged, token - real size + actually being
        // part of the layout/rendering pipeline mattered). Kept behind the
        // app's own content and invisible so nothing is shown to the user.
        ViewGroup root = getActivity().findViewById(android.R.id.content);
        webView.setLayoutParams(new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));
        webView.setVisibility(android.view.View.INVISIBLE);
        root.addView(webView, 0);

        Runnable cleanup = () -> getActivity().runOnUiThread(() -> {
            root.removeView(webView);
            webView.destroy();
        });

        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void onResult(String json) {
                getActivity().runOnUiThread(() -> {
                    try {
                        JSObject result = new JSObject(json);
                        call.resolve(result);
                    } catch (Exception e) {
                        call.reject("Failed to parse poToken result: " + e.getMessage());
                    } finally {
                        cleanup.run();
                    }
                });
            }

            @JavascriptInterface
            public void onError(String message) {
                getActivity().runOnUiThread(() -> {
                    call.reject("potoken: " + message);
                    cleanup.run();
                });
            }
        }, "PoTokenBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage cm) {
                Log.d("PoTokenWebView", cm.message() + " -- " + cm.sourceId() + ":" + cm.lineNumber());
                return true;
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                super.onPageStarted(view, url, favicon);
                Log.d("PoTokenWebView", "onPageStarted: " + url);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                Log.e("PoTokenWebView", "onReceivedError: " + request.getUrl() + " -> " + error.getDescription());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                Log.d("PoTokenWebView", "onPageFinished: " + url);
                String livingRoomTokenLiteral = JSONObject.quote(livingRoomToken);
                String authTokenLiteral = authToken != null ? JSONObject.quote(authToken) : "undefined";
                String script = String.format(SCRIPT_TEMPLATE, livingRoomTokenLiteral, authTokenLiteral);
                view.evaluateJavascript(script, (value) -> Log.d("PoTokenWebView", "evaluateJavascript returned: " + value));
            }
        });

        Log.d("PoTokenWebView", "loadUrl https://www.youtube.com/tv");
        webView.loadUrl("https://www.youtube.com/tv");
    }
}
