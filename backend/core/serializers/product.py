from rest_framework import serializers
from core.models import Brand, Product, ProductImage, ProductVariant, Review
from .user import UserSerializer


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
            # Show first name + last initial for privacy
            return f'{parts[0]} {parts[-1][0]}.' if len(parts) > 1 else parts[0]
        return 'Anonymous'

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        # Mark as verified if user has purchased this product
        from core.models import Order, OrderItem
        has_purchased = OrderItem.objects.filter(
            order__user=validated_data['user'],
            order__status='delivered',
            product=validated_data['product'],
        ).exists()
        validated_data['is_verified_purchase'] = has_purchased
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight — used in product grids."""
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
            'category_name', 'category_slug',
            'brand_name',
            'price', 'compare_at_price', 'discount_percent',
            'stock', 'in_stock',
            'is_featured', 'is_flash_deal', 'flash_deal_ends_at',
            'average_rating', 'review_count',
            'primary_image',
        ]


class ProductDetailSerializer(serializers.ModelSerializer):
    """Full detail — used on PDP."""
    images           = ProductImageSerializer(many=True, read_only=True)
    variants         = ProductVariantSerializer(many=True, read_only=True)
    reviews          = ReviewSerializer(many=True, read_only=True)
    category_name    = serializers.CharField(source='category.name', read_only=True)
    category_slug    = serializers.CharField(source='category.slug', read_only=True)
    brand            = BrandSerializer(read_only=True)
    discount_percent = serializers.ReadOnlyField()
    in_stock         = serializers.ReadOnlyField()
    average_rating   = serializers.ReadOnlyField()
    review_count     = serializers.ReadOnlyField()
    tag_list         = serializers.ReadOnlyField()

    # Breadcrumb ancestors
    breadcrumbs = serializers.SerializerMethodField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'slug',
            'category_name', 'category_slug',
            'brand',
            'short_description', 'description',
            'price', 'compare_at_price', 'discount_percent',
            'stock', 'in_stock', 'sku', 'weight_kg',
            'is_featured', 'is_flash_deal', 'flash_deal_ends_at',
            'average_rating', 'review_count',
            'tag_list',
            'meta_title', 'meta_description',
            'created_at', 'updated_at',
            'images', 'variants', 'reviews',
            'breadcrumbs',
        ]

    def get_breadcrumbs(self, obj):
        cat = obj.category
        crumbs = [{'name': a.name, 'slug': a.slug} for a in cat.get_ancestors()]
        crumbs.append({'name': cat.name, 'slug': cat.slug})
        crumbs.append({'name': obj.name, 'slug': obj.slug})
        return crumbs