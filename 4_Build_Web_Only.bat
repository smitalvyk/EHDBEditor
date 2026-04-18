@echo off
color 0B
echo ===================================================
echo   [1/2] Compiling Vue Application for Web...
echo ===================================================
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Files were not copied.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   [OK] Build Successful! 
echo.
echo   [2/2] Copying files to DBEditor_Web...
echo ===================================================

xcopy "dist\*" "..\DBEditor_Web\" /S /E /Y /I

echo.
echo ===================================================
echo   [SUCCESS] All files updated in DBEditor_Web!
echo   Location: %~dp0..\DBEditor_Web
echo ===================================================
pause