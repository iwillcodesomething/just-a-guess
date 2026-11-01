package app.justaguess.mobile;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.webkit.WebViewAssetLoader;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
public class MainActivity extends Activity {
 private static final String APP_ORIGIN="https://appassets.androidplatform.net";
 private WebView web;
 private SecureSession session;
 private SharedPreferences settings;
 private final ExecutorService executor=Executors.newFixedThreadPool(3);
 private String exportJson="";
 @Override public void onCreate(Bundle state){super.onCreate(state);session=new SecureSession(this);settings=getSharedPreferences("jag_settings",MODE_PRIVATE);if(!settings.contains("server")&&!BuildConfig.API_BASE_URL.isEmpty())settings.edit().putString("server",BuildConfig.API_BASE_URL).apply();web=new WebView(this);setContentView(web);web.setBackgroundColor(0xFFF7F8FA);WebSettings config=web.getSettings();config.setJavaScriptEnabled(true);config.setDomStorageEnabled(true);config.setAllowFileAccess(false);config.setAllowContentAccess(false);config.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);config.setSupportMultipleWindows(false);if(BuildConfig.DEBUG)WebView.setWebContentsDebuggingEnabled(true);final WebViewAssetLoader loader=new WebViewAssetLoader.Builder().addPathHandler("/assets/",new WebViewAssetLoader.AssetsPathHandler(this)).build();web.setWebViewClient(new WebViewClient(){@Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){return loader.shouldInterceptRequest(request.getUrl());}@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if(APP_ORIGIN.equals(uri.getScheme()+"://"+uri.getHost()))return false;if("https".equals(uri.getScheme())){try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception e){Toast.makeText(MainActivity.this,"Bağlantı açılamadı.",Toast.LENGTH_SHORT).show();}}return true;}});web.addJavascriptInterface(new Bridge(),"JustAGuess");if(android.os.Build.VERSION.SDK_INT>=35){web.setOnApplyWindowInsetsListener((view,insets)->{android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars()|WindowInsets.Type.displayCutout());view.setPadding(bars.left,bars.top,bars.right,bars.bottom);return insets;});}web.loadUrl(APP_ORIGIN+"/assets/index.html");if(settings.getString("server","").isEmpty())web.postDelayed(this::configureServer,500);}
 private boolean appPage(){String url=web.getUrl();return url!=null&&url.startsWith(APP_ORIGIN+"/assets/");}
 static String validServer(String value){return ServerAddress.normalize(value,BuildConfig.DEBUG);}
 private void configureServer(){LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);int pad=(int)(24*getResources().getDisplayMetrics().density);layout.setPadding(pad,0,pad,0);TextView info=new TextView(this);info.setText("Docker backend'inin HTTPS adresini gir. Sunucu değişirse bu cihazdaki oturum kapanır; verilerin önceki sunucuda kalır."+(BuildConfig.DEBUG?"\nYerel testte bilgisayarının LAN IP'si ve :8080 kullanılabilir.":""));layout.addView(info);EditText field=new EditText(this);field.setSingleLine(true);field.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);field.setHint("https://api.ornek.com");field.setText(settings.getString("server",""));layout.addView(field);AlertDialog dialog=new AlertDialog.Builder(this).setTitle("Sunucu bağlantısı").setView(layout).setNegativeButton("Şimdilik kapat",null).setPositiveButton("Bağlantıyı kaydet",null).create();dialog.setOnShowListener(d->dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v->{String base=validServer(field.getText().toString());if(base==null){field.setError(BuildConfig.DEBUG?"HTTPS adresi veya yerel test adresi gir.":"Geçerli bir HTTPS sunucu adresi gir.");return;}if(!base.equals(settings.getString("server","")))session.clear();settings.edit().putString("server",base).apply();dialog.dismiss();web.reload();}));dialog.show();}
 private static String read(InputStream input) throws Exception {if(input==null)return "{}";try(input;ByteArrayOutputStream output=new ByteArrayOutputStream()){byte[] bytes=new byte[8192];int n;while((n=input.read(bytes))!=-1){if(output.size()+n>2*1024*1024)throw new Exception("Sunucu yanıtı çok büyük.");output.write(bytes,0,n);}return output.toString(StandardCharsets.UTF_8.name());}}
 private void callback(String id,int status,JSONObject body){try{JSONObject result=new JSONObject().put("status",status).put("body",body);String script="window.__jagResponse && window.__jagResponse("+JSONObject.quote(id)+","+result+");";runOnUiThread(()->{if(!isFinishing()&&appPage())web.evaluateJavascript(script,null);});}catch(Exception ignored){}}
 final class Bridge {
  @JavascriptInterface public boolean hasSession(){return !session.token().isEmpty();}
  @JavascriptInterface public boolean isGuest(){return session.isGuest();}
  @JavascriptInterface public String getBaseUrl(){return settings.getString("server","");}
  @JavascriptInterface public void logout(){session.clear();}
  @JavascriptInterface public void configureServer(){runOnUiThread(MainActivity.this::configureServer);}
  @JavascriptInterface public void feedback(boolean sound,boolean haptics){runOnUiThread(()->{if(haptics){android.os.Vibrator vibrator=(android.os.Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator!=null&&vibrator.hasVibrator())vibrator.vibrate(android.os.VibrationEffect.createOneShot(25,android.os.VibrationEffect.DEFAULT_AMPLITUDE));}if(sound){try{android.media.ToneGenerator tone=new android.media.ToneGenerator(android.media.AudioManager.STREAM_MUSIC,30);tone.startTone(android.media.ToneGenerator.TONE_PROP_ACK,120);web.postDelayed(tone::release,200);}catch(Exception ignored){}}});}
  @JavascriptInterface public void saveExport(String json){if(json.length()>2*1024*1024)return;exportJson=json;runOnUiThread(()->{Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE,"just-a-guess-verilerim.json");startActivityForResult(intent,601);});}
  @JavascriptInterface public void request(String id,String method,String path,String body){if(!id.matches("[a-zA-Z0-9-]{16,64}")||!(method.equals("GET")||method.equals("POST"))||!path.matches("/v1/(game|export|auth/(guest|register|login|logout|me))")||body.length()>12000)return;executor.execute(()->{HttpURLConnection connection=null;try{String base=validServer(settings.getString("server",""));if(base==null)throw new Exception("Önce Sunucu bağlantısı bölümünden backend adresini ayarla.");connection=(HttpURLConnection)new java.net.URL(base+(base.equals(BuildConfig.API_BASE_URL)?BuildConfig.API_PATH_PREFIX:"")+path).openConnection();connection.setConnectTimeout(10000);connection.setReadTimeout(25000);connection.setInstanceFollowRedirects(false);connection.setRequestMethod(method);connection.setRequestProperty("Accept","application/json");if(base.equals(BuildConfig.API_BASE_URL)&&!BuildConfig.API_PATH_PREFIX.isEmpty())connection.setRequestProperty("x-region","eu-west-1");String token=session.token();if(!token.isEmpty())connection.setRequestProperty("Authorization","Bearer "+token);if(method.equals("POST")){connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json; charset=utf-8");try(java.io.OutputStream output=connection.getOutputStream()){output.write((body.isEmpty()?"{}":body).getBytes(StandardCharsets.UTF_8));}}int status=connection.getResponseCode();String raw=read(status>=400?connection.getErrorStream():connection.getInputStream());JSONObject response;try{response=new JSONObject(raw);}catch(Exception e){throw new Exception("Sunucu JSON API yanıtı vermedi. Adresi kontrol et.");}if(status>=200&&status<300&&path.startsWith("/v1/auth/")&&response.has("token")){session.save(response.getString("token"),response.optBoolean("guest",true));response.remove("token");}if(status==401&&!path.equals("/v1/auth/login"))session.clear();if(path.equals("/v1/auth/logout")&&status==200)session.clear();callback(id,status,response);}catch(Exception e){try{callback(id,503,new JSONObject().put("error",e.getMessage()==null?"Sunucuya ulaşılamadı.":e.getMessage()));}catch(Exception ignored){}}finally{if(connection!=null)connection.disconnect();}});}
 }
 @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request==601&&result==RESULT_OK&&data!=null&&data.getData()!=null){try(java.io.OutputStream output=getContentResolver().openOutputStream(data.getData())){if(output!=null)output.write(exportJson.getBytes(StandardCharsets.UTF_8));Toast.makeText(this,"Verilerin kaydedildi.",Toast.LENGTH_SHORT).show();}catch(Exception e){Toast.makeText(this,"Dosya kaydedilemedi.",Toast.LENGTH_SHORT).show();}finally{exportJson="";}}}
 @Override public void onBackPressed(){web.evaluateJavascript("(function(){var close=document.querySelector('.modal-close');if(close){close.click();return true;}return false;})()",value->{if(!"true".equals(value))new AlertDialog.Builder(this).setMessage("Just a Guess'ten çıkılsın mı?").setNegativeButton("Devam et",null).setPositiveButton("Çık",(d,w)->finish()).show();});}
 @Override protected void onDestroy(){executor.shutdownNow();web.removeJavascriptInterface("JustAGuess");web.destroy();super.onDestroy();}
}
