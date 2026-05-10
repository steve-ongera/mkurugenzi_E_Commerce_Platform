"""
core/models/product.py
Brand, Product, ProductImage, ProductVariant, Review
"""
from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


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


class Product(models.Model):
    # Core fields
    name             = models.CharField(max_length=255, db_index=True)
    slug             = models.SlugField(max_length=300, unique=True, blank=True)
    category         = models.ForeignKey(
        'core.Category', on_delete=models.PROTECT, related_name='products'
    )
    brand            = models.ForeignKey(
        Brand, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='products'
    )

    # Descriptions
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
                                            help_text='Internal use — not exposed to API')

    # Inventory
    stock             = models.PositiveIntegerField(default=0)
    sku               = models.CharField(max_length=100, unique=True, blank=True)

    # Status & merchandising
    is_active         = models.BooleanField(default=True, db_index=True)
    is_featured       = models.BooleanField(default=False, db_index=True)
    is_flash_deal     = models.BooleanField(default=False, db_index=True)
    flash_deal_ends_at = models.DateTimeField(null=True, blank=True)

    # Physical
    weight_kg         = models.DecimalField(max_digits=6, decimal_places=3,
                                            null=True, blank=True)

    # SEO
    meta_title        = models.CharField(max_length=70, blank=True)
    meta_description  = models.CharField(max_length=160, blank=True)
    tags              = models.CharField(max_length=500, blank=True,
                                         help_text='Comma-separated tags')

    created_at        = models.DateTimeField(auto_now_add=True)
    updated_at        = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_active', 'is_featured']),
            models.Index(fields=['is_active', 'is_flash_deal']),
            models.Index(fields=['category', 'is_active']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug = base
            n = 1
            while Product.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    @property
    def primary_image(self):
        img = self.images.filter(is_primary=True).first()
        if not img:
            img = self.images.first()
        return img

    @property
    def discount_percent(self):
        if self.compare_at_price and self.compare_at_price > self.price:
            pct = (self.compare_at_price - self.price) / self.compare_at_price * 100
            return round(pct)
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
        """Same category, excluding self, active, ordered by featured then created."""
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
    """e.g. Size=XL, Colour=Blue — each has independent stock & price adjustment."""
    product          = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name             = models.CharField(max_length=60, help_text='e.g. Size, Colour')
    value            = models.CharField(max_length=60, help_text='e.g. XL, Blue')
    price_adjustment = models.DecimalField(max_digits=8, decimal_places=2, default=0,
                                            help_text='+ or - added to base price')
    stock            = models.PositiveIntegerField(default=0)
    sku              = models.CharField(max_length=100, blank=True)

    class Meta:
        unique_together = ['product', 'name', 'value']
        ordering = ['name', 'value']

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
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.product.name} ({self.rating}★)'