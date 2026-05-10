from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from core.models import (
    User, Category, Brand, Product, ProductImage, ProductVariant, Review,
    County, Town, DeliveryStation, HomeDelivery,
    Order, OrderItem, Coupon,
)


# ── User ──────────────────────────────────────────────────────────────────────
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display    = ['email', 'full_name', 'phone', 'is_active', 'is_staff', 'date_joined']
    list_filter     = ['is_active', 'is_staff', 'is_verified']
    search_fields   = ['email', 'full_name', 'phone']
    ordering        = ['-date_joined']
    fieldsets       = (
        (None,           {'fields': ('email', 'password')}),
        ('Personal',     {'fields': ('full_name', 'phone', 'avatar')}),
        ('Delivery',     {'fields': ('default_county', 'default_town', 'default_station', 'default_address')}),
        ('Permissions',  {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified', 'groups', 'user_permissions')}),
        ('Dates',        {'fields': ('date_joined', 'last_login')}),
    )
    add_fieldsets   = (
        (None, {'classes': ('wide',), 'fields': ('email', 'full_name', 'password1', 'password2')}),
    )
    readonly_fields = ['date_joined', 'last_login']


# ── Category ──────────────────────────────────────────────────────────────────
@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'parent', 'is_active', 'sort_order']
    list_filter   = ['is_active', 'parent']
    search_fields = ['name', 'slug']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['is_active', 'sort_order']


# ── Brand ─────────────────────────────────────────────────────────────────────
@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display  = ['name', 'slug', 'is_active']
    search_fields = ['name']
    prepopulated_fields = {'slug': ('name',)}


# ── Product ───────────────────────────────────────────────────────────────────
class ProductImageInline(admin.TabularInline):
    model   = ProductImage
    extra   = 1
    fields  = ['image', 'alt_text', 'is_primary', 'sort_order']

class ProductVariantInline(admin.TabularInline):
    model   = ProductVariant
    extra   = 0
    fields  = ['name', 'value', 'price_adjustment', 'stock', 'sku']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display    = [
        'name', 'slug', 'category', 'brand',
        'price', 'stock', 'is_active', 'is_featured', 'is_flash_deal',
    ]
    list_filter     = ['is_active', 'is_featured', 'is_flash_deal', 'category', 'brand']
    search_fields   = ['name', 'slug', 'sku']
    list_editable   = ['price', 'stock', 'is_active', 'is_featured', 'is_flash_deal']
    prepopulated_fields = {'slug': ('name',)}
    inlines         = [ProductImageInline, ProductVariantInline]
    fieldsets       = (
        ('Core',        {'fields': ('name', 'slug', 'category', 'brand', 'sku')}),
        ('Description', {'fields': ('short_description', 'description', 'tags')}),
        ('Pricing',     {'fields': ('price', 'compare_at_price', 'cost_price')}),
        ('Inventory',   {'fields': ('stock', 'weight_kg')}),
        ('Status',      {'fields': ('is_active', 'is_featured', 'is_flash_deal', 'flash_deal_ends_at')}),
        ('SEO',         {'fields': ('meta_title', 'meta_description')}),
    )
    readonly_fields = ['created_at', 'updated_at']


# ── Review ────────────────────────────────────────────────────────────────────
@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display  = ['product', 'user', 'rating', 'is_verified_purchase', 'created_at']
    list_filter   = ['rating', 'is_verified_purchase']
    search_fields = ['product__name', 'user__email']
    readonly_fields = ['created_at']


# ── Delivery ──────────────────────────────────────────────────────────────────
class TownInline(admin.TabularInline):
    model  = Town
    extra  = 0
    fields = ['name', 'slug', 'has_station_delivery', 'has_home_delivery', 'is_active']
    prepopulated_fields = {'slug': ('name',)}

@admin.register(County)
class CountyAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug']
    search_fields = ['name']
    inlines = [TownInline]
    prepopulated_fields = {'slug': ('name',)}


class StationInline(admin.TabularInline):
    model  = DeliveryStation
    extra  = 0
    fields = ['name', 'fee', 'address', 'operating_hours', 'is_active']

class HomeDeliveryInline(admin.StackedInline):
    model  = HomeDelivery
    extra  = 0

@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display  = ['name', 'county', 'has_station_delivery', 'has_home_delivery', 'is_active']
    list_filter   = ['county', 'is_active', 'has_station_delivery', 'has_home_delivery']
    search_fields = ['name', 'county__name']
    inlines       = [StationInline, HomeDeliveryInline]

@admin.register(DeliveryStation)
class DeliveryStationAdmin(admin.ModelAdmin):
    list_display  = ['name', 'town', 'fee', 'is_active', 'operating_hours']
    list_filter   = ['town__county', 'is_active']
    search_fields = ['name', 'town__name', 'address']
    list_editable = ['fee', 'is_active']


# ── Orders ────────────────────────────────────────────────────────────────────
class OrderItemInline(admin.TabularInline):
    model     = OrderItem
    extra     = 0
    fields    = ['product_name', 'variant_info', 'unit_price', 'quantity', 'subtotal']
    readonly_fields = ['product_name', 'variant_info', 'unit_price', 'subtotal']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display    = [
        'order_number', 'customer_name', 'status', 'payment_status',
        'delivery_type', 'town', 'total', 'created_at',
    ]
    list_filter     = ['status', 'payment_status', 'delivery_type', 'payment_method', 'county']
    search_fields   = ['order_number', 'user__email', 'guest_email', 'payment_ref']
    list_editable   = ['status', 'payment_status']
    readonly_fields = ['order_number', 'subtotal', 'total', 'created_at', 'updated_at']
    inlines         = [OrderItemInline]
    fieldsets       = (
        ('Order',    {'fields': ('order_number', 'user', 'guest_email', 'guest_name', 'guest_phone', 'notes')}),
        ('Status',   {'fields': ('status', 'payment_method', 'payment_status', 'payment_ref')}),
        ('Delivery', {'fields': ('delivery_type', 'county', 'town', 'station', 'home_address')}),
        ('Financials', {'fields': ('subtotal', 'delivery_fee', 'discount', 'total', 'coupon')}),
        ('Dates',    {'fields': ('created_at', 'updated_at')}),
    )

@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display  = ['code', 'discount_type', 'value', 'used_count', 'max_uses', 'expires_at', 'is_active']
    list_editable = ['is_active']
    search_fields = ['code']