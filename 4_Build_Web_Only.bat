@echo off
color 0B
echo ===================================================
echo   [1/2] Compiling Vue Application for Web...
echo ===================================================
call npm run build

echo.
echo ===================================================
echo   [OK] Build Successful! 
echo   All production files are now inside the "dist" folder.
echo   You can upload this folder to any web host.
echo.
echo   [2/2] Do you want to test the compiled web version right now?
echo   Press any key to start the local preview server...
echo   (Or just close this window if you only needed the files)
echo ===================================================
pause

echo.
echo Starting preview server... (Press Ctrl+C to stop)
call npm run preview