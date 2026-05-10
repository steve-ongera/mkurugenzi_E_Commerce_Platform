from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from core.models import Category
from core.serializers import CategoryTreeSerializer, CategorySerializer


class CategoryListView(APIView):
    """Returns the full active category tree (root categories with nested children)."""
    permission_classes = [AllowAny]

    def get(self, request):
        roots = Category.objects.filter(parent=None, is_active=True).order_by('sort_order', 'name')
        return Response(CategoryTreeSerializer(roots, many=True).data)


class CategoryDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            category = Category.objects.get(slug=slug, is_active=True)
        except Category.DoesNotExist:
            raise NotFound('Category not found.')
        return Response(CategorySerializer(category).data)