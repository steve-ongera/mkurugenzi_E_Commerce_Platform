"""
core/serializers.py
mkurugenzi.co.ke — Single serializers file for the core application.
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from core.models import (
    User, Category, Brand, Product, ProductImage, ProductVariant, Review,
    County, Town, DeliveryStation, HomeDelivery,
    Order, OrderItem, Coupon,
)


# ─────────────────────────────────────────────────────────────────────────────
# USER
# ─────────────────────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = [
            'id', 'email', 'full_name', 'phone', 'avatar',
            'is_verified', 'date_joined',
            'default_county', 'default_town', 'default_station', 'default_address',
        ]
        read_only_fields = ['id', 'email', 'is_verified', 'date_joined']


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ['email', 'full_name', 'phone', 'password', 'password2']

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])

    def validate_old_password(self, value):
        if not self.context['request'].user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


# ─────────────────────────────────────────────────────────────────────────────
# CATEGORY
# ─────────────────────────────────────────────────────────────────────────────

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = [
            'id', 'name', 'slug', 'parent', 'description',
            'icon', 'image', 'is_active', 'sort_order',
            'meta_title', 'meta_description',
        ]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Recursive — returns full tree with nested children."""
    children = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'sort_order', 'children']

    def get_children(self, obj):
        qs = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        return CategoryTreeSerializer(qs, many=True, context=self.context).data


# ─────────────────────────────────────────────────────────────────────────────
# PRODUCT
# ─────────────────────────────────────────────────────────────────────────────

class BrandSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Brand
        fields = ['id', 'name', 'slug', 'logo']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'sort_order']


class ProductVariantSerializer(serializers.ModelSerializer):
    final_price = serializers.ReadOnlyField()

    class Meta:
        model  = ProductVariant
        fields = ['id', 'name', 'value', 'price_adjustment', 'stock', 'sku', 'final_price']


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    class Meta:
        model  = Review
        fields = [
            'id', 'product', 'user', 'user_name',
            'rating', 'title', 'body',
            'is_verified_purchase', 'created_at',
        ]
        read_only_fields = ['user', 'is_verified_purchase', 'created_at']

    def get_user_name(self, obj):
        name = obj.user.full_name
        if name:
            parts = name.split()
            return f'{parts[0]} {parts[-1][0]}.' if len(parts) > 1 else parts[0]
        return 'Anonymous'

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        has_purchased = OrderItem.objects.filter(
            order__user=validated_data['user'],
            order__status=Order.DELIVERED,
            product=validated_data['product'],
        ).exists()
        validated_data['is_verified_purchase'] = has_purchased
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight — for product grids and search results."""
    primary_image    = ProductImageSerializer(read_only=True)
    category_name    = serializers.CharField(source='category.name', read_only=True)
    category_slug    = serializers.CharField(source='category.slug', read_only=True)
    brand_name       = serializers.CharField(source='brand.name', read_only=True, default=None)
    discount_percent = serializers.ReadOnlyField()
    in_stock         = serializers.ReadOnlyField()
    average_rating   = serializers.ReadOnlyField()
    review_count     = serializers.ReadOnlyField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'slug',
            'category_name', 'category_slug', 'brand_name',
            'price', 'compare_at_price', 'discount_percent',
            'stock', 'in_stock',
            'is_featured', 'is_flash_deal', 'flash_deal_ends_at',
            'average_rating', 'review_count',
            'primary_image',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full detail — Product Detail Page."""
    images           = ProductImageSerializer(many=True, read_only=True)
    variants         = ProductVariantSerializer(many=True, read_only=True)
    reviews          = ReviewSerializer(many=True, read_only=True)
    brand            = BrandSerializer(read_only=True)
    category_name    = serializers.CharField(source='category.name', read_only=True)
    category_slug    = serializers.CharField(source='category.slug', read_only=True)
    discount_percent = serializers.ReadOnlyField()
    in_stock         = serializers.ReadOnlyField()
    average_rating   = serializers.ReadOnlyField()
    review_count     = serializers.ReadOnlyField()
    tag_list         = serializers.ReadOnlyField()
    breadcrumbs      = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'slug',
            'category_name', 'category_slug', 'brand',
            'short_description', 'description',
            'price', 'compare_at_price', 'discount_percent',
            'stock', 'in_stock', 'sku', 'weight_kg',
            'is_featured', 'is_flash_deal', 'flash_deal_ends_at',
            'average_rating', 'review_count', 'tag_list',
            'meta_title', 'meta_description',
            'created_at', 'updated_at',
            'images', 'variants', 'reviews', 'breadcrumbs',
        ]

    def get_breadcrumbs(self, obj):
        cat    = obj.category
        crumbs = [{'name': a.name, 'slug': a.slug} for a in cat.get_ancestors()]
        crumbs.append({'name': cat.name, 'slug': cat.slug})
        crumbs.append({'name': obj.name, 'slug': obj.slug})
        return crumbs


