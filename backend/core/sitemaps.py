from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from core.models import Product, Category


class ProductSitemap(Sitemap):
    changefreq = 'weekly'
    priority   = 0.8

    def items(self):
        return Product.objects.filter(is_active=True).only('slug', 'updated_at')

    def location(self, obj):
        return f'/product/{obj.slug}'

    def lastmod(self, obj):
        return obj.updated_at


class CategorySitemap(Sitemap):
    changefreq = 'monthly'
    priority   = 0.6

    def items(self):
        return Category.objects.filter(is_active=True).only('slug')

    def location(self, obj):
        return f'/category/{obj.slug}'


class StaticViewSitemap(Sitemap):
    changefreq = 'monthly'
    priority   = 0.5

    def items(self):
        return ['home', 'store']

    def location(self, item):
        routes = {'home': '/', 'store': '/store'}
        return routes[item]