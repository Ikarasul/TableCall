@echo off
REM ================================================================
REM TableCall — Android APK Setup Script (Windows)
REM ================================================================
REM Script นี้ช่วย setup Capacitor สำหรับ build Android APK
REM
REM Prerequisites:
REM   - Node.js 18+ (https://nodejs.org)
REM   - Android Studio (https://developer.android.com/studio)
REM   - JDK 17+ (ติดตั้งมาพร้อม Android Studio)
REM ================================================================

setlocal enabledelayedexpansion

echo.
echo ====================================================
echo   TableCall Android APK Setup
echo ====================================================
echo.

REM ตรวจสอบ Node.js
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ Node.js — ดาวน์โหลดได้ที่ https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js: 
node --version

REM ตรวจสอบ npm
where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] ไม่พบ npm
    pause
    exit /b 1
)
echo [OK] npm:
call npm --version

REM เข้า frontend directory
cd /d "%~dp0..\frontend"
echo.
echo [INFO] Working directory: %CD%
echo.

REM ================================================================
REM Step 1: ติดตั้ง dependencies
REM ================================================================
echo [Step 1/6] ติดตั้ง npm packages (รวม Capacitor)...
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install ล้มเหลว
    pause
    exit /b 1
)
echo [OK] npm install สำเร็จ
echo.

REM ================================================================
REM Step 2: Build React app
REM ================================================================
echo [Step 2/6] Build React app...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build ล้มเหลว — ตรวจสอบ TypeScript errors ก่อน
    pause
    exit /b 1
)
echo [OK] Build สำเร็จ → dist/
echo.

REM ================================================================
REM Step 3: Init Capacitor (ถ้ายังไม่มี android folder)
REM ================================================================
if not exist "android" (
    echo [Step 3/6] เพิ่ม Android platform...
    call npx cap add android
    if %ERRORLEVEL% neq 0 (
        echo [ERROR] cap add android ล้มเหลว
        pause
        exit /b 1
    )
    echo [OK] Android platform เพิ่มสำเร็จ
) else (
    echo [Step 3/6] Android platform มีอยู่แล้ว — ข้าม
)
echo.

REM ================================================================
REM Step 4: Copy web assets ไป Android
REM ================================================================
echo [Step 4/6] Copy assets ไป Android...
call npx cap copy android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] cap copy ล้มเหลว
    pause
    exit /b 1
)
echo [OK] Copy สำเร็จ
echo.

REM ================================================================
REM Step 5: Sync plugins
REM ================================================================
echo [Step 5/6] Sync Capacitor plugins...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] cap sync ล้มเหลว
    pause
    exit /b 1
)
echo [OK] Sync สำเร็จ
echo.

REM ================================================================
REM Step 6: ตรวจสอบ google-services.json
REM ================================================================
echo [Step 6/6] ตรวจสอบ Firebase config...
if not exist "android\app\google-services.json" (
    echo.
    echo [WARN] ไม่พบ android\app\google-services.json
    echo.
    echo        ขั้นตอน:
    echo        1. ไปที่ https://console.firebase.google.com
    echo        2. สร้างโปรเจกต์ใหม่ หรือเลือกโปรเจกต์ที่มีอยู่
    echo        3. เพิ่ม Android app: Package name = com.tablecall.staff
    echo        4. Download google-services.json
    echo        5. วางไฟล์ที่: frontend\android\app\google-services.json
    echo        6. Copy FCM Server Key ไปใส่ใน .env ที่ FCM_SERVER_KEY=
    echo.
) else (
    echo [OK] พบ google-services.json
)

echo.
echo ====================================================
echo   Setup เสร็จสมบูรณ์!
echo ====================================================
echo.
echo ขั้นตอนถัดไป:
echo   1. วาง google-services.json (ถ้ายังไม่ได้ทำ)
echo   2. เปิด Android Studio:
echo      npx cap open android
echo   3. Build APK: Build → Generate Signed Bundle/APK → APK
echo   4. แจก .apk ให้พนักงานติดตั้ง (sideload)
echo.
echo Tip: ระหว่าง development ใช้คำสั่ง:
echo   npm run build ^&^& npx cap copy android
echo   (แล้ว click Run ใน Android Studio)
echo.

pause
