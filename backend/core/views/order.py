from rest_framework import status
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import NotFound, PermissionDenied
from core.models import Order, Coupon
from core.serializers import OrderSerializer, OrderCreateSerializer, CouponSerializer
from core.pagination import StandardPagination


class OrderListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [AllowAny()]   # Guest checkout allowed
        return [IsAuthenticated()]

    def get(self, request):
        """My orders — authenticated users only."""
        orders = (
            Order.objects
            .filter(user=request.user)
            .prefetch_related('items')
            .select_related('town', 'county', 'station')
            .order_by('-created_at')
        )
        page = StandardPagination()
        result = page.paginate_queryset(orders, request)
        return page.get_paginated_response(OrderSerializer(result, many=True).data)

    def post(self, request):
        """Place an order (authenticated or guest)."""
        serializer = OrderCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        order = serializer.save()
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(APIView):
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

        # Auth check: owner or guest with matching email header
        if request.user.is_authenticated:
            if order.user and order.user != request.user:
                if not request.user.is_staff:
                    raise PermissionDenied()
        else:
            # Guest: must supply X-Guest-Email header matching the order
            guest_email = request.headers.get('X-Guest-Email', '')
            if order.guest_email.lower() != guest_email.lower():
                raise PermissionDenied('Order not found.')

        return order

    def get(self, request, order_number):
        order = self._get_order(order_number, request)
        return Response(OrderSerializer(order).data)


class CancelOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, order_number):
        try:
            order = Order.objects.get(order_number=order_number, user=request.user)
        except Order.DoesNotExist:
            raise NotFound('Order not found.')

        if not order.is_cancellable:
            return Response(
                {'detail': 'This order cannot be cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Restore stock
        for item in order.items.all():
            if item.variant:
                item.variant.stock += item.quantity
                item.variant.save(update_fields=['stock'])
            else:
                item.product.stock += item.quantity
                item.product.save(update_fields=['stock'])

        order.status = 'cancelled'
        order.save(update_fields=['status'])
        return Response(OrderSerializer(order).data)


class CouponValidateView(APIView):
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

        discount = float(coupon.calculate_discount(subtotal))
        return Response({
            'valid':         True,
            'discount':      discount,
            'discount_type': coupon.discount_type,
            'value':         float(coupon.value),
            'description':   coupon.description,
        })