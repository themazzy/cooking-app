package com.themazzy.cookingapp;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.common.MlKitException;
import com.google.mlkit.vision.barcode.common.Barcode;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner;
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions;
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning;

/**
 * Scans a product barcode with Google's code scanner. The camera screen and
 * the model come from Google Play services, so the app needs no camera
 * permission and the APK barely grows. Only shop barcodes (EAN and UPC).
 */
@CapacitorPlugin(name = "BarcodeScanner")
public class BarcodeScannerPlugin extends Plugin {

    @PluginMethod
    public void scan(PluginCall call) {
        GmsBarcodeScannerOptions options = new GmsBarcodeScannerOptions.Builder()
            .setBarcodeFormats(Barcode.FORMAT_EAN_13, Barcode.FORMAT_EAN_8, Barcode.FORMAT_UPC_A, Barcode.FORMAT_UPC_E)
            .enableAutoZoom()
            .build();
        GmsBarcodeScanner scanner = GmsBarcodeScanning.getClient(getActivity(), options);
        scanner.startScan()
            .addOnSuccessListener(barcode -> {
                JSObject ret = new JSObject();
                ret.put("code", barcode.getRawValue());
                call.resolve(ret);
            })
            .addOnCanceledListener(() -> {
                JSObject ret = new JSObject();
                ret.put("cancelled", true);
                call.resolve(ret);
            })
            .addOnFailureListener(e -> {
                String m = e.getMessage() != null ? e.getMessage() : "The scanner failed";
                // Right after installing, Play services may still be fetching the scanner
                if (e instanceof MlKitException && ((MlKitException) e).getErrorCode() == MlKitException.UNAVAILABLE) {
                    m = "The scanner is still downloading from Google Play services. Try again in a minute.";
                }
                call.reject(m);
            });
    }
}
