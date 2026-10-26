package com.themazzy.cookingapp;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.graphics.Color;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;

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

    /** Opens a link in the app it belongs to (Instagram, YouTube…) or the browser. */
    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null || !(url.startsWith("http://") || url.startsWith("https://"))) {
            call.reject("http(s) url required");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("No app can open this link", e);
        }
    }

    /**
     * Shows a sign-in page (Instagram) in its own WebView on top of the app.
     * Unlike the app's main WebView, it has no bridge to the app's native
     * plugins, so the site's scripts can't reach them. Cookies are shared, so
     * the login applies to imports. Closes by itself once `doneCookie` is set
     * for `url`, or with Done / Back; resolves with { signedIn }.
     */
    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void openLogin(PluginCall call) {
        final String url = call.getString("url");
        final String doneCookie = call.getString("doneCookie");
        final String title = call.getString("title", "Sign in");
        if (url == null || !url.startsWith("https://")) {
            call.reject("https url required");
            return;
        }
        getActivity().runOnUiThread(() -> {
            final ViewGroup root = getActivity().findViewById(android.R.id.content);
            final LinearLayout panel = new LinearLayout(getContext());
            panel.setOrientation(LinearLayout.VERTICAL);
            panel.setBackgroundColor(Color.WHITE);
            panel.setFitsSystemWindows(true);
            panel.setClickable(true);

            final LinearLayout bar = new LinearLayout(getContext());
            bar.setOrientation(LinearLayout.HORIZONTAL);
            bar.setGravity(Gravity.CENTER_VERTICAL);
            int pad = (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, 12, getContext().getResources().getDisplayMetrics());
            bar.setPadding(pad, pad / 2, pad / 2, pad / 2);
            final TextView label = new TextView(getContext());
            label.setText(title);
            label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 17);
            label.setTextColor(Color.BLACK);
            bar.addView(label, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            final Button done = new Button(getContext());
            done.setText("Done");
            bar.addView(done);
            panel.addView(bar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));

            final WebView webView = new WebView(getContext());
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
            panel.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1f));
            root.addView(panel, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

            final Handler handler = new Handler(Looper.getMainLooper());
            final boolean[] closed = {false};
            final OnBackPressedCallback[] back = new OnBackPressedCallback[1];
            final Runnable close = () -> {
                if (closed[0]) return;
                closed[0] = true;
                handler.removeCallbacksAndMessages(null);
                back[0].remove();
                CookieManager.getInstance().flush();
                root.removeView(panel);
                webView.stopLoading();
                webView.destroy();
                JSObject ret = new JSObject();
                ret.put("signedIn", hasCookie(url, doneCookie));
                call.resolve(ret);
            };
            back[0] = new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (webView.canGoBack()) webView.goBack();
                    else close.run();
                }
            };
            getActivity().getOnBackPressedDispatcher().addCallback(back[0]);
            done.setOnClickListener(v -> close.run());

            webView.setWebViewClient(new WebViewClient() {
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    String scheme = request.getUrl().getScheme();
                    return !("http".equals(scheme) || "https".equals(scheme));
                }
            });
            // Signed in: close a moment later, so the site can finish its redirect
            final Runnable[] watch = new Runnable[1];
            watch[0] = () -> {
                if (closed[0]) return;
                if (doneCookie != null && hasCookie(url, doneCookie)) handler.postDelayed(close, 1500);
                else handler.postDelayed(watch[0], 1000);
            };
            handler.postDelayed(watch[0], 1000);
            webView.loadUrl(url);
        });
    }

    private static boolean hasCookie(String url, String name) {
        if (name == null) return false;
        String cookies = CookieManager.getInstance().getCookie(url);
        if (cookies == null) return false;
        for (String part : cookies.split(";")) {
            String[] kv = part.trim().split("=", 2);
            if (kv[0].equals(name) && kv.length > 1 && !kv[1].isEmpty()) return true;
        }
        return false;
    }

    @SuppressLint("SetJavaScriptEnabled")
    @PluginMethod
    public void read(PluginCall call) {
        final String url = call.getString("url");
        final String script = call.getString("script");
        final int timeoutMs = call.getInt("timeoutMs", 25000);
        final String userAgent = call.getString("userAgent");
        // Run the script again on each page load (a bot check that reloads into the real page)
        final boolean reinject = Boolean.TRUE.equals(call.getBoolean("reinject", false));
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
                    if (finished[0] || (injected[0] && !reinject)) return;
                    if (loadedUrl == null || !loadedUrl.startsWith("http")) return;
                    boolean first = !injected[0];
                    injected[0] = true;
                    view.evaluateJavascript(script, null);
                    if (first) handler.postDelayed(poll[0], 300);
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
