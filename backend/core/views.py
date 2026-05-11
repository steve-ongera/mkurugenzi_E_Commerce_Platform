"""
core/views.py
mkurugenzi.co.ke — Single views file for the core application.

Auth, User, Categories, Products, Delivery, Orders, Payments (M-Pesa Daraja)
"""
import base64
import requests
from datetime import datetime

from django.conf import settings
from django.db.models import Q
from django.contrib.auth import authenticate

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, CreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import NotFound, PermissionDenied

from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView  # re-exported via urls.py

from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters

from core.models import (
    User, Category, Brand, Product, Review,
    County, Town, DeliveryStation, HomeDelivery,
    Order, OrderItem, Coupon,
)
from core.serializers import (
    UserSerializer, RegisterSerializer, ChangePasswordSerializer,
    CategorySerializer, CategoryTreeSerializer,
    BrandSerializer, ProductListSerializer, ProductDetailSerializer, ReviewSerializer,
    CountySerializer, TownSerializer, DeliveryStationSerializer, HomeDeliverySerializer,
    OrderSerializer, OrderCreateSerializer, CouponSerializer,
)
from core.pagination import StandardPagination


# ─────────────────────────────────────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────────────────────────────────────

class RegisterView(APIView):
    """POST /api/v1/auth/register/ — Create account and return JWT pair."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user    = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user':    UserSerializer(user).data,
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/v1/auth/login/ — Authenticate with email + password, return JWT pair."""
    permission_classes = [AllowAny]

    def post(self, request):
        email    = request.data.get('email', '').lower().strip()
        password = request.data.get('password', '')
        user     = authenticate(request, username=email, password=password)

        if not user:
            return Response(
                {'detail': 'Invalid email or password.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {'detail': 'Account is inactive. Please contact support.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user':    UserSerializer(user).data,
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
        })


class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — Blacklist the refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            RefreshToken(request.data.get('refresh')).blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out successfully.'})


# ─────────────────────────────────────────────────────────────────────────────
# USER / PROFILE
# ─────────────────────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """GET / PATCH /api/v1/profile/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """POST /api/v1/profile/password/"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password updated successfully.'})


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORIES
# ─────────────────────────────────────────────────────────────────────────────

class CategoryListView(APIView):
    """GET /api/v1/categories/ — Full category tree (root → children)."""
    permission_classes = [AllowAny]

    def get(self, request):
        roots = Category.objects.filter(parent=None, is_active=True).order_by('sort_order', 'name')
        return Response(CategoryTreeSerializer(roots, many=True).data)


class CategoryDetailView(APIView):
    """GET /api/v1/categories/<slug>/"""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            category = Category.objects.get(slug=slug, is_active=True)
        except Category.DoesNotExist:
            raise NotFound('Category not found.')
        return Response(CategorySerializer(category).data)


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCTS
# ─────────────────────────────────────────────────────────────────────────────

class ProductFilter(filters.FilterSet):
    category   = filters.CharFilter(field_name='category__slug')
    brand      = filters.CharFilter(field_name='brand__slug')
    min_price  = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price  = filters.NumberFilter(field_name='price', lookup_expr='lte')
    in_stock   = filters.BooleanFilter(method='filter_in_stock')
    is_featured = filters.BooleanFilter(field_name='is_featured')
    flash_deal  = filters.BooleanFilter(field_name='is_flash_deal')

    class Meta:
        model  = Product
        fields = ['category', 'brand', 'min_price', 'max_price',
                  'in_stock', 'is_featured', 'flash_deal']

    def filter_in_stock(self, queryset, name, value):
        return queryset.filter(stock__gt=0) if value else queryset


class ProductListView(ListAPIView):
    """
    GET /api/v1/products/
    Filters: category, brand, min_price, max_price, in_stock,
             is_featured, flash_deal, search, ordering, page
    """
    permission_classes = [AllowAny]
    serializer_class   = ProductListSerializer
    pagination_class   = StandardPagination
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class    = ProductFilter
    search_fields      = ['name', 'short_description', 'tags', 'sku', 'brand__name', 'category__name']
    ordering_fields    = ['price', 'created_at', 'name']
    ordering           = ['-created_at']

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category', 'brand')
            .prefetch_related('images')
        )


class ProductDetailView(APIView):
    """GET /api/v1/products/<slug>/"""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = (
                Product.objects
                .filter(is_active=True)
                .select_related('category', 'brand')
                .prefetch_related('images', 'variants', 'reviews__user')
                .get(slug=slug)
            )
        except Product.DoesNotExist:
            raise NotFound('Product not found.')
        return Response(ProductDetailSerializer(product).data)


class ProductRelatedView(APIView):
    """GET /api/v1/products/<slug>/related/"""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist:
            raise NotFound('Product not found.')
        related = product.get_related_products(limit=8)
        return Response(ProductListSerializer(related, many=True).data)


