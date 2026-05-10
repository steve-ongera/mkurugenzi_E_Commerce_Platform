"""
core/models/order.py
Order, OrderItem, Coupon
"""
import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator


def generate_order_number():
    """MKU-XXXXXXXX — 8 uppercase hex chars."""
    return f'MKU-{uuid.uuid4().hex[:8].upper()}'


class Coupon(models.Model):
    DISCOUNT_TYPE_CHOICES = [
        ('percent', 'Percentage'),
        ('fixed', 'Fixed Amount (KES)'),
    ]

    code              = models.CharField(max_length=30, unique=True, db_index=True)
    description       = models.CharField(max_length=200, blank=True)
    discount_type     = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='percent')
    value             = models.DecimalField(max_digits=8, decimal_places=2,
                                             validators=[MinValueValidator(0)])
    min_order_amount  = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                             validators=[MinValueValidator(0)])
    max_uses          = models.PositiveIntegerField(default=0, help_text='0 = unlimited')
    used_count        = models.PositiveIntegerField(default=0)
    expires_at        = models.DateTimeField(null=True, blank=True)
    is_active         = models.BooleanField(default=True)
    created_at        = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} ({self.discount_type}: {self.value})'

    def is_valid(self, cart_total):
        from django.utils import timezone
        if not self.is_active:
            return False, 'Coupon is not active.'
        if self.expires_at and timezone.now() > self.expires_at:
            return False, 'Coupon has expired.'
        if self.max_uses and self.used_count >= self.max_uses:
            return False, 'Coupon usage limit reached.'
        if cart_total < self.min_order_amount:
            return False, f'Minimum order amount is KES {self.min_order_amount}.'
        return True, 'Valid'

    def calculate_discount(self, subtotal):
        if self.discount_type == 'percent':
            return round(subtotal * self.value / 100, 2)
        return min(self.value, subtotal)


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending',           'Pending Payment'),
        ('confirmed',         'Order Confirmed'),
        ('processing',        'Processing'),
        ('shipped',           'Shipped'),
        ('out_for_delivery',  'Out for Delivery'),
        ('delivered',         'Delivered'),
        ('cancelled',         'Cancelled'),
        ('refunded',          'Refunded'),
    ]

    DELIVERY_TYPE_CHOICES = [
        ('station', 'Pick-up Station'),
        ('home',    'Home Delivery'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('card',  'Card'),
        ('cod',   'Cash on Delivery'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending',  'Pending'),
        ('paid',     'Paid'),
        ('failed',   'Failed'),
        ('refunded', 'Refunded'),
    ]

    # Identity
    order_number  = models.CharField(max_length=20, unique=True, db_index=True,
                                      default=generate_order_number)
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders'
    )
    # Guest checkout support
    guest_email   = models.EmailField(blank=True)
    guest_name    = models.CharField(max_length=150, blank=True)
    guest_phone   = models.CharField(max_length=30, blank=True)

    # Status
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES,
                                      default='pending', db_index=True)

    # Delivery
    delivery_type = models.CharField(max_length=10, choices=DELIVERY_TYPE_CHOICES)
    county        = models.ForeignKey('core.County', on_delete=models.PROTECT,
                                      related_name='orders')
    town          = models.ForeignKey('core.Town', on_delete=models.PROTECT,
                                       related_name='orders')
    station       = models.ForeignKey('core.DeliveryStation', null=True, blank=True,
                                       on_delete=models.PROTECT, related_name='orders')
    home_address  = models.TextField(blank=True,
                                      help_text='Full address for home delivery')

    # Financials
    subtotal      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee  = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    discount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coupon        = models.ForeignKey(Coupon, null=True, blank=True,
                                       on_delete=models.SET_NULL, related_name='orders')

    # Payment
    payment_method  = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default='mpesa')
    payment_status  = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_ref     = models.CharField(max_length=100, blank=True,
                                        help_text='M-Pesa receipt or Stripe charge ID')
    mpesa_phone     = models.CharField(max_length=20, blank=True,
                                        help_text='Phone used for M-Pesa STK push')

    # Meta
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} — {self.get_status_display()}'

    def save(self, *args, **kwargs):
        # Auto-compute total
        self.total = self.subtotal + self.delivery_fee - self.discount
        super().save(*args, **kwargs)

    @property
    def customer_name(self):
        if self.user:
            return self.user.full_name or self.user.email
        return self.guest_name or self.guest_email

    @property
    def customer_email(self):
        return self.user.email if self.user else self.guest_email

    @property
    def is_cancellable(self):
        return self.status in ('pending', 'confirmed')

    @property
    def tracking_steps(self):
        """Ordered status steps for the order tracker UI."""
        steps = [
            'pending', 'confirmed', 'processing',
            'shipped', 'out_for_delivery', 'delivered',
        ]
        labels = {
            'pending':          'Order Placed',
            'confirmed':        'Confirmed',
            'processing':       'Processing',
            'shipped':          'Shipped',
            'out_for_delivery': 'Out for Delivery',
            'delivered':        'Delivered',
        }
        current_idx = steps.index(self.status) if self.status in steps else -1
        return [
            {
                'key':       s,
                'label':     labels[s],
                'completed': i <= current_idx,
                'active':    i == current_idx,
            }
            for i, s in enumerate(steps)
        ]


class OrderItem(models.Model):
    order         = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product       = models.ForeignKey('core.Product', on_delete=models.PROTECT,
                                       related_name='order_items')
    variant       = models.ForeignKey('core.ProductVariant', null=True, blank=True,
                                       on_delete=models.PROTECT, related_name='order_items')

    # Snapshots — prices frozen at time of order
    product_name  = models.CharField(max_length=255)
    product_slug  = models.CharField(max_length=300)
    product_image = models.URLField(blank=True)
    variant_info  = models.CharField(max_length=120, blank=True,
                                      help_text='e.g. "Size: XL, Colour: Blue"')
    unit_price    = models.DecimalField(max_digits=10, decimal_places=2)
    quantity      = models.PositiveSmallIntegerField(default=1)
    subtotal      = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        ordering = ['pk']

    def __str__(self):
        return f'{self.order.order_number} — {self.product_name} x{self.quantity}'

    def save(self, *args, **kwargs):
        self.subtotal = self.unit_price * self.quantity
        super().save(*args, **kwargs)