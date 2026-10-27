package com.themazzy.cookingapp;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

/**
 * Hands-free cooking: listens for short commands ("next", "back") with
 * Android's own speech recognizer, which is free and prefers the model on the
 * phone. It listens again after each phrase until stopped, and pauses while
 * the app is in the background. Each phrase heard goes to the web app as a
 * "heard" event; the web app decides what it means.
 *
 * It also reads text aloud with the phone's text-to-speech. Listening pauses
 * while it reads, so the step being read does not count as a command; the web
 * app gets a "spoken" event when reading ends.
 */
@CapacitorPlugin(name = "VoiceCommands", permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone") })
public class VoiceCommandsPlugin extends Plugin {

    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private boolean active = false; // the web app wants to listen
    private boolean paused = false; // the app is in the background
    private String language = null;
    private int failures = 0;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean speaking = false;
    private String sayText = null; // waiting for text-to-speech to start up
    private String sayLanguage = null;
    private String sayId = null; // which text is being read, sent back with "spoken"

    @PluginMethod
    public void available(PluginCall call) {
        JSObject out = new JSObject();
        out.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void start(PluginCall call) {
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "microphoneAnswered");
            return;
        }
        begin(call);
    }

    @PermissionCallback
    private void microphoneAnswered(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) begin(call);
        else call.reject("The microphone is not allowed", "denied");
    }

    private void begin(PluginCall call) {
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("This phone has no speech recognition", "unavailable");
            return;
        }
        language = call.getString("language");
        active = true;
        failures = 0;
        main.post(this::listen);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        active = false;
        main.post(this::release);
        call.resolve();
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("language");
        String id = call.getString("id", "");
        main.post(() -> {
            sayId = id;
            if (tts == null) {
                sayText = text;
                sayLanguage = lang;
                tts = new TextToSpeech(getContext(), status -> main.post(() -> {
                    ttsReady = status == TextToSpeech.SUCCESS;
                    if (!ttsReady) {
                        tts = null;
                        sayText = null;
                        done();
                        return;
                    }
                    tts.setOnUtteranceProgressListener(progress);
                    if (sayText != null) say(sayText, sayLanguage);
                    sayText = null;
                }));
                speaking = true;
                release(); // no listening while reading
            } else if (ttsReady) {
                say(text, lang);
            } else {
                sayText = text; // still starting up
                sayLanguage = lang;
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        main.post(() -> {
            sayText = null;
            if (tts != null && ttsReady) tts.stop();
            if (speaking) done();
        });
        call.resolve();
    }

    private void say(String text, String lang) {
        if (lang != null && !lang.isEmpty()) {
            int ok = tts.setLanguage(Locale.forLanguageTag(lang));
            if (ok == TextToSpeech.LANG_MISSING_DATA || ok == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.getDefault());
        }
        speaking = true;
        release();
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "step") != TextToSpeech.SUCCESS) done();
    }

    /** Reading ended: tell the web app and listen again. */
    private void done() {
        speaking = false;
        JSObject out = new JSObject();
        out.put("id", sayId);
        notifyListeners("spoken", out);
        if (active && !paused) main.postDelayed(this::listen, 200);
    }

    private final UtteranceProgressListener progress = new UtteranceProgressListener() {
        @Override public void onStart(String id) {}
        @Override public void onDone(String id) { main.post(VoiceCommandsPlugin.this::done); }
        @Override public void onError(String id) { main.post(VoiceCommandsPlugin.this::done); }
        @Override public void onStop(String id, boolean interrupted) {} // stopSpeaking already finished it
    };

    @Override
    protected void handleOnPause() {
        paused = true;
        main.post(this::release);
    }

    @Override
    protected void handleOnResume() {
        paused = false;
        if (active) main.post(this::listen);
    }

    @Override
    protected void handleOnDestroy() {
        active = false;
        release();
        if (tts != null) tts.shutdown();
        tts = null;
    }

    private void release() {
        main.removeCallbacksAndMessages(null);
        if (recognizer != null) {
            recognizer.destroy();
            recognizer = null;
        }
    }

    private void listen() {
        if (!active || paused || speaking) return;
        if (recognizer == null) {
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(listener);
        }
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            .putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
        if (language != null && !language.isEmpty()) {
            // Listen in this language, not the phone's own
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
            intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, true);
        }
        try {
            recognizer.startListening(intent);
        } catch (Exception e) {
            again(true);
        }
    }

    /** Listens again shortly; after many failures in a row it gives up and tells the web app. */
    private void again(boolean failed) {
        if (!active || paused || speaking) return;
        failures = failed ? failures + 1 : 0;
        if (failures > 8) {
            active = false;
            release();
            JSObject out = new JSObject();
            out.put("error", "Speech recognition stopped working");
            notifyListeners("stopped", out);
            return;
        }
        main.postDelayed(this::listen, failed ? 300L * failures : 100);
    }

    private final RecognitionListener listener = new RecognitionListener() {
        @Override
        public void onResults(Bundle results) {
            ArrayList<String> heard = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
            if (heard != null && !heard.isEmpty()) {
                JSObject out = new JSObject();
                out.put("text", heard.get(0));
                out.put("alternatives", new com.getcapacitor.JSArray(heard));
                notifyListeners("heard", out);
            }
            again(false);
        }

        @Override
        public void onError(int error) {
            switch (error) {
                case SpeechRecognizer.ERROR_NO_MATCH:
                case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                    again(false); // silence: just listen again
                    break;
                case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                    active = false;
                    release();
                    JSObject out = new JSObject();
                    out.put("error", "The microphone is not allowed");
                    notifyListeners("stopped", out);
                    break;
                case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                case SpeechRecognizer.ERROR_CLIENT:
                    // A stuck recognizer: start over with a new one
                    if (recognizer != null) {
                        recognizer.destroy();
                        recognizer = null;
                    }
                    again(true);
                    break;
                default:
                    again(true);
            }
        }

        @Override public void onReadyForSpeech(Bundle params) {}
        @Override public void onBeginningOfSpeech() {}
        @Override public void onRmsChanged(float rmsdB) {}
        @Override public void onBufferReceived(byte[] buffer) {}
        @Override public void onEndOfSpeech() {}
        @Override public void onPartialResults(Bundle partialResults) {}
        @Override public void onEvent(int eventType, Bundle params) {}
    };
}
