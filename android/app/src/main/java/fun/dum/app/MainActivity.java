package fun.dum.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "DumFun";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fix: DecorView stays INVISIBLE (vis=4) because the SplashScreen/Capacitor
        // bridge never triggers the visibility transition. Force it visible.
        getWindow().getDecorView().setVisibility(View.VISIBLE);
        Log.i(TAG, "Forced DecorView VISIBLE");

        // Safety: delayed force-visible in case something resets it
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            View decor = getWindow().getDecorView();
            if (decor.getVisibility() != View.VISIBLE) {
                decor.setVisibility(View.VISIBLE);
                Log.i(TAG, "Delayed force DecorView VISIBLE");
            }
        }, 1000);
    }

    @Override
    public void onStart() {
        super.onStart();
        Bridge bridge = getBridge();
        if (bridge == null) return;

        WebView webView = bridge.getWebView();

        // Remove "; wv)" from user agent so MWA doesn't detect WebView
        WebSettings settings = webView.getSettings();
        String ua = settings.getUserAgentString();
        if (ua != null && ua.contains("; wv)")) {
            settings.setUserAgentString(ua.replace("; wv)", ")"));
            Log.i(TAG, "User agent patched");
        }

        // Expose native bridge for launching wallet intents from JS
        webView.addJavascriptInterface(new MWABridge(webView), "MWABridge");
        Log.i(TAG, "MWABridge JS interface registered");

        // Intercept solana-wallet:// URLs via shouldOverrideUrlLoading as fallback
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("solana-wallet:")) {
                    Log.i(TAG, "shouldOverrideUrlLoading intercepted: " + url);
                    launchWalletIntent(view, url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url != null && url.startsWith("solana-wallet:")) {
                    Log.i(TAG, "shouldOverrideUrlLoading (string) intercepted: " + url);
                    launchWalletIntent(view, url);
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, url);
            }
        });
    }

    /**
     * JavaScript interface exposed as window.MWABridge.
     * Called from the polyfill to launch solana-wallet:// intents natively.
     */
    public static class MWABridge {
        private final WebView webView;

        MWABridge(WebView webView) {
            this.webView = webView;
        }

        @JavascriptInterface
        public void launchIntent(String url) {
            // Security: only allow solana-wallet: scheme to prevent intent injection
            if (url == null || !url.startsWith("solana-wallet:")) {
                Log.e(TAG, "MWABridge: BLOCKED non-solana-wallet intent");
                return;
            }
            Log.i(TAG, "MWABridge.launchIntent called");
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.addCategory(Intent.CATEGORY_BROWSABLE);
                    webView.getContext().startActivity(intent);
                    Log.i(TAG, "MWABridge: launched wallet activity for " + url);

                    // Fire blur event so MWA's detection promise resolves
                    webView.postDelayed(() -> {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new Event('blur'));", null);
                        Log.i(TAG, "MWABridge: blur event dispatched");
                    }, 200);
                } catch (Exception e) {
                    Log.e(TAG, "MWABridge: failed to launch intent: " + e.getMessage());
                }
            });
        }
    }

    private void launchWalletIntent(WebView view, String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
            Log.i(TAG, "Launched wallet intent: " + url);

            // Fire synthetic blur event so MWA's detection promise resolves
            view.postDelayed(() -> view.evaluateJavascript(
                "window.dispatchEvent(new Event('blur'));", null), 200);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch wallet: " + e.getMessage());
        }
    }
}
