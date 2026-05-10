from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView, RetrieveAPIView, CreateAPIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotFound
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters

from core.models import Product, Brand, Review
from core.serializers import (
    ProductListSerializer, ProductDetailSerializer,
    ReviewSerializer, BrandSerializer,
)
from core.pagination import StandardPagination


class ProductFilter(filters.FilterSet):
    category    = filters.CharFilter(field_name='category__slug')
    brand       = filters.CharFilter(field_name='brand__slug')
    min_price   = filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price   = filters.NumberFilter(field_name='price', lookup_expr='lte')
    in_stock    = filters.BooleanFilter(field_name='stock', method='filter_in_stock')
    is_featured = filters.BooleanFilter(field_name='is_featured')
    flash_deal  = filters.BooleanFilter(field_name='is_flash_deal')

    class Meta:
        model  = Product
        fields = ['category', 'brand', 'min_price', 'max_price', 'in_stock', 'is_featured', 'flash_deal']

    def filter_in_stock(self, queryset, name, value):
        if value:
            return queryset.filter(stock__gt=0)
        return queryset


class ProductListView(ListAPIView):
    """
    GET /products/
    Query params: category, brand, min_price, max_price,
                  in_stock, is_featured, flash_deal,
                  search, ordering, page
    """
    permission_classes  = [AllowAny]
    serializer_class    = ProductListSerializer
    pagination_class    = StandardPagination
    filter_backends     = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class     = ProductFilter
    search_fields       = ['name', 'short_description', 'tags', 'sku', 'brand__name', 'category__name']
    ordering_fields     = ['price', 'created_at', 'name']
    ordering            = ['-created_at']

    def get_queryset(self):
        return (
            Product.objects
            .filter(is_active=True)
            .select_related('category', 'brand')
            .prefetch_related('images')
        )


class ProductDetailView(APIView):
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
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            product = Product.objects.get(slug=slug, is_active=True)
        except Product.DoesNotExist:
            raise NotFound('Product not found.')
        related = product.get_related_products(limit=8)
        return Response(ProductListSerializer(related, many=True).data)


class ReviewCreateView(CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class   = ReviewSerializer

    def perform_create(self, serializer):
        serializer.save()


class BrandListView(ListAPIView):
    permission_classes = [AllowAny]
    serializer_class   = BrandSerializer
    queryset           = Brand.objects.filter(is_active=True).order_by('name')
    pagination_class   = None


class FlashDealListView(ListAPIView):
    """Active flash deals ordered by expiry (soonest first)."""
    permission_classes = [AllowAny]
    serializer_class   = ProductListSerializer
    pagination_class   = None

    def get_queryset(self):
        from django.utils import timezone
        return (
            Product.objects
            .filter(
                is_active=True,
                is_flash_deal=True,
                flash_deal_ends_at__gt=timezone.now(),
            )
            .select_related('category', 'brand')
            .prefetch_related('images')
            .order_by('flash_deal_ends_at')[:20]
        )