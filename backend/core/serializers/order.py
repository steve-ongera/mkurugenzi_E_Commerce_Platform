from rest_framework import serializers
from django.db import transaction
from core.models import (
    Order, OrderItem, Coupon,
    Product, ProductVariant, DeliveryStation, HomeDelivery, Town,
)


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


class OrderItemCreateSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity   = serializers.IntegerField(min_value=1, max_value=99)


class OrderCreateSerializer(serializers.Serializer):
    # Cart
    items = OrderItemCreateSerializer(many=True, min_length=1)

    # Delivery
    delivery_type = serializers.ChoiceField(choices=['station', 'home'])
    town_id       = serializers.IntegerField()
    station_id    = serializers.IntegerField(required=False, allow_null=True)
    home_address  = serializers.CharField(required=False, allow_blank=True)

    # Guest fields (optional if authenticated)
    guest_email = serializers.EmailField(required=False, allow_blank=True)
    guest_name  = serializers.CharField(max_length=150, required=False, allow_blank=True)
    guest_phone = serializers.CharField(max_length=30, required=False, allow_blank=True)

    # Payment
    payment_method = serializers.ChoiceField(choices=['mpesa', 'card', 'cod'])
    mpesa_phone    = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Optional coupon
    coupon_code = serializers.CharField(max_length=30, required=False, allow_blank=True)
    notes       = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        user = self.context['request'].user

        # Guest must supply contact info
        if not user.is_authenticated:
            if not data.get('guest_email'):
                raise serializers.ValidationError({'guest_email': 'Email is required for guest checkout.'})

        # Delivery validation
        try:
            town = Town.objects.get(pk=data['town_id'], is_active=True)
        except Town.DoesNotExist:
            raise serializers.ValidationError({'town_id': 'Invalid town.'})
        data['town'] = town

        if data['delivery_type'] == 'station':
            if not data.get('station_id'):
                raise serializers.ValidationError({'station_id': 'Station is required for station delivery.'})
            try:
                station = DeliveryStation.objects.get(pk=data['station_id'], town=town, is_active=True)
            except DeliveryStation.DoesNotExist:
                raise serializers.ValidationError({'station_id': 'Invalid station for this town.'})
            data['station'] = station
            data['delivery_fee'] = station.fee
        else:
            try:
                hd = HomeDelivery.objects.get(town=town, is_active=True)
            except HomeDelivery.DoesNotExist:
                raise serializers.ValidationError(
                    {'delivery_type': 'Home delivery is not available for this town.'}
                )
            data['home_delivery'] = hd
            data['delivery_fee'] = hd.fee

        # Validate products + compute subtotal
        subtotal = 0
        validated_items = []
        for item in data['items']:
            try:
                product = Product.objects.get(pk=item['product_id'], is_active=True)
            except Product.DoesNotExist:
                raise serializers.ValidationError(
                    {'items': f'Product {item["product_id"]} not found.'}
                )
            variant = None
            if item.get('variant_id'):
                try:
                    variant = ProductVariant.objects.get(pk=item['variant_id'], product=product)
                except ProductVariant.DoesNotExist:
                    raise serializers.ValidationError(
                        {'items': f'Variant {item["variant_id"]} not found.'}
                    )
                stock = variant.stock
                unit_price = variant.final_price
            else:
                stock = product.stock
                unit_price = product.price

            if item['quantity'] > stock:
                raise serializers.ValidationError(
                    {'items': f'Only {stock} units of "{product.name}" in stock.'}
                )

            subtotal += unit_price * item['quantity']
            validated_items.append({
                'product':   product,
                'variant':   variant,
                'quantity':  item['quantity'],
                'unit_price': unit_price,
            })
        data['validated_items'] = validated_items
        data['subtotal'] = subtotal

        # Coupon
        discount = 0
        coupon = None
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

    @transaction.atomic
    def create(self, validated_data):
        user    = self.context['request'].user
        request = self.context['request']

        order = Order.objects.create(
            user          = user if user.is_authenticated else None,
            guest_email   = validated_data.get('guest_email', ''),
            guest_name    = validated_data.get('guest_name', ''),
            guest_phone   = validated_data.get('guest_phone', ''),
            delivery_type = validated_data['delivery_type'],
            county        = validated_data['town'].county,
            town          = validated_data['town'],
            station       = validated_data.get('station'),
            home_address  = validated_data.get('home_address', ''),
            subtotal      = validated_data['subtotal'],
            delivery_fee  = validated_data['delivery_fee'],
            discount      = validated_data['discount'],
            coupon        = validated_data['coupon'],
            payment_method = validated_data['payment_method'],
            mpesa_phone   = validated_data.get('mpesa_phone', ''),
            notes         = validated_data.get('notes', ''),
        )

        for item in validated_data['validated_items']:
            product = item['product']
            variant = item['variant']
            qty     = item['quantity']

            # Snapshot primary image URL
            img = product.primary_image
            img_url = img.image.url if img else ''

            # Variant info string
            variant_info = f'{variant.name}: {variant.value}' if variant else ''

            OrderItem.objects.create(
                order         = order,
                product       = product,
                variant       = variant,
                product_name  = product.name,
                product_slug  = product.slug,
                product_image = img_url,
                variant_info  = variant_info,
                unit_price    = item['unit_price'],
                quantity      = qty,
            )

            # Decrement stock
            if variant:
                variant.stock = variant.stock - qty
                variant.save(update_fields=['stock'])
            else:
                product.stock = product.stock - qty
                product.save(update_fields=['stock'])

        # Increment coupon usage
        if validated_data['coupon']:
            Coupon.objects.filter(pk=validated_data['coupon'].pk).update(
                used_count=validated_data['coupon'].used_count + 1
            )

        return order


class OrderSerializer(serializers.ModelSerializer):
    items           = OrderItemSerializer(many=True, read_only=True)
    tracking_steps  = serializers.ReadOnlyField()
    station_name    = serializers.CharField(source='station.name', read_only=True, default=None)
    station_address = serializers.CharField(source='station.address', read_only=True, default=None)
    town_name       = serializers.CharField(source='town.name', read_only=True)
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
            'delivery_type',
            'county_name', 'town_name',
            'station_name', 'station_address', 'home_address',
            'subtotal', 'delivery_fee', 'discount', 'total',
            'payment_method', 'payment_status', 'payment_ref',
            'notes', 'is_cancellable',
            'created_at', 'updated_at',
            'items',
        ]