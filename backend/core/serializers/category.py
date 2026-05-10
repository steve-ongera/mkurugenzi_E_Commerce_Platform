from rest_framework import serializers
from core.models import Category


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model  = Category
        fields = [
            'id', 'name', 'slug', 'parent', 'description',
            'icon', 'image', 'is_active', 'sort_order',
            'meta_title', 'meta_description',
        ]


class CategoryTreeSerializer(serializers.ModelSerializer):
    """Recursive serializer — returns full tree of active categories."""
    children = serializers.SerializerMethodField()

    class Meta:
        model  = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'sort_order', 'children']

    def get_children(self, obj):
        active_children = obj.children.filter(is_active=True).order_by('sort_order', 'name')
        return CategoryTreeSerializer(active_children, many=True, context=self.context).data