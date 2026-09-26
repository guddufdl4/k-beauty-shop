package com.hmtkorea.app

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.Bitmap
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.getSystemService
import com.hmtkorea.app.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var binding: ActivityMainBinding
    private val storeHost = "hmtkorea.com"

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val webView = binding.storeWebView
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
            cacheMode = WebSettings.LOAD_DEFAULT
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            userAgentString = "$userAgentString HMTKoreaApp/1.0"
        }
        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progress.visibility = if (newProgress in 1..99) View.VISIBLE else View.GONE
                binding.progress.progress = newProgress
            }
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?,
            ): Boolean {
                val uri = request?.url ?: return false
                return handleExternal(uri)
            }

            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                binding.offline.visibility = View.GONE
                webView.visibility = View.VISIBLE
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?,
            ) {
                if (request?.isForMainFrame == true) {
                    showOffline()
                }
            }
        }

        binding.retry.setOnClickListener { loadStore() }
        onBackPressedDispatcher.addCallback(
            this,
            object : OnBackPressedCallback(true) {
                override fun handleOnBackPressed() {
                    if (webView.canGoBack()) {
                        webView.goBack()
                    } else {
                        finish()
                    }
                }
            },
        )

        if (savedInstanceState == null) {
            loadStore()
        } else {
            webView.restoreState(savedInstanceState)
        }
    }

    override fun onPause() {
        CookieManager.getInstance().flush()
        super.onPause()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        binding.storeWebView.saveState(outState)
    }

    private fun loadStore() {
        if (!isOnline()) {
            showOffline()
            return
        }
        binding.offline.visibility = View.GONE
        binding.storeWebView.visibility = View.VISIBLE
        binding.storeWebView.loadUrl(getString(R.string.store_url))
    }

    private fun showOffline() {
        binding.storeWebView.visibility = View.GONE
        binding.progress.visibility = View.GONE
        binding.offline.visibility = View.VISIBLE
    }

    private fun isOnline(): Boolean {
        val manager = getSystemService<ConnectivityManager>() ?: return false
        val network = manager.activeNetwork ?: return false
        val caps = manager.getNetworkCapabilities(network) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun handleExternal(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase().orEmpty()
        if (scheme == "tel" || scheme == "mailto" || scheme == "sms" || scheme == "whatsapp") {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            return true
        }
        val host = uri.host?.lowercase().orEmpty()
        if (host.endsWith(storeHost) || host.contains("stripe.com") || host.contains("supabase.co")) {
            return false
        }
        if (scheme == "http" || scheme == "https") {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            return true
        }
        return false
    }
}
