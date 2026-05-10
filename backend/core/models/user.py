"""
core/models/user.py
Custom User model — login by email, not username.
"""
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    email        = models.EmailField(unique=True, db_index=True)
    full_name    = models.CharField(max_length=150, blank=True)
    phone        = models.CharField(max_length=20, blank=True)
    avatar       = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active    = models.BooleanField(default=True)
    is_staff     = models.BooleanField(default=False)
    is_verified  = models.BooleanField(default=False)
    date_joined  = models.DateTimeField(default=timezone.now)

    # Saved/preferred delivery info
    default_county  = models.ForeignKey(
        'core.County', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='default_users'
    )
    default_town    = models.ForeignKey(
        'core.Town', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='default_users'
    )
    default_station = models.ForeignKey(
        'core.DeliveryStation', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='default_users'
    )
    default_address = models.TextField(blank=True)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        ordering = ['-date_joined']

    def __str__(self):
        return self.email

    @property
    def first_name(self):
        parts = self.full_name.split(' ', 1)
        return parts[0] if parts else ''