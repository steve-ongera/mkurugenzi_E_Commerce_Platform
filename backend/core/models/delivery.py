"""
core/models/delivery.py
Jumia-style delivery model:
  County → Town → DeliveryStation (each station has its own fee)
                → HomeDelivery (one fee per town)
"""
from django.db import models
from django.utils.text import slugify
from django.core.validators import MinValueValidator


class County(models.Model):
    """Kenya has 47 counties."""
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)

    class Meta:
        verbose_name_plural = 'Counties'
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Town(models.Model):
    county                = models.ForeignKey(County, on_delete=models.CASCADE, related_name='towns')
    name                  = models.CharField(max_length=100)
    slug                  = models.SlugField(max_length=140, unique=True, blank=True)
    has_station_delivery  = models.BooleanField(default=True)
    has_home_delivery     = models.BooleanField(default=True)
    is_active             = models.BooleanField(default=True)

    class Meta:
        unique_together = ['county', 'name']
        ordering = ['name']

    def __str__(self):
        return f'{self.name}, {self.county.name}'

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f'{self.county.name}-{self.name}')
            slug = base
            n = 1
            while Town.objects.filter(slug=slug).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)


class DeliveryStation(models.Model):
    """
    Physical pick-up station.
    Each station in a town carries its own delivery fee.

    Example — Mombasa:
        Nyali Station       KES 149
        Likoni Station      KES 179
        Changamwe Station   KES 149
        Bamburi Station     KES 149
        Mtwapa Station      KES 199
    """
    town             = models.ForeignKey(Town, on_delete=models.CASCADE, related_name='stations')
    name             = models.CharField(max_length=150)
    slug             = models.SlugField(max_length=200, unique=True, blank=True)
    address          = models.TextField(blank=True)
    latitude         = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude        = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    fee              = models.DecimalField(
        max_digits=8, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Delivery fee in KES for this station',
    )
    is_active        = models.BooleanField(default=True)
    operating_hours  = models.CharField(max_length=200, blank=True,
                                         help_text='e.g. Mon–Sat 8am–6pm')
    contact_phone    = models.CharField(max_length=30, blank=True)

    class Meta:
        ordering = ['town', 'fee', 'name']

    def __str__(self):
        return f'{self.name} ({self.town.name}) — KES {self.fee}'

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f'{self.town.slug}-{self.name}')
            slug = base
            n = 1
            while DeliveryStation.objects.filter(slug=slug).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)


class HomeDelivery(models.Model):
    """
    Home / door-step delivery pricing per town.
    One record per town — the fee covers door delivery anywhere in that town.
    """
    town      = models.OneToOneField(Town, on_delete=models.CASCADE, related_name='home_delivery')
    fee       = models.DecimalField(
        max_digits=8, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text='Home delivery fee in KES',
    )
    min_days  = models.PositiveSmallIntegerField(default=1, help_text='Minimum delivery days')
    max_days  = models.PositiveSmallIntegerField(default=3, help_text='Maximum delivery days')
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Home Deliveries'

    def __str__(self):
        return f'Home delivery — {self.town.name} — KES {self.fee} ({self.min_days}–{self.max_days} days)'

    @property
    def eta_display(self):
        if self.min_days == self.max_days:
            return f'{self.min_days} day{"s" if self.min_days > 1 else ""}'
        return f'{self.min_days}–{self.max_days} days'