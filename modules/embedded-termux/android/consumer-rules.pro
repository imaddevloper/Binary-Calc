# Termux terminal emulator uses JNI entry points from its libtermux native library.
-keep class com.termux.terminal.JNI { *; }
-keepclasseswithmembernames class * { native <methods>; }