# ─────────────────────────────────────────────────────────────────────────────
# DELIVERY
# ─────────────────────────────────────────────────────────────────────────────

class DeliveryStationSerializer(serializers.ModelSerializer):
    town_name   = serializers.CharField(source='town.name', read_only=True)
    county_name = serializers.CharField(source='town.county.name', read_only=True)

    class Meta:
        model  = DeliveryStation
        fields = [
            'id', 'name', 'slug', 'address',
            'latitude', 'longitude', 'fee',
            'operating_hours', 'contact_phone',
            'town_name', 'county_name',
        ]


class HomeDeliverySerializer(serializers.ModelSerializer):
    town_name   = serializers.CharField(source='town.name', read_only=True)
    county_name = serializers.CharField(source='town.county.name', read_only=True)
    eta_display = serializers.ReadOnlyField()

    class Meta:
        model  = HomeDelivery
        fields = ['id', 'fee', 'min_days', 'max_days', 'eta_display', 'town_name', 'county_name']


class TownSerializer(serializers.ModelSerializer):
    stations      = DeliveryStationSerializer(many=True, read_only=True)
    home_delivery = HomeDeliverySerializer(read_only=True)
    county_name   = serializers.CharField(source='county.name', read_only=True)
    county_slug   = serializers.CharField(source='county.slug', read_only=True)

    class Meta:
        model  = Town
        fields = [
            'id', 'name', 'slug',
            'county_name', 'county_slug',
            'has_station_delivery', 'has_home_delivery',
            'stations', 'home_delivery',
        ]


class CountySerializer(serializers.ModelSerializer):
    towns = serializers.SerializerMethodField()

    class Meta:
        model  = County
        fields = ['id', 'name', 'slug', 'towns']

    def get_towns(self, obj):
        return [
            {
                'id':                   t.id,
                'name':                 t.name,
                'slug':                 t.slug,
                'has_station_delivery': t.has_station_delivery,
                'has_home_delivery':    t.has_home_delivery,
            }
            for t in obj.towns.filter(is_active=True).order_by('name')
        ]


