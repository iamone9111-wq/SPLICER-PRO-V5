# Proguard rules
-keep class com.videowall.splicer.network.** { *; }
-keepclassmembers class * {
    @kotlinx.serialization.Serializable *;
}
