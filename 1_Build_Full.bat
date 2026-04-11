@echo off
color 0B
echo ===================================================
echo   [1/4] Building Vue Web Application...
echo ===================================================
call npm run build

echo.
echo ===================================================
echo   [2/4] Syncing files to Android (Capacitor)...
echo ===================================================
call npx cap sync

echo.
echo ===================================================
echo   [3/4] Setting Environment Variables...
echo ===================================================
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\SVM\AppData\Local\Android\Sdk
echo JAVA_HOME is set to: %JAVA_HOME%
echo ANDROID_HOME is set to: %ANDROID_HOME%

echo.
echo ===================================================
echo   [4/4] Compiling Android APK...
echo ===================================================
cd android
call gradlew assembleDebug
cd ..

echo.
echo ===================================================
echo   SUCCESS! The APK is ready.
echo   Path: android\app\build\outputs\apk\debug\app-debug.apk
echo ===================================================
pause