"""
mkurugenzi/urls.py
Project-level URL configuration for mkurugenzi.co.ke
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from core.sitemaps import ProductSitemap, CategorySitemap, StaticViewSitemap

# ── Sitemaps ──────────────────────────────────────────────────────────────────
sitemaps = {
    'products':   ProductSitemap,
    'categories': CategorySitemap,
    'static':     StaticViewSitemap,
}

urlpatterns = [

    # Admin
    path('admin/', admin.site.urls),

    # All API routes
    path('api/v1/', include('core.urls')),

    # Sitemap for SEO
    path(
        'sitemap.xml',
        sitemap,
        {'sitemaps': sitemaps},
        name='django.contrib.sitemaps.views.sitemap',
    ),
]

# ── Serve media files in development ─────────────────────────────────────────
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# ── Admin branding ────────────────────────────────────────────────────────────
admin.site.site_header  = 'Mkurugenzi Admin'
admin.site.site_title   = 'Mkurugenzi'
admin.site.index_title  = 'Store Management'