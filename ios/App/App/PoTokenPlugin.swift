import Foundation
import Capacitor
import WebKit

// Mirrors android/app/src/main/java/com/Frontesque/vuetube/PoTokenPlugin.java:
// a real navigation to https://www.youtube.com/tv in a separate, hidden
// WKWebView, reusing the BotGuard VM that page bootstraps on its own
// instead of loading our own interpreter script. Runs behind the app's
// main WebView (whose origin is youtube.com via capacitor.config.json, but
// not www.youtube.com/tv) - never shown to the user.
@objc(PoTokenPlugin)
public class PoTokenPlugin: CAPPlugin, CAPBridgedPlugin, WKScriptMessageHandler, WKNavigationDelegate {
    public let identifier = "PoTokenPlugin"
    public let jsName = "PoToken"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "mintSessionPoToken", returnType: CAPPluginReturnPromise)
    ]

    private static let sonyBraviaUserAgent =
        "Mozilla/5.0 (Linux; Android 9; BRAVIA 8K UR2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 OPR/46.0.2207.0 OMI/4.21.0.273.DIA6.149 Model/Sony-BRAVIA-8K-UR2,gzip(gfe)"

    private var webView: WKWebView?
    private var pendingCall: CAPPluginCall?
    private var livingRoomToken: String = ""
    private var authToken: String?

    @objc func mintSessionPoToken(_ call: CAPPluginCall) {
        guard let livingRoomToken = call.getString("livingRoomToken"), !livingRoomToken.isEmpty else {
            call.reject("livingRoomToken is required")
            return
        }
        let authToken = call.getString("authToken")

        DispatchQueue.main.async {
            self.startMint(call: call, livingRoomToken: livingRoomToken, authToken: authToken)
        }
    }

    private func startMint(call: CAPPluginCall, livingRoomToken: String, authToken: String?) {
        guard let rootView = self.bridge?.viewController?.view else {
            call.reject("potoken: no root view")
            return
        }

        // Only one mint in flight at a time through this plugin instance.
        if pendingCall != nil {
            call.reject("potoken: a mint is already in progress")
            return
        }

        self.pendingCall = call
        self.livingRoomToken = livingRoomToken
        self.authToken = authToken

        let userContentController = WKUserContentController()
        userContentController.add(self, name: "onResult")
        userContentController.add(self, name: "onError")
        userContentController.add(self, name: "consoleLog")
        // WKWebView has no built-in console bridge like Android's
        // WebChromeClient.onConsoleMessage - forward console.* to native
        // logs ourselves, injected before any page script runs.
        userContentController.addUserScript(WKUserScript(
            source: PoTokenPlugin.consoleForwardingScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))

        let config = WKWebViewConfiguration()
        config.userContentController = userContentController

        // Attached at full real size (an offscreen/zero-size WKWebView risks
        // producing a different, likely flagged, token - matches the
        // Android finding that a detached/1x1 WebView mattered). Kept
        // behind the app's own content and hidden so nothing is shown.
        let webView = WKWebView(frame: rootView.bounds, configuration: config)
        webView.customUserAgent = PoTokenPlugin.sonyBraviaUserAgent
        webView.navigationDelegate = self
        webView.isHidden = true
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]

        rootView.insertSubview(webView, at: 0)
        self.webView = webView

        webView.load(URLRequest(url: URL(string: "https://www.youtube.com/tv")!))
    }

    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        let livingRoomTokenLiteral = jsStringLiteral(livingRoomToken)
        let authTokenLiteral = authToken != nil ? jsStringLiteral(authToken!) : "undefined"
        let script = String(format: PoTokenPlugin.scriptTemplate, livingRoomTokenLiteral, authTokenLiteral)
        webView.evaluateJavaScript(script, completionHandler: nil)
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finish(reject: "potoken: page load failed: \(error.localizedDescription)")
    }

    public func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        finish(reject: "potoken: page load failed: \(error.localizedDescription)")
    }

    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "onResult":
            guard let json = message.body as? String,
                  let data = json.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                finish(reject: "potoken: failed to parse result")
                return
            }
            finish(resolve: obj)
        case "onError":
            finish(reject: "potoken: " + ((message.body as? String) ?? "unknown error"))
        case "consoleLog":
            NSLog("PoTokenWebView: %@", (message.body as? String) ?? "")
        default:
            break
        }
    }

    private func finish(resolve data: [String: Any]) {
        pendingCall?.resolve(data)
        cleanup()
    }

    private func finish(reject message: String) {
        pendingCall?.reject(message)
        cleanup()
    }

    private func cleanup() {
        webView?.removeFromSuperview()
        webView = nil
        pendingCall = nil
    }

    private func jsStringLiteral(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
              let str = String(data: data, encoding: .utf8) else {
            return "\"\""
        }
        // JSONSerialization only encodes arrays/objects at the top level,
        // so wrap in a 1-element array and strip the brackets back off.
        return String(str.dropFirst().dropLast())
    }

    private static let scriptTemplate =
        "(async () => {" +
        "  try {" +
        "    console.log('potoken: step 1 - fetching tv_config');" +
        "    const livingRoomToken = %@;" +
        "    const authToken = %@;" +
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
        "    const sessionPoToken = createdToken.toBase64({ alphabet: 'base64url' });" +
        "" +
        "    const ttlSecs = estimatedTtlSecs || 43200;" +
        "    const refreshThresholdSecs = mintRefreshThreshold || 0;" +
        "    const expiresAt = Date.now() + (ttlSecs - refreshThresholdSecs) * 1000;" +
        "" +
        "    console.log('potoken: step 8 - minted sessionPoToken, length=' + sessionPoToken.length);" +
        "    window.webkit.messageHandlers.onResult.postMessage(JSON.stringify({ sessionPoToken, expiresAt }));" +
        "  } catch (e) {" +
        "    console.error('potoken: FAILED - ' + String(e && e.message || e));" +
        "    window.webkit.messageHandlers.onError.postMessage(String(e && e.message || e));" +
        "  }" +
        "})();" +
        "true;"

    private static let consoleForwardingScript = """
    (function() {
      const forward = (level) => (...args) => {
        try { window.webkit.messageHandlers.consoleLog.postMessage(level + ': ' + args.map(String).join(' ')); } catch (e) {}
      };
      const orig = { log: console.log, error: console.error, warn: console.warn };
      console.log = function(...a) { forward('log')(...a); orig.log.apply(console, a); };
      console.error = function(...a) { forward('error')(...a); orig.error.apply(console, a); };
      console.warn = function(...a) { forward('warn')(...a); orig.warn.apply(console, a); };
    })();
    """
}
