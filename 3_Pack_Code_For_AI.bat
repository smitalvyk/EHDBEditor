@echo off
chcp 65001 >nul
color 0A
echo ===================================================
echo   Packing and Minifying Code for AI...
echo ===================================================

set OUT=Code_For_AI.txt
if exist "%OUT%" del "%OUT%"

powershell -NoProfile -Command "$out='%OUT%'; '=== MINIFIED CODE ===' | Out-File $out -Encoding utf8; $files = @(Get-ChildItem -Path .\src -Include *.vue, *.js -Recurse); $files += @(Get-ChildItem -Path .\ -Include package.json, vite.config.js, capacitor.config.json -File); foreach($f in $files) { $path = $f.FullName.Replace((Get-Location).Path + '\', ''); \"`r`n/* $path */\" | Out-File $out -Append -Encoding utf8; Get-Content $f.FullName | Where-Object { $_.Trim() -ne '' } | ForEach-Object { $_.Trim() } | Out-File $out -Append -Encoding utf8 }"

echo.
echo   [OK] Minified code saved to: %OUT%
echo   (Warning: It will look like a wall of text to a human)
echo ===================================================
pause