# ===================================================
# Dockerfile สำหรับ TableCall Backend (Django + Daphne)
# ใช้ python:3.12-slim เพื่อลดขนาด image
# ===================================================

FROM python:3.12-slim

# ตั้งค่า environment variables เพื่อป้องกัน .pyc และ buffer
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# ติดตั้ง system dependencies สำหรับ mysqlclient
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# ติดตั้ง Python dependencies ก่อน copy code (เพื่อ cache layer)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy โค้ดทั้งหมด
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port 8000 สำหรับ Daphne ASGI server
EXPOSE 8000

# รัน Daphne เป็น ASGI server (รองรับ HTTP + WebSocket)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "config.asgi:application"]
