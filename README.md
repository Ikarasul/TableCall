# TableCall 🔔

> ระบบเรียกพนักงาน / เช็คบิล ผ่าน QR Code สำหรับร้านอาหาร  
> Real-time notification ผ่าน WebSocket (Django Channels)

---

## โครงสร้างระบบ

```
tablecall/
├── backend/          # Django + DRF + Django Channels (ASGI)
├── frontend/         # React 18 + Vite + Tailwind CSS
├── nginx/            # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

**Tech Stack:**
| ส่วน | เทคโนโลยี |
|---|---|
| Backend | Django 4.2 + DRF + Django Channels 4 + Daphne |
| Real-time | Django Channels + Redis (Channel Layer) |
| Database | MySQL 8 |
| Frontend | React 18 + Vite + Tailwind CSS + Zustand |
| Container | Docker Compose (5 services) |
| Proxy | Nginx + Cloudflare Tunnel |
| APK | Capacitor (ครอบ React เป็น Android app) |

---

## เริ่มต้นใช้งาน (Docker Compose)

### 1. Clone และตั้งค่า Environment

```bash
git clone <repo-url>
cd tablecall

# คัดลอกและแก้ไข .env
copy .env.example .env
```

แก้ไขค่าใน `.env` ที่สำคัญ:
```env
SECRET_KEY=<สุ่มค่าใหม่ที่นี่>
MYSQL_PASSWORD=<รหัสผ่านที่แข็งแรง>
MYSQL_ROOT_PASSWORD=<รหัสผ่าน root>
JWT_SECRET_KEY=<สุ่มค่าใหม่ที่นี่>
FCM_SERVER_KEY=<จาก Firebase Console — ถ้าต้องการ APK>
```

### 2. Build และ Start ระบบ

```bash
docker-compose up --build -d
```

> ครั้งแรกจะใช้เวลาสักครู่เพื่อ download images และ build

### 3. ทำ Database Migration

```bash
docker-compose exec backend python manage.py migrate
```

### 4. สร้าง Superuser (Admin)

```bash
docker-compose exec backend python manage.py createsuperuser
```

### 5. สร้างข้อมูลโต๊ะเริ่มต้น

เข้า Django Admin ที่ `http://localhost/admin/` แล้วสร้าง:
- **Staff** (พนักงาน): ใส่ code, name, avatar_emoji, PIN (ระบบจะ hash ให้อัตโนมัติ)
- **RestaurantTable** (โต๊ะ): ใส่ number, seats (qr_token จะสร้างอัตโนมัติ)

### 6. เข้าใช้งาน

| URL | คำอธิบาย |
|---|---|
| `http://localhost/staff/login` | หน้าพนักงาน (เลือกชื่อ + PIN) |
| `http://localhost/table/<qr_token>` | หน้าลูกค้า (สแกน QR) |
| `http://localhost/admin/` | Django Admin |
| `http://localhost/api/` | REST API |

---

## การ Deploy ผ่าน Cloudflare Tunnel

```bash
# ติดตั้ง cloudflared
winget install Cloudflare.cloudflared

# Login
cloudflared tunnel login

# สร้าง tunnel
cloudflared tunnel create tablecall

# เริ่ม tunnel (ชี้ไปที่ nginx port 80)
cloudflared tunnel --url http://localhost:80
```

> Cloudflare จะให้ domain เช่น `https://tablecall.trycloudflare.com`  
> อัปเดต `ALLOWED_HOSTS` และ `CORS_ALLOWED_ORIGINS` ใน `.env` ให้ตรงกับ domain

---

## QR Code สำหรับโต๊ะ

หลังสร้างโต๊ะใน Admin แล้ว ให้นำ `qr_token` ไปสร้าง QR Code ที่ชี้ไป:
```
https://your-domain.com/table/<qr_token>
```

