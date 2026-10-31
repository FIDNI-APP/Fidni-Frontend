package fr.fidni.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.provider.MediaStore;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebChromeClient;
import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Choix d'un fichier comme dans Chrome : « Appareil photo » à côté des fichiers dès que le champ accepte des images
 * (photo d'une copie à corriger, copies d'une classe, image d'un contenu). Capacitor ne propose l'appareil photo
 * qu'aux champs `capture`, que le site n'utilise pas. Le reste (console, alertes, permissions) est celui de Capacitor.
 * Pas de permission CAMERA déclarée : l'appareil photo du téléphone prend la photo et l'écrit dans notre cache.
 */
public class FidniWebChromeClient extends BridgeWebChromeClient {

    private final Activity activity;
    private final ActivityResultLauncher<Intent> launcher;
    private ValueCallback<Uri[]> pending;
    private File photo;
    private Uri photoUri;

    public FidniWebChromeClient(Bridge bridge) {
        super(bridge);
        activity = bridge.getActivity();
        launcher = bridge.getActivity().registerForActivityResult(new ActivityResultContracts.StartActivityForResult(), this::onResult);
    }

    @Override
    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
        List<String> types = mimeTypes(params.getAcceptTypes());
        if (params.isCaptureEnabled() || !acceptsImages(types)) {
            return super.onShowFileChooser(webView, callback, params);
        }
        if (pending != null) pending.onReceiveValue(null);
        pending = callback;

        Intent files = new Intent(Intent.ACTION_GET_CONTENT);
        files.addCategory(Intent.CATEGORY_OPENABLE);
        files.setType(types.size() == 1 ? types.get(0) : "*/*");
        if (types.size() > 1) files.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0]));
        if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) files.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);

        // Android 13+ : pour des images, ACTION_GET_CONTENT n'ouvre que le sélecteur de photos. Un champ qui accepte
        // aussi un PDF (copies d'une classe) garde donc « Fichiers » (ACTION_OPEN_DOCUMENT) à côté.
        List<Intent> extra = new ArrayList<>();
        Intent camera = cameraIntent();
        if (camera != null) extra.add(camera);
        if (!onlyImages(types)) {
            Intent documents = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            documents.addCategory(Intent.CATEGORY_OPENABLE);
            documents.setType(files.getType());
            if (types.size() > 1) documents.putExtra(Intent.EXTRA_MIME_TYPES, types.toArray(new String[0]));
            if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) documents.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
            extra.add(documents);
        }
        Intent chooser = Intent.createChooser(files, null);
        chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, extra.toArray(new Intent[0]));
        try {
            launcher.launch(chooser);
        } catch (ActivityNotFoundException e) {
            pending = null;
            callback.onReceiveValue(null);
        }
        return true;
    }

    private void onResult(ActivityResult r) {
        ValueCallback<Uri[]> callback = pending;
        pending = null;
        if (callback == null) return;
        Uri[] result = null;
        Intent data = r.getData();
        if (r.getResultCode() == Activity.RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                result = new Uri[data.getClipData().getItemCount()];
                for (int i = 0; i < result.length; i++) result[i] = data.getClipData().getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                result = new Uri[] { data.getData() };
            } else if (photo != null && photo.length() > 0) {
                result = new Uri[] { photoUri };
            }
        }
        callback.onReceiveValue(result);
    }

    /** Photo écrite dans le cache (file_paths.xml : cache-path), lue ensuite par la page comme un fichier choisi. */
    private Intent cameraIntent() {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        try {
            File dir = new File(activity.getCacheDir(), "photos");
            if (!dir.isDirectory() && !dir.mkdirs()) return null;
            photo = File.createTempFile("photo-", ".jpg", dir);
        } catch (IOException e) {
            return null;
        }
        photoUri = FileProvider.getUriForFile(activity, activity.getPackageName() + ".fileprovider", photo);
        intent.putExtra(MediaStore.EXTRA_OUTPUT, photoUri);
        intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
        return intent;
    }

    /** Types MIME de l'attribut accept (« image/*,application/pdf », « .docx »…) ; vide = tout fichier. */
    private static List<String> mimeTypes(String[] accept) {
        List<String> types = new ArrayList<>();
        if (accept == null) return types;
        for (String raw : accept) {
            for (String part : raw.split(",")) {
                String t = part.trim().toLowerCase();
                if (t.isEmpty()) continue;
                if (t.startsWith(".")) t = MimeTypeMap.getSingleton().getMimeTypeFromExtension(t.substring(1));
                if (t != null && !types.contains(t)) types.add(t);
            }
        }
        return types;
    }

    private static boolean onlyImages(List<String> types) {
        if (types.isEmpty()) return false;
        for (String t : types) if (!t.startsWith("image/")) return false;
        return true;
    }

    private static boolean acceptsImages(List<String> types) {
        if (types.isEmpty()) return true;
        for (String t : types) if (t.startsWith("image/")) return true;
        return false;
    }
}
