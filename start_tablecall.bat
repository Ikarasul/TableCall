@echo off
chcp 65001 >nul
echo.
echo ========================================================
echo       🚀 กำลังเปิดระบบ TableCall (เซิร์ฟเวอร์ร้านอาหาร)
echo ========================================================
echo.

echo [1/2] กำลังเปิด ngrok (โดเมนถาวร)...
start /min cmd /c "ngrok http --domain=priestlier-rayna-phyllocladous.ngrok-free.dev 80"
timeout /t 3 /nobreak >nul

echo [2/2] กำลังเปิดระบบหลังบ้าน (Docker)...
docker compose up -d

echo.
echo ========================================================
echo ✅ ระบบเปิดใช้งานเรียบร้อยแล้ว!
echo 🌐 ลิงก์ระบบพนักงาน: https://priestlier-rayna-phyllocladous.ngrok-free.dev/staff/login
echo 📱 (แอปในมือถือพนักงานจะสามารถใช้งานได้ทันที)
echo ========================================================
echo.
pause
