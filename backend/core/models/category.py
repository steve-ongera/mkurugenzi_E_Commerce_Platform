"""
core/models/category.py
Hierarchical product categories with SEO slugs.
"""
from django.db import models
from django.utils.text import slugify


class Category(models.Model):
    name        = models.CharField(max_length=120)
    slug        = models.SlugField(max_length=160, unique=True, blank=True)
    parent      = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.CASCADE, related_name='children'
    )
    description = models.TextField(blank=True)
    icon        = models.CharField(max_length=80, blank=True,
                                   help_text='Bootstrap icon class e.g. bi-phone')
    image       = models.ImageField(upload_to='categories/', blank=True, null=True)
    is_active   = models.BooleanField(default=True)
    sort_order  = models.PositiveSmallIntegerField(default=0)
    meta_title       = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['sort_order', 'name']

    def __str__(self):
        if self.parent:
            return f'{self.parent.name} › {self.name}'
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            if self.parent:
                base = f'{self.parent.slug}-{base}'
            slug = base
            n = 1
            while Category.objects.filter(slug=slug).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def get_ancestors(self):
        """Returns list of ancestors from root to self (for breadcrumbs)."""
        ancestors = []
        current = self
        while current.parent:
            ancestors.insert(0, current.parent)
            current = current.parent
        return ancestors

    @property
    def full_path(self):
        """e.g. 'Electronics / Phones / Android'"""
        parts = [a.name for a in self.get_ancestors()] + [self.name]
        return ' / '.join(parts)