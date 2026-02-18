@echo off
setlocal

REM Finish By - Automated Setup Script (Windows)
REM This script will set up everything you need to run the app

echo =========================================
echo   Finish By - Project Setup
echo =========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo.
    echo Please install Node.js first:
    echo   👉 Visit: https://nodejs.org/
    echo   👉 Download the LTS version
    echo   👉 Run this script again after installation
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js detected
node -v
echo ✅ npm detected  
npm -v
echo.

REM Install dependencies
echo 📦 Installing dependencies...
echo    (This may take 1-2 minutes on first run)
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Installation failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

echo.
echo =========================================
echo   ✅ Setup Complete!
echo =========================================
echo.
echo You're ready to go! Here's what to do next:
echo.
echo 1️⃣  Start the development server:
echo    npm run dev
echo.
echo 2️⃣  Open your browser to:
echo    http://localhost:3000
echo.
echo 3️⃣  Start coding!
echo    - Edit src/App.jsx to modify the app
echo    - Changes will appear instantly
echo.
echo 📱 To test on your phone:
echo    - Look for the 'Network' URL when you run 'npm run dev'
echo    - Open that URL on your phone (same WiFi)
echo.
echo 📚 Need help? Check README.md
echo.
echo Happy coding! 🚀
echo.
pause
