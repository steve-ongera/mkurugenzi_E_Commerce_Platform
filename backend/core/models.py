"""
core/models.py
mkurugenzi.co.ke — Single models file for the core application.
Models: User, Category, Brand, Product, ProductImage, ProductVariant, Review,
        County, Town, DeliveryStation, HomeDelivery, Order, OrderItem, Coupon
"""
import uuid
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


# ── Helpers ───────────────────────────────────────────────────────────────────

def generate_order_number():
    return f'MKU-{uuid.uuid4().hex[:8].upper()}'


def unique_slug(model_class, base_slug, exclude_pk=None):
    """Return a slug that doesn't already exist in model_class."""
    slug = base_slug
    n = 1
    qs = model_class.objects.all()
    if exclude_pk:
        qs = qs.exclude(pk=exclude_pk)
    while qs.filter(slug=slug).exists():
        slug = f'{base_slug}-{n}'
        n += 1
    return slug


# ─────────────────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────────────────

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required.')
        email = self.normalize_email(email)
        extra.setdefault('is_active', True)
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email           = models.EmailField(unique=True, db_index=True)
    full_name       = models.CharField(max_length=150, blank=True)
    phone           = models.CharField(max_length=20, blank=True)
    avatar          = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active       = models.BooleanField(default=True)
    is_staff        = models.BooleanField(default=False)
    is_verified     = models.BooleanField(default=False)
    date_joined     = models.DateTimeField(default=timezone.now)

    # Saved delivery preferences
    default_county  = models.ForeignKey(
        'County', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    default_town    = models.ForeignKey(
        'Town', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    default_station = models.ForeignKey(
        'DeliveryStation', null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )
    default_address = models.TextField(blank=True)

    objects = UserManager()

    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name        = 'User'
        verbose_name_plural = 'Users'
        ordering            = ['-date_joined']

    def __str__(self):
        return self.email

    @property
    def first_name(self):
        parts = self.full_name.split(' ', 1)
        return parts[0] if parts else ''


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────────────────────────────────────────

class Category(models.Model):
    name             = models.CharField(max_length=120)
    slug             = models.SlugField(max_length=160, unique=True, blank=True)
    parent           = models.ForeignKey(
        'self', null=True, blank=True, on_delete=models.CASCADE, related_name='children'
    )
    description      = models.TextField(blank=True)
    icon             = models.CharField(max_length=80, blank=True,
                                        help_text='Bootstrap icon class e.g. bi-phone')
    image            = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active        = models.BooleanField(default=True)
    sort_order       = models.PositiveSmallIntegerField(default=0)
    meta_title       = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering            = ['sort_order', 'name']

    def __str__(self):
        return f'{self.parent.name} › {self.name}' if self.parent else self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            if self.parent:
                base = f'{self.parent.slug}-{base}'
            self.slug = unique_slug(Category, base)
        super().save(*args, **kwargs)

    def get_ancestors(self):
        ancestors, current = [], self
        while current.parent:
            ancestors.insert(0, current.parent)
            current = current.parent
        return ancestors

    @property
    def full_path(self):
        return ' / '.join([a.name for a in self.get_ancestors()] + [self.name])


# ─────────────────────────────────────────────────────────────────────────────
# BRAND
# ─────────────────────────────────────────────────────────────────────────────

class Brand(models.Model):
    name      = models.CharField(max_length=100, unique=True)
    slug      = models.SlugField(max_length=120, unique=True, blank=True)
    logo      = models.ImageField(upload_to='brands/', blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT
# ─────────────────────────────────────────────────────────────────────────────

class Product(models.Model):
    name              = models.CharField(max_length=255, db_index=True)
    slug              = models.SlugField(max_length=300, unique=True, blank=True)
    category          = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    brand             = models.ForeignKey(
        Brand, null=True, blank=True, on_delete=models.SET_NULL, related_name='products'
    )
    short_description = models.CharField(max_length=300, blank=True)
    description       = models.TextField(blank=True)

    # Pricing
    price             = models.DecimalField(max_digits=10, decimal_places=2,
                                            validators=[MinValueValidator(0)])
    compare_at_price  = models.DecimalField(max_digits=10, decimal_places=2,
                                            null=True, blank=True,
                                            validators=[MinValueValidator(0)],
                                            help_text='Struck-through "was" price')
    cost_price        = models.DecimalField(max_digits=10, decimal_places=2,
                                            null=True, blank=True,
                                            validators=[MinValueValidator(0)],
                                            help_text='Internal — never exposed to API')

    # Inventory
    stock             = models.PositiveIntegerField(default=0)
    sku               = models.CharField(max_length=100, unique=True, blank=True)

    # Status & merchandising
    is_active         = models.BooleanField(default=True, db_index=True)
    is_featured       = models.BooleanField(default=False, db_index=True)
    is_flash_deal     = models.BooleanField(default=False, db_index=True)
    flash_deal_ends_at = models.DateTimeField(null=True, blank=True)

    # Physical
    weight_kg         = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)

    # SEO
    meta_title        = models.CharField(max_length=70, blank=True)
    meta_description  = models.CharField(max_length=160, blank=True)
    tags              = models.CharField(max_length=500, blank=True,
                                         help_text='Comma-separated tags')

    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['is_active', 'is_featured']),
            models.Index(fields=['is_active', 'is_flash_deal']),
            models.Index(fields=['category', 'is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Product, slugify(self.name), exclude_pk=self.pk)
        super().save(*args, **kwargs)

    @property
    def primary_image(self):
        return self.images.filter(is_primary=True).first() or self.images.first()

    @property
    def discount_percent(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            return round((self.compare_at_price - self.price) / self.compare_at_price * 100)
        return None

    @property
    def in_stock(self):
        return self.stock > 0

    @property
    def average_rating(self):
        agg = self.reviews.aggregate(avg=models.Avg('rating'))
        return round(agg['avg'] or 0, 1)

    @property
    def review_count(self):
        return self.reviews.count()

    @property
    def tag_list(self):
        return [t.strip() for t in self.tags.split(',') if t.strip()]

    def get_related_products(self, limit=8):
        return (
            Product.objects
            .filter(category=self.category, is_active=True)
            .exclude(pk=self.pk)
            .order_by('-is_featured', '-created_at')[:limit]
        )


class ProductImage(models.Model):
    product    = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image      = models.ImageField(upload_to='products/')
    alt_text   = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['-is_primary', 'sort_order']

    def __str__(self):
        return f'{self.product.name} — image {self.pk}'


class ProductVariant(models.Model):
    """e.g. Size=XL, Colour=Blue — each variant has its own stock and price adjustment."""
    product          = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name             = models.CharField(max_length=60, help_text='e.g. Size, Colour')
    value            = models.CharField(max_length=60, help_text='e.g. XL, Blue')
    price_adjustment = models.DecimalField(max_digits=8, decimal_places=2, default=0,
                                            help_text='Added to (or subtracted from) base price')
    stock            = models.PositiveIntegerField(default=0)
    sku              = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ['product', 'name', 'value']
        ordering        = ['name', 'value']

    def __str__(self):
        return f'{self.product.name} — {self.name}: {self.value}'

    @property
    def final_price(self):
        return self.product.price + self.price_adjustment


class Review(models.Model):
    product              = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user                 = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reviews'
    )
    rating               = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    title                = models.CharField(max_length=120, blank=True)
    body                 = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    created_at           = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['product', 'user']
        ordering        = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.product.name} ({self.rating}★)'


# ─────────────────────────────────────────────────────────────────────────────
# DELIVERY
# ─────────────────────────────────────────────────────────────────────────────

class County(models.Model):
    """Kenya has 47 counties."""
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name_plural = 'Counties'
        ordering            = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Town(models.Model):
    county               = models.ForeignKey(County, on_delete=models.CASCADE, related_name='towns')
    name                 = models.CharField(max_length=100)
    slug                 = models.SlugField(max_length=140, unique=True, blank=True)
    has_station_delivery = models.BooleanField(default=True)
    has_home_delivery    = models.BooleanField(default=True)
    is_active            = models.BooleanField(default=True)

    class Meta:
        unique_together = ['county', 'name']
        ordering        = ['name']

    def __str__(self):
        return f'{self.name}, {self.county.name}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(Town, slugify(f'{self.county.name}-{self.name}'))
        super().save(*args, **kwargs)


class DeliveryStation(models.Model):
    """
    Physical pick-up station. Each station carries its own delivery fee.

    Example — Mombasa:
        Nyali Station       KES 149
        Likoni Station      KES 179
        Changamwe Station   KES 149
        Bamburi Station     KES 149
        Mtwapa Station      KES 199
    """
    town            = models.ForeignKey(Town, on_delete=models.CASCADE, related_name='stations')
    name            = models.CharField(max_length=150)
    slug            = models.SlugField(max_length=200, unique=True, blank=True)
    address         = models.TextField(blank=True)
    latitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude       = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    fee             = models.DecimalField(max_digits=8, decimal_places=2,
                                          validators=[MinValueValidator(0)],
                                          help_text='Delivery fee in KES for this station')
    is_active       = models.BooleanField(default=True)
    operating_hours = models.CharField(max_length=200, blank=True,
                                        help_text='e.g. Mon–Sat 8 am–6 pm')
    contact_phone   = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ['town', 'fee', 'name']

    def __str__(self):
        return f'{self.name} ({self.town.name}) — KES {self.fee}'

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(DeliveryStation, slugify(f'{self.town.slug}-{self.name}'))
        super().save(*args, **kwargs)


class HomeDelivery(models.Model):
    """
    Door-step delivery pricing — one record per town.
    The fee covers delivery to any address within that town.
    """
    town      = models.OneToOneField(Town, on_delete=models.CASCADE, related_name='home_delivery')
    fee       = models.DecimalField(max_digits=8, decimal_places=2,
                                     validators=[MinValueValidator(0)],
                                     help_text='Home delivery fee in KES')
    min_days  = models.PositiveSmallIntegerField(default=1)
    max_days  = models.PositiveSmallIntegerField(default=3)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Home Deliveries'

    def __str__(self):
        return f'Home — {self.town.name} — KES {self.fee} ({self.eta_display})'

    @property
    def eta_display(self):
        if self.min_days == self.max_days:
            return f'{self.min_days} day{"s" if self.min_days > 1 else ""}'
        return f'{self.min_days}–{self.max_days} days'


# ─────────────────────────────────────────────────────────────────────────────
# COUPON
# ─────────────────────────────────────────────────────────────────────────────

class Coupon(models.Model):
    PERCENT = 'percent'
    FIXED   = 'fixed'
    DISCOUNT_TYPE_CHOICES = [(PERCENT, 'Percentage'), (FIXED, 'Fixed Amount (KES)')]

    code             = models.CharField(max_length=30, unique=True, db_index=True)
    description      = models.CharField(max_length=200, blank=True)
    discount_type    = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default=PERCENT)
    value            = models.DecimalField(max_digits=8, decimal_places=2,
                                            validators=[MinValueValidator(0)])
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                            validators=[MinValueValidator(0)])
    max_uses         = models.PositiveIntegerField(default=0, help_text='0 = unlimited')
    used_count       = models.PositiveIntegerField(default=0)
    expires_at       = models.DateTimeField(null=True, blank=True)
    is_active        = models.BooleanField(default=True)
    created_at       = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.code} ({self.discount_type}: {self.value})'

    def is_valid(self, cart_total):
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
        if self.discount_type == self.PERCENT:
            return round(subtotal * self.value / 100, 2)
        return min(self.value, subtotal)


