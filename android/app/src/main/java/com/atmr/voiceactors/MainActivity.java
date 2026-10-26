package com.atmr.voiceactors;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.atmr.voiceactors.plugins.apkinstaller.ApkInstallerPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkInstallerPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebView();
    }

    /**
     * Long scripts play back one synthesised segment at a time: the first
     * segment starts from the user's tap, every later segment is started by
     * JavaScript. Android's default "media needs a user gesture" policy drops
     * those later play() calls, which is why long text used to stall after the
     * opening seconds. Turning the requirement off keeps the queue gapless.
     */
    private void configureWebView() {
        try {
            WebView webView = (this.bridge != null) ? this.bridge.getWebView() : null;
            if (webView == null) return;

            WebSettings settings = webView.getSettings();
            settings.setMediaPlaybackRequiresUserGesture(false);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setLoadsImagesAutomatically(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);
            webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
        } catch (Throwable ignored) {
            // A settings tweak must never stop the app from launching.
        }
    }
}