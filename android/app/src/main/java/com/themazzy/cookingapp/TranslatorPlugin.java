package com.themazzy.cookingapp;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.tasks.Task;
import com.google.android.gms.tasks.Tasks;
import com.google.mlkit.common.model.DownloadConditions;
import com.google.mlkit.common.model.RemoteModelManager;
import com.google.mlkit.nl.languageid.LanguageIdentification;
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions;
import com.google.mlkit.nl.languageid.LanguageIdentifier;
import com.google.mlkit.nl.translate.TranslateLanguage;
import com.google.mlkit.nl.translate.TranslateRemoteModel;
import com.google.mlkit.nl.translate.Translation;
import com.google.mlkit.nl.translate.Translator;
import com.google.mlkit.nl.translate.TranslatorOptions;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Detects a recipe's language and translates it on the phone with Google ML
 * Kit, offline and free. Language detection comes from Play services; each
 * translation language is a ~30 MB model downloaded once on first use
 * (English is always there), so none of it is bundled in the APK.
 */
@CapacitorPlugin(name = "Translator")
public class TranslatorPlugin extends Plugin {

    private LanguageIdentifier identifier;

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

    /** { from, to } → { supported, downloaded }: whether a translation needs a model download first. */
    @PluginMethod
    public void status(PluginCall call) {
        String from = TranslateLanguage.fromLanguageTag(call.getString("from", ""));
        String to = TranslateLanguage.fromLanguageTag(call.getString("to", ""));
        if (from == null || to == null) {
            JSObject ret = new JSObject();
            ret.put("supported", false);
            ret.put("downloaded", false);
            call.resolve(ret);
            return;
        }
        RemoteModelManager.getInstance().getDownloadedModels(TranslateRemoteModel.class)
            .addOnSuccessListener(models -> {
                Set<String> have = new HashSet<>();
                for (TranslateRemoteModel m : models) have.add(m.getLanguage());
                JSObject ret = new JSObject();
                ret.put("supported", true);
                ret.put("downloaded", have.contains(from) && have.contains(to));
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject(message(e, "Could not check the translation models")));
    }

    /** { from, to, texts: [] } → { texts: [] } in the same order. Downloads the models when needed. */
    @PluginMethod
    public void translate(PluginCall call) {
        String from = TranslateLanguage.fromLanguageTag(call.getString("from", ""));
        String to = TranslateLanguage.fromLanguageTag(call.getString("to", ""));
        if (from == null || to == null) {
            call.reject("This language can't be translated on the phone");
            return;
        }
        List<String> texts;
        try {
            JSArray arr = call.getArray("texts", new JSArray());
            texts = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) texts.add(arr.optString(i, ""));
        } catch (Exception e) {
            call.reject("No text to translate");
            return;
        }
        Translator translator = Translation.getClient(new TranslatorOptions.Builder().setSourceLanguage(from).setTargetLanguage(to).build());
        translator.downloadModelIfNeeded(new DownloadConditions.Builder().build())
            .onSuccessTask(v -> {
                List<Task<String>> tasks = new ArrayList<>();
                for (String t : texts) tasks.add(t.trim().isEmpty() ? Tasks.forResult(t) : translator.translate(t));
                return Tasks.<String>whenAllSuccess(tasks);
            })
            .addOnSuccessListener(results -> {
                JSArray out = new JSArray();
                for (String s : results) out.put(s);
                JSObject ret = new JSObject();
                ret.put("texts", out);
                translator.close();
                call.resolve(ret);
            })
            .addOnFailureListener(e -> {
                translator.close();
                call.reject(message(e, "Translation failed"));
            });
    }

    private static String message(Exception e, String fallback) {
        return e.getMessage() != null ? e.getMessage() : fallback;
    }
}