ใช้เว็บ เช่น [qr-code-generator.com](https://www.qr-code-generator.com/) หรือ library ใดก็ได้

---

## Limit Settings (ค่าเริ่มต้น)

| Setting | ค่า | แก้ไขที่ |
|---|---|---|
| PIN ผิดสูงสุด | 5 ครั้ง | `PIN_MAX_ATTEMPTS` ใน `.env` |
| Lock ชั่วคราว | 5 นาที | `PIN_LOCK_MINUTES` ใน `.env` |
| Throttle ลูกค้า | 30 วินาที | `CUSTOMER_NOTIFY_THROTTLE_SECONDS` ใน `.env` |
| เก็บ Notification | 90 วัน | `NOTIFICATION_RETENTION_DAYS` ใน `.env` |

---

## Cleanup Job (ลบข้อมูลเก่า)

ตั้ง Windows Task Scheduler หรือ cron ให้รันทุกวัน:

```bash
docker-compose exec backend python manage.py cleanup_notifications
```

options:
```bash
--days 60        # เปลี่ยนจาก 90 เป็น 60 วัน
--dry-run        # ดูตัวเลขก่อนลบจริง
--batch-size 500 # กำหนด batch ถ้าข้อมูลเยอะ
```

---

## API หลัก (ตัวอย่าง)

```bash
# รายชื่อพนักงาน
GET /api/staff/

# Login พนักงาน
POST /api/staff/1/verify-pin/
{"pin": "1234"}

# Floor View (ต้องแนบ JWT)
GET /api/tables/
Authorization: Bearer <token>

# ลูกค้าเรียกพนักงาน (ไม่ต้อง auth)
POST /api/tables/<qr_token>/notify/
{"kind": "call"}

# ลูกค้าเช็คบิล
POST /api/tables/<qr_token>/notify/
{"kind": "bill"}

# พนักงานกดรับ
POST /api/notifications/1/handle/
Authorization: Bearer <token>
```

---

## Android APK (Capacitor)

### ติดตั้ง Capacitor

```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor-firebase/messaging
npx cap init "TableCall" "com.tablecall.app"
npx cap add android
```

### ตั้งค่า Firebase

1. ไปที่ [Firebase Console](https://console.firebase.google.com/)
2. สร้างโปรเจกต์ใหม่
3. เพิ่มแอป Android (package: `com.tablecall.app`)
4. Download `google-services.json` → วางที่ `android/app/google-services.json`
5. บันทึก FCM Server Key ลงใน `.env` ที่ Backend

### Build APK

```bash
# Build React ก่อน
npm run build

# Copy ไฟล์ไป Android
npx cap copy android
npx cap sync android

# เปิด Android Studio แล้ว Build → Generate Signed APK
npx cap open android
```

### แจกจ่าย APK

- แจก `.apk` ให้พนักงานติดตั้งโดยตรง (sideload)
- เปิดใช้ "Unknown sources" บนมือถือ/แท็บเล็ต

---

## Troubleshooting

**MySQL ไม่ start:**
```bash
docker-compose logs db
# รอ healthcheck ผ่านก่อน (อาจใช้เวลา 30-60 วิ ครั้งแรก)
```

**WebSocket ไม่เชื่อมต่อ:**
- ตรวจสอบ nginx config มี `Upgrade` header
- ตรวจสอบ `ALLOWED_HOSTS` ใน `.env` ครอบ domain ที่ใช้

**CORS Error:**
- เพิ่ม URL ใน `CORS_ALLOWED_ORIGINS` ใน `.env`

**PIN Lock ค้าง:**
```bash
# ล้าง Redis lock ของพนักงาน id=1
docker-compose exec redis redis-cli DEL pin_locked:1 pin_attempts:1
```

---

## คำสั่งที่มีประโยชน์

```bash
# ดู logs แบบ real-time
docker-compose logs -f backend

# รีสตาร์ท service เดียว
docker-compose restart backend

# เข้า shell backend
docker-compose exec backend bash

# ดู WebSocket connections (Redis)
docker-compose exec redis redis-cli CLIENT LIST

# หยุดระบบทั้งหมด
docker-compose down

# หยุดและลบ volumes (ระวัง! ข้อมูลหาย)
docker-compose down -v
```
