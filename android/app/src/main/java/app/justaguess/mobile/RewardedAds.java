package app.justaguess.mobile;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.widget.Toast;
import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;
import com.google.android.gms.ads.rewarded.ServerSideVerificationOptions;
import com.google.ads.mediation.admob.AdMobAdapter;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;
import org.json.JSONObject;

final class RewardedAds {
 interface Result { void complete(String id,int status,JSONObject body); }
 private final Activity activity;
 private final Result result;
 private final Runnable restore;
 private boolean initialized=false,busy=false,showing=false;
 private String active="";
 RewardedAds(Activity activity,Result result,Runnable restore){this.activity=activity;this.result=result;this.restore=restore;}
 void start(){if(!BuildConfig.AD_TEST_MODE)consent(()->{},message->{});}
 private interface Failure{void fail(String message);}
 private void consent(Runnable ready,Failure failed){
  if(BuildConfig.AD_TEST_MODE){ready.run();return;}
  ConsentInformation info=UserMessagingPlatform.getConsentInformation(activity);
  info.requestConsentInfoUpdate(activity,new ConsentRequestParameters.Builder().build(),()->UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity,error->{
   if(info.canRequestAds())ready.run();else failed.fail(error==null?"Reklam tercihlerin nedeniyle şu anda reklam gösterilemiyor.":error.getMessage());
  }),error->{if(info.canRequestAds())ready.run();else failed.fail("Reklam gizlilik tercihleri alınamadı. Daha sonra tekrar dene.");});
 }
 void show(String id,String ticket){
  if(busy){finish(id,409,false,"Bir reklam isteği zaten açık.");return;}
  busy=true;active=id;
  consent(()->{
   if(initialized){load(id,ticket);return;}
   MobileAds.setRequestConfiguration(new RequestConfiguration.Builder().setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G).build());
   new Thread(()->MobileAds.initialize(activity,status->activity.runOnUiThread(()->{initialized=true;if(active.equals(id))load(id,ticket);}))).start();
  },message->finish(id,503,false,message));
  new Handler(Looper.getMainLooper()).postDelayed(()->{if(active.equals(id)&&!showing)finish(id,503,false,"Reklam yüklenemedi. Bağlantını kontrol edip yeniden dene.");},60000);
 }
 private void load(String id,String ticket){
  Bundle extras=new Bundle();extras.putString("npa","1");
  AdRequest request=new AdRequest.Builder().addNetworkExtrasBundle(AdMobAdapter.class,extras).build();
  RewardedAd.load(activity,BuildConfig.REWARDED_AD_UNIT,request,new RewardedAdLoadCallback(){
   @Override public void onAdFailedToLoad(LoadAdError error){if(active.equals(id))finish(id,503,false,"Şu anda uygun reklam yok. Daha sonra tekrar dene.");}
   @Override public void onAdLoaded(RewardedAd ad){
    if(!active.equals(id)||activity.isFinishing())return;
    ad.setServerSideVerificationOptions(new ServerSideVerificationOptions.Builder().setCustomData(ticket).build());
    final boolean[] earned={false};
    ad.setFullScreenContentCallback(new FullScreenContentCallback(){
     @Override public void onAdShowedFullScreenContent(){showing=true;}
     @Override public void onAdFailedToShowFullScreenContent(AdError error){finish(id,503,false,"Reklam açılamadı. Yeniden dene.");}
     @Override public void onAdDismissedFullScreenContent(){finish(id,200,earned[0],earned[0]?"Reklam tamamlandı.":"Reklam tamamlanmadı; ödül verilmedi.");}
    });
    ad.show(activity,reward->earned[0]=true);
   }
  });
 }
 private void finish(String id,int status,boolean earned,String message){
  if(active.equals(id)){active="";busy=false;showing=false;}
  try{JSONObject body=new JSONObject().put("earned",earned).put("test",BuildConfig.AD_TEST_MODE);body.put(status>=400?"error":"message",message);result.complete(id,status,body);}catch(Exception ignored){}
  restore.run();
 }
 void cancel(){if(!showing&&!active.isEmpty())finish(active,200,false,"Reklam isteği iptal edildi.");}
 void privacy(){
  if(BuildConfig.AD_TEST_MODE){Toast.makeText(activity,"Bu sürüm Google test reklamlarını kullanır. Gelir üretmez.",Toast.LENGTH_LONG).show();return;}
  ConsentInformation info=UserMessagingPlatform.getConsentInformation(activity);
  if(info.getPrivacyOptionsRequirementStatus()==ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED)UserMessagingPlatform.showPrivacyOptionsForm(activity,error->{if(error!=null)Toast.makeText(activity,"Gizlilik tercihleri açılamadı.",Toast.LENGTH_SHORT).show();restore.run();});
  else Toast.makeText(activity,"Bu bölgede ek reklam gizlilik formu gerekmiyor.",Toast.LENGTH_SHORT).show();
 }
}
