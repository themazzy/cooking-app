package com.themazzy.cookingapp;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setIntent(fromShare(getIntent()));
        registerPlugin(PageReaderPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(fromShare(intent));
    }

    /**
     * "Share → Cooking App" from Instagram, TikTok or Facebook sends an
     * ACTION_SEND intent with the link as text. Capacitor's App plugin only
     * reports VIEW intents to the web app, so the shared text is rewritten as
     * cookingapp://share?text=… and arrives through getLaunchUrl / appUrlOpen.
     */
    private static Intent fromShare(Intent intent) {
        if (intent == null || !Intent.ACTION_SEND.equals(intent.getAction())) return intent;
        String text = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (text == null) return intent;
        Uri uri = new Uri.Builder().scheme("cookingapp").authority("share").appendQueryParameter("text", text).build();
        return new Intent(Intent.ACTION_VIEW, uri);
    }
}