class FlashDealListView(ListAPIView):
    """GET /api/v1/products/flash-deals/ — Active flash deals, soonest-expiring first."""
    permission_classes = [AllowAny]
    serializer_class   = ProductListSerializer
    pagination_class   = None

    def get_queryset(self):
        from django.utils import timezone
        return (
            Product.objects
            .filter(is_active=True, is_flash_deal=True, flash_deal_ends_at__gt=timezone.now())
            .select_related('category', 'brand')
            .prefetch_related('images')
            .order_by('flash_deal_ends_at')[:20]
        )


class ReviewCreateView(CreateAPIView):
    """POST /api/v1/reviews/"""
    permission_classes = [IsAuthenticated]
    serializer_class   = ReviewSerializer


class BrandListView(ListAPIView):
    """GET /api/v1/brands/"""
    permission_classes = [AllowAny]
    serializer_class   = BrandSerializer
    queryset           = Brand.objects.filter(is_active=True).order_by('name')
    pagination_class   = None


# ─────────────────────────────────────────────────────────────────────────────
# DELIVERY
# ─────────────────────────────────────────────────────────────────────────────

class CountyListView(APIView):
    """GET /api/v1/delivery/counties/ — All counties with their active towns."""
    permission_classes = [AllowAny]

    def get(self, request):
        counties = County.objects.prefetch_related('towns').order_by('name')
        return Response(CountySerializer(counties, many=True).data)


class TownDetailView(APIView):
    """GET /api/v1/delivery/towns/<slug>/ — Town with all stations + home delivery."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            town = (
                Town.objects
                .select_related('county')
                .prefetch_related('stations', 'home_delivery')
                .get(slug=slug, is_active=True)
            )
        except Town.DoesNotExist:
            raise NotFound('Town not found.')
        return Response(TownSerializer(town).data)


class StationListView(APIView):
    """GET /api/v1/delivery/stations/<town_slug>/ — All active stations for a town."""
    permission_classes = [AllowAny]

    def get(self, request, town_slug):
        stations = (
            DeliveryStation.objects
            .filter(town__slug=town_slug, is_active=True)
            .select_related('town__county')
            .order_by('fee', 'name')
        )
        return Response(DeliveryStationSerializer(stations, many=True).data)


class HomeDeliveryDetailView(APIView):
    """GET /api/v1/delivery/home/<town_slug>/ — Home delivery fee + ETA for a town."""
    permission_classes = [AllowAny]

    def get(self, request, town_slug):
        try:
            hd = HomeDelivery.objects.select_related('town__county').get(
                town__slug=town_slug, is_active=True
            )
        except HomeDelivery.DoesNotExist:
            raise NotFound('Home delivery not available for this town.')
        return Response(HomeDeliverySerializer(hd).data)


# ─────────────────────────────────────────────────────────────────────────────
# ORDERS
# ─────────────────────────────────────────────────────────────────────────────

class OrderListCreateView(APIView):
    """
    GET  /api/v1/orders/ — My order history (auth required)
    POST /api/v1/orders/ — Place an order (auth or guest)
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request):
        orders = (
            Order.objects
            .filter(user=request.user)
            .prefetch_related('items')
            .select_related('town', 'county', 'station')
            .order_by('-created_at')
        )
        paginator = StandardPagination()
        page      = paginator.paginate_queryset(orders, request)
        return paginator.get_paginated_response(OrderSerializer(page, many=True).data)

    def post(self, request):
        serializer = OrderCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
    """GET /api/v1/orders/<order_number>/ — Auth users or guests (X-Guest-Email header)."""
    permission_classes = [AllowAny]

    def _get_order(self, order_number, request):
        try:
            order = (
                Order.objects
                .prefetch_related('items')
                .select_related('town', 'county', 'station')
                .get(order_number=order_number)
            )
        except Order.DoesNotExist:
            raise NotFound('Order not found.')

        if request.user.is_authenticated:
            if order.user and order.user != request.user and not request.user.is_staff:
                raise PermissionDenied()
        else:
            guest_email = request.headers.get('X-Guest-Email', '')
            if order.guest_email.lower() != guest_email.lower():
                raise PermissionDenied('Order not found.')

        return order

    def get(self, request, order_number):
        return Response(OrderSerializer(self._get_order(order_number, request)).data)


