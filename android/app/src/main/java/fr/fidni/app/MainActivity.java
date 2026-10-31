package fr.fidni.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin propre à l'application (impression, couleur des barres) : enregistré avant le démarrage du pont.
        registerPlugin(FidniNativePlugin.class);
        super.onCreate(savedInstanceState);
        // Choix d'un fichier avec « Appareil photo », comme dans Chrome.
        bridge.getWebView().setWebChromeClient(new FidniWebChromeClient(bridge));
    }
}
