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
import android.speech.tts.Voice;

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
import java.util.Set;

import com.getcapacitor.JSArray;

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
    private final Runnable listenTask = this::listen;
    private SpeechRecognizer recognizer;
    private boolean active = false; // the web app wants to listen
    private boolean paused = false; // the app is in the background
    private String language = null;
    private int failures = 0;
    private TextToSpeech tts;
    private boolean ttsReady = false;
    private boolean speaking = false;
    private final ArrayList<Runnable> whenReady = new ArrayList<>(); // waiting for text-to-speech to start up
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
        main.post(listenTask);
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        active = false;
        main.post(this::release);
        call.resolve();
    }

    /** Starts text-to-speech once, then runs `then` (on the main thread); null if the phone has none. */
    private void withTts(Runnable then) {
        if (tts != null && ttsReady) {
            then.run();
            return;
        }
        whenReady.add(then);
        if (tts != null) return; // starting up
        tts = new TextToSpeech(getContext(), status -> main.post(() -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) tts.setOnUtteranceProgressListener(progress);
            else tts = null;
            ArrayList<Runnable> waiting = new ArrayList<>(whenReady);
            whenReady.clear();
            for (Runnable r : waiting) r.run();
        }));
    }

    /** The phone's text-to-speech voices: name, language, online or not, installed or not. */
    @PluginMethod
    public void voices(PluginCall call) {
        main.post(() -> withTts(() -> {
            JSArray list = new JSArray();
            Set<Voice> all = null;
            try {
                if (tts != null) all = tts.getVoices();
            } catch (Exception ignored) {
                // some engines throw before they are fully ready
            }
            if (all != null) {
                for (Voice v : all) {
                    JSObject o = new JSObject();
                    o.put("name", v.getName());
                    o.put("language", v.getLocale().toLanguageTag());
                    o.put("online", v.isNetworkConnectionRequired());
                    o.put("installed", !v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED));
                    o.put("quality", v.getQuality());
                    list.put(o);
                }
            }
            JSObject out = new JSObject();
            out.put("voices", list);
            call.resolve(out);
        }));
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        String lang = call.getString("language");
        String voice = call.getString("voice");
        String id = call.getString("id", "");
        main.post(() -> {
            sayId = id;
            speaking = true;
            release(); // no listening while reading
            withTts(() -> {
                if (tts == null || !id.equals(sayId) || !speaking) {
                    if (tts == null && id.equals(sayId)) done();
                    return; // no text-to-speech, or replaced or stopped meanwhile
                }
                say(text, lang, voice);
            });
        });
        call.resolve();
    }

    @PluginMethod
    public void stopSpeaking(PluginCall call) {
        main.post(() -> {
            if (tts != null && ttsReady) tts.stop();
            if (speaking) done();
        });
        call.resolve();
    }

    private void say(String text, String lang, String voice) {
        Voice picked = null;
        if (voice != null && !voice.isEmpty()) {
            try {
                for (Voice v : tts.getVoices()) if (v.getName().equals(voice)) picked = v;
            } catch (Exception ignored) {
                // no voice list: read with the language instead
            }
        }
        if (picked != null) {
            tts.setVoice(picked);
        } else if (lang != null && !lang.isEmpty()) {
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
        if (active && !paused) main.postDelayed(listenTask, 200);
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
        if (active) main.post(listenTask);
    }

    @Override
    protected void handleOnDestroy() {
        active = false;
        release();
        if (tts != null) tts.shutdown();
        tts = null;
    }

    private void release() {
        main.removeCallbacks(listenTask); // not the text-to-speech work waiting on the same thread
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
        main.postDelayed(listenTask, failed ? 300L * failures : 100);
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
