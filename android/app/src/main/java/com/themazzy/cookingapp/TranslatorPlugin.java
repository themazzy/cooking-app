package com.themazzy.cookingapp;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.genai.common.DownloadCallback;
import com.google.mlkit.genai.common.FeatureStatus;
import com.google.mlkit.genai.common.GenAiException;
import com.google.mlkit.genai.prompt.GenerateContentRequest;
import com.google.mlkit.genai.prompt.GenerateContentResponse;
import com.google.mlkit.genai.prompt.Generation;
import com.google.mlkit.genai.prompt.TextPart;
import com.google.mlkit.genai.prompt.java.GenerativeModelFutures;
import com.google.mlkit.nl.languageid.LanguageIdentification;
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions;
import com.google.mlkit.nl.languageid.LanguageIdentifier;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * On-device help for translating recipes: language detection (ML Kit, from
 * Play services) and Gemini Nano through Android's AICore (ML Kit Prompt
 * API). Gemini Nano only exists on some recent phones; its model lives in
 * AICore, not in the APK. Without it the web app uses Google Translate.
 */
@CapacitorPlugin(name = "Translator")
public class TranslatorPlugin extends Plugin {

    private LanguageIdentifier identifier;
    private GenerativeModelFutures model;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    /** { text } → { language }: a BCP-47 code such as "de", or "und" when unsure. */
    @PluginMethod
    public void identify(PluginCall call) {
        String text = call.getString("text", "");
        if (identifier == null) {
            identifier = LanguageIdentification.getClient(new LanguageIdentificationOptions.Builder().setConfidenceThreshold(0.5f).build());
        }
        identifier.identifyLanguage(text)
            .addOnSuccessListener(tag -> {
                JSObject ret = new JSObject();
                ret.put("language", tag);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject(message(e, "Could not detect the language")));
    }

    private GenerativeModelFutures model() {
        if (model == null) model = GenerativeModelFutures.from(Generation.INSTANCE.getClient());
        return model;
    }

    /**
     * → { status, reason }: "available", "downloading", "downloadable" (a download is
     * started) or "unavailable" (this phone has no Gemini Nano; reason says why).
     */
    @PluginMethod
    public void nanoStatus(PluginCall call) {
        worker.execute(() -> {
            String status;
            String reason = null;
            try {
                int s = model().checkStatus().get();
                if (s == FeatureStatus.AVAILABLE) status = "available";
                else if (s == FeatureStatus.DOWNLOADING) status = "downloading";
                else if (s == FeatureStatus.DOWNLOADABLE) {
                    status = "downloadable";
                    model().download(new DownloadCallback() {
                        @Override public void onDownloadStarted(long bytes) {}
                        @Override public void onDownloadProgress(long bytes) {}
                        @Override public void onDownloadCompleted() {}
                        @Override public void onDownloadFailed(@NonNull GenAiException e) {}
                    });
                } else {
                    status = "unavailable";
                    reason = "AICore says this phone has no Gemini Nano";
                }
            } catch (Throwable e) {
                // No AICore, an unsupported phone or an unlocked bootloader
                status = "unavailable";
                Throwable cause = e.getCause() != null ? e.getCause() : e;
                reason = cause.getMessage() != null ? cause.getMessage() : cause.getClass().getSimpleName();
            }
            JSObject ret = new JSObject();
            ret.put("status", status);
            if (reason != null) ret.put("reason", reason);
            call.resolve(ret);
        });
    }

    /** { prompt } → { text }: Gemini Nano's answer. */
    @PluginMethod
    public void generate(PluginCall call) {
        String prompt = call.getString("prompt", "");
        worker.execute(() -> {
            try {
                GenerateContentRequest.Builder request = new GenerateContentRequest.Builder(new TextPart(prompt));
                request.setTemperature(0.1f);
                GenerateContentResponse response = model().generateContent(request.build()).get();
                JSObject ret = new JSObject();
                ret.put("text", response.getCandidates().get(0).getText());
                call.resolve(ret);
            } catch (Throwable e) {
                Throwable cause = e.getCause() != null ? e.getCause() : e;
                call.reject(cause.getMessage() != null ? cause.getMessage() : "Gemini Nano failed");
            }
        });
    }

    private static String message(Exception e, String fallback) {
        return e.getMessage() != null ? e.getMessage() : fallback;
    }
}
