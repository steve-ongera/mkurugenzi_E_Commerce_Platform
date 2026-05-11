"""
mkurugenzi/settings.py
Django settings for mkurugenzi.co.ke

Environment variables are loaded from a .env file via python-decouple.
Copy .env.example → .env and fill in the values before running.
"""
from pathlib import Path
from datetime import timedelta
import dj_database_url
from decouple import config, Csv

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent.parent

# ── Core ──────────────────────────────────────────────────────────────────────
SECRET_KEY    = config('SECRET_KEY')
DEBUG         = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', cast=Csv())   # e.g. mkurugenzi.co.ke,www.mkurugenzi.co.ke

# ── Application definition ────────────────────────────────────────────────────
INSTALLED_APPS = [
    # Django built-ins
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sitemaps',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # required for logout blacklisting
    'corsheaders',
    'django_filters',
    'cloudinary',
    'cloudinary_storage',

    # Local
    'core',
]

MIDDLEWARE = [
    # CORS must be first
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves static files efficiently in production
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF      = 'backend.urls'
WSGI_APPLICATION  = 'backend.wsgi.application'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS':    [BASE_DIR / 'templates'],
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

# ── Database ──────────────────────────────────────────────────────────────────
# Defaults to SQLite for local dev; set DATABASE_URL in .env for PostgreSQL.
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ── Custom User model ─────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'core.User'

# ── Password validation ───────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ── Internationalisation ──────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'Africa/Nairobi'
USE_I18N      = True
USE_TZ        = True

# ── Static files ──────────────────────────────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── Media / Cloudinary ────────────────────────────────────────────────────────
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY':    config('CLOUDINARY_API_KEY',    default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
}
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
MEDIA_URL            = '/media/'
# Local fallback (used when DEBUG=True and Cloudinary creds are empty)
MEDIA_ROOT           = BASE_DIR / 'media'

# ── Default primary key ───────────────────────────────────────────────────────
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ── Django REST Framework ─────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',
    'PAGE_SIZE': 24,
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    # Show DRF browsable API in DEBUG mode only
    'DEFAULT_RENDERER_CLASSES': (
        ['rest_framework.renderers.JSONRenderer',
         'rest_framework.renderers.BrowsableAPIRenderer']
        if DEBUG
        else ['rest_framework.renderers.JSONRenderer']
    ),
}

# ── SimpleJWT ─────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(
        minutes=config('JWT_ACCESS_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS':    True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES':        ('Bearer',),
    'USER_ID_FIELD':            'id',
    'USER_ID_CLAIM':            'user_id',
}

# ── CORS ──────────────────────────────────────────────────────────────────────
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:5173,http://localhost:3000',
    cast=Csv(),
)
CORS_ALLOW_CREDENTIALS = True
# Allow the custom guest-email header used in order lookups
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
    'x-guest-email',   # ← guest order lookup
]

# ── Site metadata (used in emails, sitemaps, signals) ─────────────────────────
SITE_URL  = config('SITE_URL', default='https://mkurugenzi.co.ke')
SITE_NAME = 'Mkurugenzi'

# ── M-Pesa Daraja ────────────────────────────────────────────────────────────
MPESA_ENVIRONMENT    = config('MPESA_ENVIRONMENT', default='sandbox')   # sandbox | production
MPESA_CONSUMER_KEY   = config('MPESA_CONSUMER_KEY',   default='')
MPESA_CONSUMER_SECRET= config('MPESA_CONSUMER_SECRET', default='')
MPESA_SHORTCODE      = config('MPESA_SHORTCODE',      default='')
MPESA_PASSKEY        = config('MPESA_PASSKEY',         default='')
MPESA_CALLBACK_URL   = config(
    'MPESA_CALLBACK_URL',
    default='https://mkurugenzi.co.ke/api/v1/payments/mpesa/callback/',
)

# ── Email ─────────────────────────────────────────────────────────────────────
EMAIL_BACKEND       = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.console.EmailBackend',
)
EMAIL_HOST          = config('EMAIL_HOST',          default='')
EMAIL_PORT          = config('EMAIL_PORT',          default=587, cast=int)
EMAIL_USE_TLS       = True
EMAIL_HOST_USER     = config('EMAIL_HOST_USER',     default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL  = config('DEFAULT_FROM_EMAIL',  default='noreply@mkurugenzi.co.ke')

# ── Cache (optional — swap default for Redis in production) ───────────────────
CACHES = {
    'default': {
        'BACKEND': config(
            'CACHE_BACKEND',
            default='django.core.cache.backends.locmem.LocMemCache',
        ),
        'LOCATION': config('CACHE_LOCATION', default='mkurugenzi-cache'),
    }
}

# ── Logging ───────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style':  '{',
        },
    },
    'handlers': {
        'console': {
            'class':     'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level':    'INFO',
    },
    'loggers': {
        'django': {
            'handlers':  ['console'],
            'level':     config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}

# ── Production security hardening ─────────────────────────────────────────────
# These are ignored when DEBUG=True so local dev is unaffected.
if not DEBUG:
    SECURE_SSL_REDIRECT              = True
    SECURE_PROXY_SSL_HEADER          = ('HTTP_X_FORWARDED_PROTO', 'https')
    SECURE_HSTS_SECONDS              = 31536000   # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS   = True
    SECURE_HSTS_PRELOAD              = True
    SECURE_CONTENT_TYPE_NOSNIFF      = True
    SECURE_BROWSER_XSS_FILTER        = True
    SESSION_COOKIE_SECURE            = True
    SESSION_COOKIE_HTTPONLY          = True
    CSRF_COOKIE_SECURE               = True
    X_FRAME_OPTIONS                  = 'DENY'
    # Trust Railway / Render / Vercel reverse proxies
    USE_X_FORWARDED_HOST             = True