# ─────────────────────────────────────────────────────────────────────────────
# ORDER
# ─────────────────────────────────────────────────────────────────────────────

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Coupon
        fields = ['code', 'discount_type', 'value', 'min_order_amount', 'expires_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model  = OrderItem
        fields = [
            'id', 'product', 'variant',
            'product_name', 'product_slug', 'product_image',
            'variant_info', 'unit_price', 'quantity', 'subtotal',
        ]


class _CartItemSerializer(serializers.Serializer):
    """Internal — validates a single line in the cart."""
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity   = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    # Cart lines
    items = _CartItemSerializer(many=True, min_length=1)

    # Delivery
    delivery_type = serializers.ChoiceField(choices=['station', 'home'])
    town_id       = serializers.IntegerField()
    station_id    = serializers.IntegerField(required=False, allow_null=True)
    home_address  = serializers.CharField(required=False, allow_blank=True)

    # Guest fields (required when not authenticated)
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    guest_name  = serializers.CharField(max_length=150, required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    # Payment
    payment_method = serializers.ChoiceField(choices=['mpesa', 'card', 'cod'])
    mpesa_phone    = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Optional
    coupon_code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    notes       = serializers.CharField(required=False, allow_blank=True)

    # ── Validation ────────────────────────────────────────────────────────────

    def validate(self, data):
        user = self.context['request'].user

        if not user.is_authenticated and not data.get('guest_email'):
            raise serializers.ValidationError(
                {'guest_email': 'Email is required for guest checkout.'}
            )

        # Town
        try:
            town = Town.objects.get(pk=data['town_id'], is_active=True)
        except Town.DoesNotExist:
            raise serializers.ValidationError({'town_id': 'Invalid town.'})
        data['town'] = town

        # Delivery fee
        if data['delivery_type'] == 'station':
            if not data.get('station_id'):
                raise serializers.ValidationError(
                    {'station_id': 'A pick-up station is required for station delivery.'}
                )
            try:
                station = DeliveryStation.objects.get(
                    pk=data['station_id'], town=town, is_active=True
                )
            except DeliveryStation.DoesNotExist:
                raise serializers.ValidationError({'station_id': 'Invalid station for this town.'})
            data['station']      = station
            data['delivery_fee'] = station.fee
        else:
            try:
                hd = HomeDelivery.objects.get(town=town, is_active=True)
            except HomeDelivery.DoesNotExist:
                raise serializers.ValidationError(
                    {'delivery_type': 'Home delivery is not available for this town.'}
                )
            data['home_delivery'] = hd
            data['delivery_fee']  = hd.fee

        # Products + subtotal
        subtotal        = 0
        validated_items = []
        for item in data['items']:
            try:
                product = Product.objects.get(pk=item['product_id'], is_active=True)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    {'items': f'Product {item["product_id"]} not found.'}
                )

            variant    = None
            unit_price = product.price
            stock      = product.stock

            if item.get('variant_id'):
                try:
                    variant = ProductVariant.objects.get(pk=item['variant_id'], product=product)
                    unit_price = variant.final_price
                    stock      = variant.stock
                except ProductVariant.DoesNotExist:
                    raise serializers.ValidationError(
                        {'items': f'Variant {item["variant_id"]} not found.'}
                    )

            if item['quantity'] > stock:
                raise serializers.ValidationError(
                    {'items': f'Only {stock} units of "{product.name}" available.'}
                )

            subtotal += unit_price * item['quantity']
            validated_items.append({
                'product':    product,
                'variant':    variant,
                'quantity':   item['quantity'],
                'unit_price': unit_price,
            })

        data['validated_items'] = validated_items
        data['subtotal']        = subtotal

        # Coupon
        discount = 0
        coupon   = None
        if data.get('coupon_code'):
            try:
                coupon = Coupon.objects.get(code=data['coupon_code'].upper(), is_active=True)
                valid, msg = coupon.is_valid(subtotal)
                if not valid:
                    raise serializers.ValidationError({'coupon_code': msg})
                discount = coupon.calculate_discount(subtotal)
            except Coupon.DoesNotExist:
                raise serializers.ValidationError({'coupon_code': 'Invalid coupon code.'})

        data['coupon']   = coupon
        data['discount'] = discount
        return data

    # ── Create ────────────────────────────────────────────────────────────────

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user

        order = Order.objects.create(
            user           = user if user.is_authenticated else None,
            guest_email    = validated_data.get('guest_email', ''),
            guest_name     = validated_data.get('guest_name', ''),
            guest_phone    = validated_data.get('guest_phone', ''),
            delivery_type  = validated_data['delivery_type'],
            county         = validated_data['town'].county,
            town           = validated_data['town'],
            station        = validated_data.get('station'),
            home_address   = validated_data.get('home_address', ''),
            subtotal       = validated_data['subtotal'],
            delivery_fee   = validated_data['delivery_fee'],
            discount       = validated_data['discount'],
            coupon         = validated_data['coupon'],
            payment_method = validated_data['payment_method'],
            mpesa_phone    = validated_data.get('mpesa_phone', ''),
            notes          = validated_data.get('notes', ''),
        )

        for item in validated_data['validated_items']:
            product = item['product']
            variant = item['variant']
            qty     = item['quantity']

            img     = product.primary_image
            img_url = img.image.url if img else ''

            OrderItem.objects.create(
                order         = order,
                product       = product,
                variant       = variant,
                product_name  = product.name,
                product_slug  = product.slug,
                product_image = img_url,
                variant_info  = f'{variant.name}: {variant.value}' if variant else '',
                unit_price    = item['unit_price'],
                quantity      = qty,
            )

            # Decrement stock
            if variant:
                ProductVariant.objects.filter(pk=variant.pk).update(stock=variant.stock - qty)
            else:
                Product.objects.filter(pk=product.pk).update(stock=product.stock - qty)

        # Increment coupon usage
        if validated_data['coupon']:
            Coupon.objects.filter(pk=validated_data['coupon'].pk).update(
                used_count=validated_data['coupon'].used_count + 1
            )

        return order


class OrderSerializer(serializers.ModelSerializer):
    items           = OrderItemSerializer(many=True, read_only=True)
    tracking_steps  = serializers.ReadOnlyField()
    station_name    = serializers.CharField(source='station.name',    read_only=True, default=None)
    station_address = serializers.CharField(source='station.address', read_only=True, default=None)
    town_name       = serializers.CharField(source='town.name',   read_only=True)
    county_name     = serializers.CharField(source='county.name', read_only=True)
    customer_name   = serializers.ReadOnlyField()
    customer_email  = serializers.ReadOnlyField()
    is_cancellable  = serializers.ReadOnlyField()

    class Meta:
        model  = Order
        fields = [
            'id', 'order_number',
            'customer_name', 'customer_email',
            'status', 'tracking_steps',
            'delivery_type', 'county_name', 'town_name',
            'station_name', 'station_address', 'home_address',
            'subtotal', 'delivery_fee', 'discount', 'total',
            'payment_method', 'payment_status', 'payment_ref',
            'notes', 'is_cancellable',
            'created_at', 'updated_at',
            'items',
        ]