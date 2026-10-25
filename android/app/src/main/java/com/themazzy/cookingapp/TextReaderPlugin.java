package com.themazzy.cookingapp;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

/**
 * Reads printed text in a photo on the phone with Google ML Kit (Latin
 * script, bundled model, works offline). The web app sends the photo as a
 * base64 JPEG that it has already turned upright.
 */
@CapacitorPlugin(name = "TextReader")
public class TextReaderPlugin extends Plugin {

    private TextRecognizer recognizer;

    @PluginMethod
    public void read(PluginCall call) {
        String data = call.getString("image");
        if (data == null) {
            call.reject("No image");
            return;
        }
        if (data.contains(",")) data = data.substring(data.indexOf(',') + 1);
        byte[] bytes = Base64.decode(data, Base64.DEFAULT);
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) {
            call.reject("Could not open the photo");
            return;
        }
        if (recognizer == null) recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener(result -> {
                // One line per text line, with a blank line between blocks
                StringBuilder text = new StringBuilder();
                for (Text.TextBlock block : result.getTextBlocks()) {
                    for (Text.Line line : block.getLines()) text.append(line.getText()).append('\n');
                    text.append('\n');
                }
                JSObject ret = new JSObject();
                ret.put("text", text.toString().trim());
                call.resolve(ret);
            })
            .addOnFailureListener(e -> call.reject(e.getMessage() != null ? e.getMessage() : "Text recognition failed"));
    }
}
