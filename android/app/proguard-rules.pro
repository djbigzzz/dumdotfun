# Keep JavascriptInterface methods for MWABridge
-keepclassmembers class fun.dum.app.MainActivity$MWABridge {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor classes
-keep class com.getcapacitor.** { *; }

# Keep app entry points
-keep public class fun.dum.app.MainActivity { *; }

# Preserve line numbers for crash reports
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