class CancelOrderView(APIView):
    """POST /api/v1/orders/<order_number>/cancel/"""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise NotFound('Order not found.')

        if not order.is_cancellable:
            return Response(
                {'detail': 'This order cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Restore stock
        for item in order.items.select_related('product', 'variant').all():
            if item.variant:
                item.variant.stock += item.quantity
                item.variant.save(update_fields=['stock'])
            else:
                item.product.stock += item.quantity
                item.product.save(update_fields=['stock'])

        order.status = Order.CANCELLED
        order.save(update_fields=['status'])
        return Response(OrderSerializer(order).data)


class CouponValidateView(APIView):
    """POST /api/v1/coupons/validate/ — Body: { code, subtotal }"""
    permission_classes = [AllowAny]

    def post(self, request):
        code     = request.data.get('code', '').upper().strip()
        subtotal = float(request.data.get('subtotal', 0))

        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
        except Coupon.DoesNotExist:
            return Response({'valid': False, 'detail': 'Invalid coupon code.'})

        valid, msg = coupon.is_valid(subtotal)
        if not valid:
            return Response({'valid': False, 'detail': msg})

        return Response({
            'valid':         True,
            'discount':      float(coupon.calculate_discount(subtotal)),
            'discount_type': coupon.discount_type,
            'value':         float(coupon.value),
            'description':   coupon.description,
        })


# ─────────────────────────────────────────────────────────────────────────────
# PAYMENTS — M-Pesa Daraja STK Push
# ─────────────────────────────────────────────────────────────────────────────

def _mpesa_token():
    """Fetch Daraja OAuth bearer token."""
    env      = settings.MPESA_ENVIRONMENT
    base_url = (
        'https://sandbox.safaricom.co.ke'
        if env == 'sandbox'
        else 'https://api.safaricom.co.ke'
    )
    creds = base64.b64encode(
        f'{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}'.encode()
    ).decode()
    resp = requests.get(
        f'{base_url}/oauth/v1/generate?grant_type=client_credentials',
        headers={'Authorization': f'Basic {creds}'},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()['access_token'], base_url


def _mpesa_password(shortcode, passkey, timestamp):
    return base64.b64encode(f'{shortcode}{passkey}{timestamp}'.encode()).decode()


class MpesaInitiateView(APIView):
    """
    POST /api/v1/payments/mpesa/initiate/
    Body: { order_number, phone }
    Triggers STK push; customer enters PIN on their phone.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        order_number = request.data.get('order_number', '').strip()
        phone        = request.data.get('phone', '').strip()

        # Normalise: 0712… → 254712…
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+'):
            phone = phone[1:]

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)

        if order.payment_status == Order.PAY_PAID:
            return Response({'detail': 'Order is already paid.'}, status=400)

        try:
            token, base_url = _mpesa_token()
            ts       = datetime.now().strftime('%Y%m%d%H%M%S')
            password = _mpesa_password(settings.MPESA_SHORTCODE, settings.MPESA_PASSKEY, ts)

            payload = {
                'BusinessShortCode': settings.MPESA_SHORTCODE,
                'Password':          password,
                'Timestamp':         ts,
                'TransactionType':   'CustomerPayBillOnline',
                'Amount':            int(order.total),
                'PartyA':            phone,
                'PartyB':            settings.MPESA_SHORTCODE,
                'PhoneNumber':       phone,
                'CallBackURL':       settings.MPESA_CALLBACK_URL,
                'AccountReference':  order_number,
                'TransactionDesc':   f'Payment for {order_number} — Mkurugenzi',
            }

            resp = requests.post(
                f'{base_url}/mpesa/stkpush/v1/processrequest',
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            data = resp.json()

            if data.get('ResponseCode') == '0':
                order.payment_ref = data.get('CheckoutRequestID', '')
                order.mpesa_phone = phone
                order.save(update_fields=['payment_ref', 'mpesa_phone'])
                return Response({
                    'detail':              'STK push sent. Please enter your M-Pesa PIN.',
                    'checkout_request_id': data.get('CheckoutRequestID'),
                })

            return Response(
                {'detail': data.get('errorMessage', 'M-Pesa request failed.')},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        except Exception as exc:
            return Response(
                {'detail': f'Payment initiation failed: {exc}'},
                status=status.HTTP_502_BAD_GATEWAY,
            )


class MpesaCallbackView(APIView):
    """
    POST /api/v1/payments/mpesa/callback/
    Receives Daraja STK push result — updates order payment status.
    Always returns 200 (Daraja retries on non-200).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            stk         = request.data['Body']['stkCallback']
            result_code = stk['ResultCode']
            checkout_id = stk['CheckoutRequestID']

            order = Order.objects.filter(payment_ref=checkout_id).first()
            if order:
                if result_code == 0:
                    items   = stk.get('CallbackMetadata', {}).get('Item', [])
                    receipt = next(
                        (i['Value'] for i in items if i['Name'] == 'MpesaReceiptNumber'), ''
                    )
                    order.payment_status = Order.PAY_PAID
                    order.status         = Order.CONFIRMED
                    order.payment_ref    = receipt
                else:
                    order.payment_status = Order.PAY_FAILED
                order.save(update_fields=['payment_status', 'status', 'payment_ref'])
        except Exception:
            pass  # Never surface errors to Daraja

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})