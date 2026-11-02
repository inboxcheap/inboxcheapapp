package com.inboxcheap.app;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.TextView;

public final class MainActivity extends Activity {
 private WebView web;
 private TextView offline;
 private static final String HOME="https://inboxcheap.com/mobile";
 @Override public void onCreate(Bundle state) {
  super.onCreate(state);
  FrameLayout root=new FrameLayout(this);root.setBackgroundColor(Color.WHITE);
  root.setOnApplyWindowInsetsListener((view,insets)->{
   if(android.os.Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(bars.left,bars.top,bars.right,Math.max(bars.bottom,insets.getInsets(WindowInsets.Type.ime()).bottom));}
   else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
   return insets;
  });
  web=new WebView(this);root.addView(web,new FrameLayout.LayoutParams(-1,-1));
  offline=new TextView(this);offline.setText("Could not connect.\nCheck your connection and tap to retry.");offline.setTextColor(Color.rgb(22,55,45));offline.setTextSize(18);offline.setGravity(17);offline.setBackgroundColor(Color.WHITE);offline.setPadding(32,32,32,32);offline.setVisibility(View.GONE);root.addView(offline,new FrameLayout.LayoutParams(-1,-1));
  offline.setOnClickListener(v->{offline.setVisibility(View.GONE);web.loadUrl(HOME);});
  setContentView(root);
  configureSystemBars();
  WebSettings settings=web.getSettings();
  settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);
  settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);
  settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);
  settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
  settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
  settings.setSaveFormData(false);settings.setSupportMultipleWindows(true);
  settings.setJavaScriptCanOpenWindowsAutomatically(false);settings.setMediaPlaybackRequiresUserGesture(true);
  settings.setSafeBrowsingEnabled(true);
  settings.setUserAgentString(settings.getUserAgentString()+" InboxCheapAndroid/1.3.0");
  CookieManager.getInstance().setAcceptCookie(true);CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
  web.setWebViewClient(new WebViewClient(){
   @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
    Uri uri=request.getUrl();
    if(isApp(uri))return false;
    boolean signIn="https".equals(uri.getScheme())&&"inboxcheap.com".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().matches("/mobile/link/[a-f0-9]{64}");
    if(request.isForMainFrame()&&(request.hasGesture()||signIn))openExternal(uri);
    return true;
   }
   @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();}
   @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())offline.setVisibility(View.VISIBLE);}
  });
  web.setWebChromeClient(new WebChromeClient(){
   @Override public boolean onCreateWindow(WebView view,boolean dialog,boolean userGesture,Message message){
    if(!userGesture)return false;
    WebView popup=new WebView(MainActivity.this);
    popup.setWebViewClient(new WebViewClient(){@Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){openExternal(r.getUrl());v.destroy();return true;}});
    ((WebView.WebViewTransport)message.obj).setWebView(popup);message.sendToTarget();return true;
   }
  });
  if(state!=null)web.restoreState(state);else web.loadUrl(HOME);
 }
 private boolean isApp(Uri uri){
  String path=uri.getPath();
  return "https".equals(uri.getScheme())&&"inboxcheap.com".equals(uri.getHost())&&(uri.getPort()==-1||uri.getPort()==443)&&path!=null&&(path.equals("/mobile")||(path.startsWith("/mobile/")&&!path.startsWith("/mobile/link/")));
 }
 private void openExternal(Uri uri){
  if(!"https".equals(uri.getScheme())||uri.getHost()==null)return;
  boolean signIn="inboxcheap.com".equals(uri.getHost())&&uri.getPath()!=null&&uri.getPath().startsWith("/mobile/link/");
  if(signIn){launch(uri);return;}
  new AlertDialog.Builder(this).setTitle("Open in your browser?").setMessage(uri.getHost()).setNegativeButton("Cancel",null).setPositiveButton("Open",(dialog,which)->launch(uri)).show();
 }
 private void launch(Uri uri){try{Intent intent=new Intent(Intent.ACTION_VIEW,uri);intent.addCategory(Intent.CATEGORY_BROWSABLE);startActivity(intent);}catch(android.content.ActivityNotFoundException e){new AlertDialog.Builder(this).setMessage("No browser is available on this device.").setPositiveButton("OK",null).show();}}
 private void configureSystemBars(){
  getWindow().setStatusBarColor(Color.WHITE);
  getWindow().setNavigationBarColor(Color.WHITE);
  View decor=getWindow().getDecorView();
  decor.setSystemUiVisibility(decor.getSystemUiVisibility()|View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
  if(android.os.Build.VERSION.SDK_INT>=30){
   WindowInsetsController controller=getWindow().getInsetsController();
   if(controller!=null){int flags=WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS|WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;controller.setSystemBarsAppearance(flags,flags);}
  }
 }
 @Override protected void onResume(){super.onResume();configureSystemBars();if(web!=null)web.onResume();}
 @Override protected void onPause(){if(web!=null){web.onPause();CookieManager.getInstance().flush();}super.onPause();}
 @Override public void onBackPressed(){
  if(offline.getVisibility()==View.VISIBLE){finish();return;}
  web.evaluateJavascript("(function(){var d=document.querySelector('dialog[open]');if(d){d.close();return 'handled';}var r=document.getElementById('reader'),m=document.getElementById('messages');return (r&&!r.hidden)||(m&&!m.hidden)?'back':'exit';})()",result->{
   if("\"back\"".equals(result)&&web.canGoBack())web.goBack();
   else if(!"\"handled\"".equals(result))finish();
  });
 }
 @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
 @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
