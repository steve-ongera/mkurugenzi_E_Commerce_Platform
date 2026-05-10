"""
core/urls.py
All API routes under /api/v1/
"""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from core.views import (
    # Auth
    RegisterView, LoginView, LogoutView,
    # User
    ProfileView, ChangePasswordView,
    # Categories
    CategoryListView, CategoryDetailView,
    # Products
    ProductListView, ProductDetailView, ProductRelatedView,
    ReviewCreateView, BrandListView, FlashDealListView,
    # Delivery
    CountyListView, TownDetailView, StationListView, HomeDeliveryDetailView,
    # Orders
    OrderListCreateView, OrderDetailView, CouponValidateView, CancelOrderView,
    # Payments
    MpesaInitiateView, MpesaCallbackView,
)

urlpatterns = [
    # ── Auth ─────────────────────────────────────────────────────────────────
    path('auth/register/',      RegisterView.as_view(),       name='auth-register'),
    path('auth/login/',         LoginView.as_view(),          name='auth-login'),
    path('auth/logout/',        LogoutView.as_view(),         name='auth-logout'),
    path('auth/token/refresh/', TokenRefreshView.as_view(),   name='auth-token-refresh'),

    # ── Profile ───────────────────────────────────────────────────────────────
    path('profile/',            ProfileView.as_view(),        name='profile'),
    path('profile/password/',   ChangePasswordView.as_view(), name='profile-password'),

    # ── Categories ────────────────────────────────────────────────────────────
    path('categories/',         CategoryListView.as_view(),   name='category-list'),
    path('categories/<slug:slug>/', CategoryDetailView.as_view(), name='category-detail'),

    # ── Products ──────────────────────────────────────────────────────────────
    path('products/',           ProductListView.as_view(),    name='product-list'),
    path('products/flash-deals/', FlashDealListView.as_view(), name='flash-deals'),
    path('products/<slug:slug>/', ProductDetailView.as_view(), name='product-detail'),
    path('products/<slug:slug>/related/', ProductRelatedView.as_view(), name='product-related'),

    # ── Reviews ───────────────────────────────────────────────────────────────
    path('reviews/',            ReviewCreateView.as_view(),   name='review-create'),

    # ── Brands ───────────────────────────────────────────────────────────────
    path('brands/',             BrandListView.as_view(),      name='brand-list'),

    # ── Delivery ─────────────────────────────────────────────────────────────
    path('delivery/counties/',  CountyListView.as_view(),     name='county-list'),
    path('delivery/towns/<slug:slug>/', TownDetailView.as_view(), name='town-detail'),
    path('delivery/stations/<slug:town_slug>/', StationListView.as_view(), name='station-list'),
    path('delivery/home/<slug:town_slug>/', HomeDeliveryDetailView.as_view(), name='home-delivery'),

    # ── Orders ───────────────────────────────────────────────────────────────
    path('orders/',             OrderListCreateView.as_view(), name='order-list-create'),
    path('orders/<str:order_number>/', OrderDetailView.as_view(), name='order-detail'),
    path('orders/<str:order_number>/cancel/', CancelOrderView.as_view(), name='order-cancel'),

    # ── Coupons ───────────────────────────────────────────────────────────────
    path('coupons/validate/',   CouponValidateView.as_view(), name='coupon-validate'),

    # ── Payments ─────────────────────────────────────────────────────────────
    path('payments/mpesa/initiate/',  MpesaInitiateView.as_view(),  name='mpesa-initiate'),
    path('payments/mpesa/callback/',  MpesaCallbackView.as_view(),  name='mpesa-callback'),
]