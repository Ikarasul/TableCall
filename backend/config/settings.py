"""
config/settings.py
==================
Django settings สำหรับ TableCall Restaurant Call System
อ่านค่า configuration จาก .env ผ่าน python-decouple
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# ---------------------------------------------------------------------------
# Base Directory
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ---------------------------------------------------------------------------
# Security
# ---------------------------------------------------------------------------
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# รับทุก ngrok subdomain โดยไม่ต้องแก้ทุกครั้งที่ ngrok restart
ALLOWED_HOSTS += ['.ngrok-free.app', '.ngrok.io', '.ngrok-free.dev', '.trycloudflare.com']

# ---------------------------------------------------------------------------
# Application definition
# ---------------------------------------------------------------------------
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',

    # Local apps — ระบบ TableCall
    'staff',
    'tables',
    'notifications',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',          # ต้องอยู่บนสุด
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# ASGI application (ใช้ Daphne + Channels)
ASGI_APPLICATION = 'config.asgi.application'
WSGI_APPLICATION = 'config.wsgi.application'

# ---------------------------------------------------------------------------
# Database — MySQL 8
# ---------------------------------------------------------------------------
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': config('MYSQL_DATABASE', default='tablecall'),
        'USER': config('MYSQL_USER', default='tablecall_user'),
        'PASSWORD': config('MYSQL_PASSWORD', default=''),
        'HOST': config('MYSQL_HOST', default='db'),
        'PORT': config('MYSQL_PORT', default='3306'),
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ---------------------------------------------------------------------------
# Redis — ใช้สำหรับ Channel Layers และ PIN Lock Cache
# ---------------------------------------------------------------------------
REDIS_URL = config('REDIS_URL', default='redis://localhost:6379')

# Channel Layers ใช้ Redis (รองรับ WebSocket broadcast)
WS_REDIS_URL = f"{REDIS_URL}&health_check_interval=10" if "?" in REDIS_URL else f"{REDIS_URL}?health_check_interval=10"

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.pubsub.RedisPubSubChannelLayer',
        'CONFIG': {
            'hosts': [WS_REDIS_URL],
        },
    },
}

# ---------------------------------------------------------------------------
# Cache — ใช้ Redis สำหรับ PIN lock และ throttle
# ---------------------------------------------------------------------------
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'db': '1',  # ใช้ Redis DB 1 แยกจาก Channel Layers (DB 0)
        },
        'KEY_PREFIX': 'tablecall',
    }
}

# ---------------------------------------------------------------------------
# Password validation
# ---------------------------------------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ---------------------------------------------------------------------------
# Internationalization
# ---------------------------------------------------------------------------
LANGUAGE_CODE = 'th'
TIME_ZONE = 'Asia/Bangkok'
USE_I18N = True
USE_TZ = True

# ---------------------------------------------------------------------------
# Static & Media files
# ---------------------------------------------------------------------------
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ---------------------------------------------------------------------------
# Default primary key field type
# ---------------------------------------------------------------------------
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ---------------------------------------------------------------------------
# Django REST Framework
# ---------------------------------------------------------------------------
REST_FRAMEWORK = {
    # ใช้ custom Staff JWT Authentication สำหรับ TableCall
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'staff.authentication.StaffJWTAuthentication',
    ],
    # Default permission: ต้อง login ก่อน (ยกเว้น endpoint ที่ override)
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Throttle classes
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',    # Guest request limit
        'user': '300/minute',   # Authenticated user limit
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

# ---------------------------------------------------------------------------
# Simple JWT settings
# ---------------------------------------------------------------------------
SIMPLE_JWT = {
    # Access token อายุ 8 ชั่วโมง (1 กะงาน)
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    # Refresh token อายุ 7 วัน
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# ---------------------------------------------------------------------------
# CORS settings — อนุญาต Frontend origins
# ---------------------------------------------------------------------------
if DEBUG:
    # Dev mode: อนุญาตทุก origin (ngrok URL เปลี่ยนทุกครั้งที่ restart)
    CORS_ALLOW_ALL_ORIGINS = True
else:
    # Production: ระบุ origin ที่อนุญาตเฉพาะเจาะจง
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = config(
        'CORS_ALLOWED_ORIGINS',
        default='http://localhost:5173,http://localhost:3000',
        cast=Csv(),
    )
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'ngrok-skip-browser-warning',
]

# ---------------------------------------------------------------------------
# Business Logic Constants
# ---------------------------------------------------------------------------
# PIN lock: ผิดกี่ครั้งถึง lock
PIN_MAX_ATTEMPTS = config('PIN_MAX_ATTEMPTS', default=5, cast=int)
# PIN lock duration (วินาที) = 5 นาที
PIN_LOCK_DURATION = config('PIN_LOCK_DURATION', default=300, cast=int)
# Customer notify throttle (วินาที) = 30 วินาที
NOTIFY_THROTTLE_SECONDS = config('NOTIFY_THROTTLE_SECONDS', default=30, cast=int)
# Data retention (วัน) = 90 วัน
NOTIFICATION_RETENTION_DAYS = config('NOTIFICATION_RETENTION_DAYS', default=90, cast=int)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
        'tablecall': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
