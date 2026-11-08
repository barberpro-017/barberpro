package uz.barberpro.mijoz;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.res.ColorStateList;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

import java.io.ByteArrayInputStream;
import java.util.HashMap;

public class MainActivity extends Activity {
    private static final int BG = 0xFF0A0A18;
    // Ilova faqat shu manzillarga so'rov yubora oladi (ma'lumot o'g'irlanishiga qarshi)
    private static final String[] ALLOWED = {
            "cdn.jsdelivr.net", "telegram.org", "fonts.googleapis.com", "fonts.gstatic.com"
    };
    private WebView web;
    private ProgressBar bar;
    private String home;

    private boolean hostAllowed(String host) {
        if (host == null) return false;
        if (host.equals(Uri.parse(home).getHost()) || host.endsWith(".supabase.co")) return true;
        for (String h : ALLOWED) {
            if (host.equals(h)) return true;
        }
        return false;
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        if (getResources().getBoolean(R.bool.secure_screen)) {
            // Skrinshot, ekran yozib olish va "oxirgi ilovalar"da ko'rinishni taqiqlaydi
            getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE);
        }
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        home = getString(R.string.app_url);
        WebView.setWebContentsDebuggingEnabled(false);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BG);
        root.setFilterTouchesWhenObscured(true);

        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setFilterTouchesWhenObscured(true);
        root.addView(web, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        bar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        bar.setMax(100);
        bar.setProgressTintList(ColorStateList.valueOf(0xFFFF6FB1));
        bar.setVisibility(View.GONE);
        int h = (int) (3 * getResources().getDisplayMetrics().density);
        root.addView(bar, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, h));
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);
        s.setAllowUniversalAccessFromFileURLs(false);
        s.setGeolocationEnabled(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportMultipleWindows(false);
        s.setSafeBrowsingEnabled(true);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " BarberProApp/1.0");
        web.addJavascriptInterface(new Bridge(), "AndroidApp");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                String host = u.getHost();
                if ("https".equals(scheme) && host != null && host.equals(Uri.parse(home).getHost())) {
                    return false;
                }
                if ("tel".equals(scheme) || "mailto".equals(scheme)) {
                    openExternal(u);
                    return true;
                }
                if ("https".equals(scheme) && ("t.me".equals(host) || "telegram.me".equals(host))) {
                    openExternal(u);
                    return true;
                }
                return true; // qolgan barcha havolalar bloklanadi
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String scheme = u.getScheme();
                if ("file".equals(scheme) && u.toString().startsWith("file:///android_asset/")) return null;
                if ("data".equals(scheme) || "blob".equals(scheme)) return null;
                if ("https".equals(scheme) && hostAllowed(u.getHost())) return null;
                return new WebResourceResponse("text/plain", "utf-8", 403, "Blocked",
                        new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    view.loadUrl("file:///android_asset/offline.html");
                }
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // sertifikat xato bo'lsa hech qachon davom etmaydi
                view.loadUrl("file:///android_asset/offline.html");
            }

            @Override
            public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                recreate();
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                bar.setVisibility(View.GONE);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int progress) {
                bar.setProgress(progress);
                bar.setVisibility(progress >= 100 ? View.GONE : View.VISIBLE);
            }
        });

        web.loadUrl(home);
    }

    private void openExternal(Uri u) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, u));
        } catch (ActivityNotFoundException ignored) {
        }
    }

    private class Bridge {
        @JavascriptInterface
        public void retry() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    web.loadUrl(home);
                }
            });
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onDestroy() {
        web.clearCache(true);
        web.destroy();
        super.onDestroy();
    }
}
