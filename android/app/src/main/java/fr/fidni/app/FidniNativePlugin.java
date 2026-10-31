package fr.fidni.app;

import android.content.Context;
import android.graphics.Color;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.print.PrintManager;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Ce que la WebView ne fait pas comme un navigateur (src/lib/native.ts) :
 * - printPage : window.print() n'y fait rien ; on ouvre l'impression d'Android (imprimante ou « Enregistrer en PDF »)
 *   sur la page affichée, avec ses styles @media print. La promesse se termine à la fermeture de la fenêtre.
 * - setBackground : couleur des bandes de la barre d'état et de la barre de navigation (la page est entre les deux).
 */
@CapacitorPlugin(name = "FidniNative")
public class FidniNativePlugin extends Plugin {

    @PluginMethod
    public void printPage(PluginCall call) {
        String name = call.getString("name", "FIDNI");
        getActivity().runOnUiThread(() -> {
            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
            if (manager == null) {
                call.reject("Impression indisponible sur cet appareil");
                return;
            }
            PrintDocumentAdapter page = getBridge().getWebView().createPrintDocumentAdapter(name);
            manager.print(name, new FinishAdapter(page, call), new PrintAttributes.Builder().build());
        });
    }

    @PluginMethod
    public void setBackground(PluginCall call) {
        int color;
        try {
            color = Color.parseColor(call.getString("color", "#ffffff"));
        } catch (IllegalArgumentException e) {
            call.reject("Couleur invalide");
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(color);
            call.resolve();
        });
    }

    /** L'adaptateur de la WebView, qui prévient la page quand l'impression est finie (ou annulée). */
    private static final class FinishAdapter extends PrintDocumentAdapter {

        private final PrintDocumentAdapter page;
        private final PluginCall call;

        FinishAdapter(PrintDocumentAdapter page, PluginCall call) {
            this.page = page;
            this.call = call;
        }

        @Override
        public void onStart() {
            page.onStart();
        }

        @Override
        public void onLayout(
            PrintAttributes oldAttributes,
            PrintAttributes newAttributes,
            CancellationSignal cancellationSignal,
            LayoutResultCallback callback,
            Bundle extras
        ) {
            page.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
        }

        @Override
        public void onWrite(
            PageRange[] pages,
            ParcelFileDescriptor destination,
            CancellationSignal cancellationSignal,
            WriteResultCallback callback
        ) {
            page.onWrite(pages, destination, cancellationSignal, callback);
        }

        @Override
        public void onFinish() {
            page.onFinish();
            call.resolve();
        }
    }
}
