package com.themazzy.cookingapp;

import android.annotation.SuppressLint;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Loads a page in a hidden WebView, runs a script in it and returns what the
 * script leaves in window.__cookingResult.
 *
 * Instagram answers plain HTTP clients with an empty app shell; a real
 * browser engine on the same origin gets the data. The WebView shares the
 * app's cookie store, so a login made in the app applies here too.
 */
@CapacitorPlugin(name = "PageReader")
public class PageReaderPlugin extends Plugin {

    private static final String POLL =
        "(function(){return window.__cookingResult === undefined ? null : JSON.stringify(window.__cookingResult);})()";

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void read(PluginCall call) {
        final String url = call.getString("url");
        final String script = call.getString("script");
        final int timeoutMs = call.getInt("timeoutMs", 25000);
        final String userAgent = call.getString("userAgent");
        if (url == null || script == null) {
            call.reject("url and script are required");
            return;
        }

        getActivity().runOnUiThread(() -> {
            final WebView webView = new WebView(getContext());
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(true);
            if (userAgent != null) settings.setUserAgentString(userAgent);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);

            // Behind the app's own (opaque) WebView, so it is never seen
            final ViewGroup root = getActivity().findViewById(android.R.id.content);
            root.addView(webView, 0, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

            final Handler handler = new Handler(Looper.getMainLooper());
            final boolean[] finished = {false};
            final boolean[] injected = {false};

            final Runnable cleanup = () -> {
                handler.removeCallbacksAndMessages(null);
                root.removeView(webView);
                webView.stopLoading();
                webView.destroy();
            };

            final Runnable[] poll = new Runnable[1];
            poll[0] = () -> webView.evaluateJavascript(POLL, value -> {
                if (finished[0]) return;
                if (value != null && !"null".equals(value)) {
                    finished[0] = true;
                    JSObject ret = new JSObject();
                    ret.put("value", value);
                    ret.put("finalUrl", webView.getUrl());
                    cleanup.run();
                    call.resolve(ret);
                } else {
                    handler.postDelayed(poll[0], 400);
                }
            });

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    // Sites try to hand off to their app (instagram://, intent://);
                    // stay on the web page instead
                    String scheme = request.getUrl().getScheme();
                    return !("http".equals(scheme) || "https".equals(scheme));
                }

                @Override
                public void onPageFinished(WebView view, String loadedUrl) {
                    if (injected[0] || finished[0]) return;
                    if (loadedUrl == null || !loadedUrl.startsWith("http")) return;
                    injected[0] = true;
                    view.evaluateJavascript(script, null);
                    handler.postDelayed(poll[0], 300);
                }
            });

            handler.postDelayed(() -> {
                if (finished[0]) return;
                finished[0] = true;
                JSObject ret = new JSObject();
                ret.put("timedOut", true);
                ret.put("finalUrl", webView.getUrl());
                cleanup.run();
                call.resolve(ret);
            }, timeoutMs);

            webView.loadUrl(url);
        });
    }
}
