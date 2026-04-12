@echo off
color 0E

echo ===================================================
echo   Building Web App...
echo ===================================================
call npm run build

echo.
echo ===================================================
echo   Syncing Capacitor with Android...
echo ===================================================
call npx cap sync android

echo.
echo ===================================================
echo   Setting Environment Variables...
echo ===================================================
set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
set ANDROID_HOME=C:\Users\SVM\AppData\Local\Android\Sdk

echo.
echo ===================================================
echo   Compiling Android APK (Fast Mode)...
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