# ─────────────────────────────────────────────────────────────────────────────
# ORDER
# ─────────────────────────────────────────────────────────────────────────────

class Order(models.Model):
    # Status
    PENDING          = 'pending'
    CONFIRMED        = 'confirmed'
    PROCESSING       = 'processing'
    SHIPPED          = 'shipped'
    OUT_FOR_DELIVERY = 'out_for_delivery'
    DELIVERED        = 'delivered'
    CANCELLED        = 'cancelled'
    REFUNDED         = 'refunded'
    STATUS_CHOICES = [
        (PENDING,          'Pending Payment'),
        (CONFIRMED,        'Order Confirmed'),
        (PROCESSING,       'Processing'),
        (SHIPPED,          'Shipped'),
        (OUT_FOR_DELIVERY, 'Out for Delivery'),
        (DELIVERED,        'Delivered'),
        (CANCELLED,        'Cancelled'),
        (REFUNDED,         'Refunded'),
    ]

    # Delivery type
    STATION = 'station'
    HOME    = 'home'
    DELIVERY_TYPE_CHOICES = [(STATION, 'Pick-up Station'), (HOME, 'Home Delivery')]

    # Payment method
    MPESA = 'mpesa'
    CARD  = 'card'
    COD   = 'cod'
    PAYMENT_METHOD_CHOICES = [(MPESA, 'M-Pesa'), (CARD, 'Card'), (COD, 'Cash on Delivery')]

    # Payment status
    PAY_PENDING  = 'pending'
    PAY_PAID     = 'paid'
    PAY_FAILED   = 'failed'
    PAY_REFUNDED = 'refunded'
    PAYMENT_STATUS_CHOICES = [
        (PAY_PENDING,  'Pending'),
        (PAY_PAID,     'Paid'),
        (PAY_FAILED,   'Failed'),
        (PAY_REFUNDED, 'Refunded'),
    ]

    # Identity
    order_number  = models.CharField(max_length=20, unique=True, db_index=True,
                                      default=generate_order_number)
    user          = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='orders'
    )
    # Guest checkout
    guest_email   = models.EmailField(blank=True)
    guest_name    = models.CharField(max_length=150, blank=True)
    guest_phone   = models.CharField(max_length=30, blank=True)

    # Status & delivery
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES,
                                      default=PENDING, db_index=True)
    delivery_type = models.CharField(max_length=10, choices=DELIVERY_TYPE_CHOICES)
    county        = models.ForeignKey(County, on_delete=models.PROTECT, related_name='orders')
    town          = models.ForeignKey(Town, on_delete=models.PROTECT, related_name='orders')
    station       = models.ForeignKey(
        DeliveryStation, null=True, blank=True, on_delete=models.PROTECT, related_name='orders'
    )
    home_address  = models.TextField(blank=True)

    # Financials
    subtotal      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee  = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    discount      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total         = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    coupon        = models.ForeignKey(
        Coupon, null=True, blank=True, on_delete=models.SET_NULL, related_name='orders'
    )

    # Payment
    payment_method  = models.CharField(max_length=10, choices=PAYMENT_METHOD_CHOICES, default=MPESA)
    payment_status  = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES,
                                        default=PAY_PENDING)
    payment_ref     = models.CharField(max_length=100, blank=True,
                                        help_text='M-Pesa receipt or Stripe charge ID')
    mpesa_phone     = models.CharField(max_length=20, blank=True)

    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.order_number} — {self.get_status_display()}'

    def save(self, *args, **kwargs):
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
        return self.status in (self.PENDING, self.CONFIRMED)

    @property
    def tracking_steps(self):
        steps = [
            (self.PENDING,          'Order Placed'),
            (self.CONFIRMED,        'Confirmed'),
            (self.PROCESSING,       'Processing'),
            (self.SHIPPED,          'Shipped'),
            (self.OUT_FOR_DELIVERY, 'Out for Delivery'),
            (self.DELIVERED,        'Delivered'),
        ]
        keys = [s[0] for s in steps]
        current_idx = keys.index(self.status) if self.status in keys else -1
        return [
            {
                'key':       key,
                'label':     label,
                'completed': i <= current_idx,
                'active':    i == current_idx,
            }
            for i, (key, label) in enumerate(steps)
        ]


class OrderItem(models.Model):
    order         = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product       = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='order_items')
    variant       = models.ForeignKey(
        ProductVariant, null=True, blank=True,
        on_delete=models.PROTECT, related_name='order_items'
    )
    # Price snapshots — frozen at time of order
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