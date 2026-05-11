"""
core/management/commands/seed_data.py
mkurugenzi.co.ke — Populate the database with realistic Kenyan e-commerce data.

Usage:
    python manage.py seed_data
    python manage.py seed_data --images-dir "D:/gadaf/Documents/images/jumia"
    python manage.py seed_data --clear        # wipe + re-seed
    python manage.py seed_data --products 60  # override product count

Images are picked randomly from --images-dir (default: D:/gadaf/Documents/images/jumia).
Any .jpg / .jpeg / .png / .webp file found (recursively) is eligible.
If no images are found the command still runs — products are created without images.
"""

import os
import random
import shutil
import glob
from decimal import Decimal
from datetime import timedelta
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.core.files import File
from django.utils import timezone
from django.conf import settings

from core.models import (
    User, Category, Brand, Product, ProductImage, ProductVariant,
    Review, County, Town, DeliveryStation, HomeDelivery, Coupon,
    Order, OrderItem,
)


# ── tunables ──────────────────────────────────────────────────────────────────

DEFAULT_IMAGES_DIR = r"D:\gadaf\Documents\images\jumia"
IMAGE_EXTENSIONS   = {".jpg", ".jpeg", ".png", ".webp"}

NUM_USERS         = 20
NUM_PRODUCTS      = 50   # overridable with --products
NUM_REVIEWS       = 80
NUM_ORDERS        = 30


# ── helpers ───────────────────────────────────────────────────────────────────

def rand_price(lo, hi):
    """Random Decimal price rounded to nearest 50."""
    raw = random.randint(lo // 50, hi // 50) * 50
    return Decimal(str(raw))


def rand_ksh(lo, hi):
    return Decimal(str(random.randint(lo, hi)))


# ── fixture data ──────────────────────────────────────────────────────────────

KENYA_COUNTIES = [
    "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret",
    "Thika", "Nyeri", "Meru", "Kakamega", "Kisii",
]

COUNTY_TOWNS = {
    "Nairobi":  ["Westlands", "Karen", "Eastleigh", "Kasarani", "Langata", "Embakasi"],
    "Mombasa":  ["Nyali", "Likoni", "Changamwe", "Bamburi", "Mtwapa"],
    "Kisumu":   ["Milimani", "Kondele", "Mamboleo", "Nyalenda"],
    "Nakuru":   ["Nakuru Town", "Gilgil", "Naivasha", "Molo"],
    "Eldoret":  ["Eldoret Town", "Turbo", "Burnt Forest"],
    "Thika":    ["Thika Town", "Ruiru", "Juja"],
    "Nyeri":    ["Nyeri Town", "Karatina", "Othaya"],
    "Meru":     ["Meru Town", "Nkubu", "Chuka"],
    "Kakamega": ["Kakamega Town", "Mumias", "Malava"],
    "Kisii":    ["Kisii Town", "Ogembo", "Suneka"],
}

# station names per town (first two towns of each county)
STATION_NAMES = [
    "Main Bus Stage", "Total Petrol Station", "Market Junction",
    "Hospital Road", "Town Centre Mall", "Junction Plaza",
    "Stadium Gate", "Post Office", "Railway Station", "Supermarket Hub",
]

BRANDS = [
    ("Samsung",   True),  ("Apple",    True),  ("LG",        True),
    ("Hisense",   True),  ("Ramtons",  True),  ("Bruhm",     True),
    ("Sony",      True),  ("HP",       True),  ("Asus",      True),
    ("Infinix",   True),  ("Tecno",    True),  ("Nokia",     True),
    ("Adidas",    True),  ("Nike",     True),  ("Bata",      True),
    ("Unbranded", False),
]

CATEGORIES_TREE = {
    "Electronics": {
        "icon": "bi-cpu",
        "children": ["Phones & Tablets", "Laptops & Computers", "TVs & Audio",
                     "Cameras", "Accessories"],
    },
    "Home & Kitchen": {
        "icon": "bi-house",
        "children": ["Kitchen Appliances", "Cookware", "Home Décor",
                     "Bedding & Bath", "Furniture"],
    },
    "Fashion": {
        "icon": "bi-bag",
        "children": ["Men's Clothing", "Women's Clothing", "Shoes",
                     "Bags & Luggage", "Jewellery"],
    },
    "Health & Beauty": {
        "icon": "bi-heart-pulse",
        "children": ["Skincare", "Hair Care", "Supplements", "Medical Supplies"],
    },
    "Sports & Outdoors": {
        "icon": "bi-bicycle",
        "children": ["Gym Equipment", "Sportswear", "Outdoor Gear", "Cycling"],
    },
    "Baby & Kids": {
        "icon": "bi-emoji-smile",
        "children": ["Toys & Games", "Baby Gear", "Kids Fashion", "School Supplies"],
    },
}

PRODUCT_TEMPLATES = [
    # (name_template, category_leaf, price_range, compare_mult)
    ("{brand} {size}\" Smart TV 4K", "TVs & Audio",          (25000, 120000), 1.2),
    ("{brand} {size}\" LED TV",      "TVs & Audio",          (12000,  60000), 1.15),
    ("{brand} Blender {model}",      "Kitchen Appliances",   (1500,   8000),  1.3),
    ("{brand} Microwave {size}L",    "Kitchen Appliances",   (5000,  20000),  1.2),
    ("{brand} Refrigerator {size}L", "Kitchen Appliances",   (20000, 80000),  1.1),
    ("{brand} Washing Machine {size}kg", "Kitchen Appliances",(18000, 60000), 1.1),
    ("{brand} Smartphone {model}",   "Phones & Tablets",     (8000,  80000),  1.2),
    ("{brand} Tablet {model}",       "Phones & Tablets",     (10000, 45000),  1.15),
    ("{brand} Laptop {model}",       "Laptops & Computers",  (30000, 120000), 1.1),
    ("{brand} Wireless Earbuds",     "Accessories",          (1500,  12000),  1.3),
    ("{brand} Bluetooth Speaker",    "Accessories",          (1200,  15000),  1.25),
    ("{brand} Power Bank {size}mAh", "Accessories",          (800,   5000),   1.3),
    ("{brand} Running Shoes",        "Shoes",                (1500,  12000),  1.2),
    ("{brand} Sneakers",             "Shoes",                (1200,  8000),   1.2),
    ("{brand} Men's T-Shirt",        "Men's Clothing",       (500,   3000),   1.4),
    ("{brand} Women's Dress",        "Women's Clothing",     (800,   6000),   1.35),
    ("{brand} Handbag",              "Bags & Luggage",       (1200,  15000),  1.3),
    ("{brand} Backpack {model}",     "Bags & Luggage",       (1500,  8000),   1.2),
    ("{brand} Body Lotion {size}ml", "Skincare",             (350,   1500),   1.4),
    ("{brand} Shampoo {size}ml",     "Hair Care",            (250,   1200),   1.45),
    ("{brand} Yoga Mat",             "Gym Equipment",        (900,   4500),   1.25),
    ("{brand} Dumbbells Set {size}kg","Gym Equipment",       (2500,  12000),  1.15),
    ("{brand} Baby Pram",            "Baby Gear",            (5000,  25000),  1.2),
    ("{brand} Building Blocks Set",  "Toys & Games",         (800,   4000),   1.3),
    ("Non-Stick Frying Pan {size}cm","Cookware",             (600,   3500),   1.35),
    ("Decorative Throw Pillow Set",  "Home Décor",           (700,   3000),   1.4),
]

MODELS  = ["Pro", "Ultra", "Max", "Lite", "Plus", "X", "Z", "S20", "A52", "Note10"]
SIZES   = [32, 43, 50, 55, 65, 75]
REVIEWS_TEMPLATES = [
    (5, "Excellent product! Works perfectly and was delivered on time."),
    (5, "Very happy with this purchase. Great value for money."),
    (4, "Good quality overall. Minor packaging issues but the item is fine."),
    (4, "Works as described. Would recommend to a friend."),
    (3, "Decent product but slightly overpriced. Does the job though."),
    (3, "Average. Expected a bit more based on the description."),
    (2, "Had some issues with the product but customer service helped resolve them."),
    (1, "Disappointed. Did not match the description at all."),
    (5, "Superb! Fast delivery to my station and well packaged."),
    (4, "Good build quality. Satisfied with my purchase."),
]

COUPON_DATA = [
    ("WELCOME10",  "percent",  10,  0,       100),
    ("SAVE200",    "fixed",   200,  2000,      50),
    ("JUMIA15",    "percent",  15,  5000,     200),
    ("FREESHIP",   "fixed",   150,  0,       500),
    ("FLASH20",    "percent",  20,  3000,      75),
    ("NAIROBI50",  "fixed",    50,  0,      1000),
    ("VIP25",      "percent",  25, 10000,     30),
]


# ── command ───────────────────────────────────────────────────────────────────

class Command(BaseCommand):
    help = "Seed the database with realistic Kenyan e-commerce data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--images-dir", default=DEFAULT_IMAGES_DIR,
            help="Directory to pull product images from (default: %(default)s)",
        )
        parser.add_argument(
            "--clear", action="store_true",
            help="Delete existing data before seeding.",
        )
        parser.add_argument(
            "--products", type=int, default=NUM_PRODUCTS,
            help="Number of products to create (default: %(default)s)",
        )

    # ── entry point ──────────────────────────────────────────────────────────

    def handle(self, *args, **options):
        self.images_dir   = Path(options["images_dir"])
        self.num_products = options["products"]
        self.verbosity    = options["verbosity"]

        if options["clear"]:
            self._clear()

        self._collect_images()

        self.stdout.write(self.style.MIGRATE_HEADING("\n── Seeding mkurugenzi.co.ke ──\n"))

        counties   = self._seed_counties()
        brands     = self._seed_brands()
        categories = self._seed_categories()
        users      = self._seed_users()
        products   = self._seed_products(categories, brands)
        self._seed_reviews(products, users)
        self._seed_coupons()
        self._seed_orders(users, products, counties)

        self.stdout.write(self.style.SUCCESS("\n✓ Seeding complete.\n"))

    # ── helpers ──────────────────────────────────────────────────────────────

    def _log(self, msg):
        if self.verbosity >= 1:
            self.stdout.write(f"  {msg}")

    def _collect_images(self):
        """Gather all eligible image paths from the images directory."""
        self.image_paths = []
        if not self.images_dir.exists():
            self.stdout.write(
                self.style.WARNING(
                    f"  ⚠  Images directory not found: {self.images_dir}\n"
                    "     Products will be created without images.\n"
                )
            )
            return

        for ext in IMAGE_EXTENSIONS:
            self.image_paths.extend(
                self.images_dir.rglob(f"*{ext}")
            )
            self.image_paths.extend(
                self.images_dir.rglob(f"*{ext.upper()}")
            )

        self.image_paths = list(set(self.image_paths))  # deduplicate
        self._log(f"Found {len(self.image_paths)} images in {self.images_dir}")

    def _random_image(self):
        """Return a random Path from collected images, or None."""
        return random.choice(self.image_paths) if self.image_paths else None

    def _attach_image(self, product, image_path, is_primary=False, sort_order=0):
        """Create a ProductImage record by copying the file into MEDIA_ROOT."""
        if image_path is None:
            return
        try:
            with open(image_path, "rb") as f:
                django_file = File(f, name=image_path.name)
                ProductImage.objects.create(
                    product    = product,
                    image      = django_file,
                    alt_text   = product.name,
                    is_primary = is_primary,
                    sort_order = sort_order,
                )
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"    ⚠  Could not attach image {image_path}: {exc}"))

    # ── clear ────────────────────────────────────────────────────────────────

    def _clear(self):
        self.stdout.write(self.style.WARNING("  Clearing existing data…"))
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        Review.objects.all().delete()
        ProductImage.objects.all().delete()
        ProductVariant.objects.all().delete()
        Product.objects.all().delete()
        Coupon.objects.all().delete()
        HomeDelivery.objects.all().delete()
        DeliveryStation.objects.all().delete()
        Town.objects.all().delete()
        County.objects.all().delete()
        Brand.objects.all().delete()
        Category.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write(self.style.WARNING("  ✓ Data cleared.\n"))

    # ── counties / towns / stations / home delivery ───────────────────────────

    def _seed_counties(self):
        self.stdout.write("  Counties & Delivery…")
        counties = {}
        for county_name in KENYA_COUNTIES:
            county, _ = County.objects.get_or_create(name=county_name)
            towns_data = COUNTY_TOWNS.get(county_name, [f"{county_name} Town"])
            for i, town_name in enumerate(towns_data):
                town, created = Town.objects.get_or_create(
                    county=county,
                    name=town_name,
                    defaults={
                        "has_station_delivery": True,
                        "has_home_delivery":    True,
                        "is_active":            True,
                    },
                )
                if created:
                    # 2–3 pick-up stations per town
                    num_stations = random.randint(2, 3)
                    station_pool = random.sample(STATION_NAMES, k=min(num_stations, len(STATION_NAMES)))
                    for station_name in station_pool:
                        DeliveryStation.objects.get_or_create(
                            town=town,
                            name=f"{town_name} — {station_name}",
                            defaults={
                                "fee":             rand_ksh(99, 299),
                                "is_active":       True,
                                "operating_hours": "Mon–Sat 8 am–6 pm",
                                "contact_phone":   f"07{random.randint(10000000, 99999999)}",
                            },
                        )
                    # home delivery record
                    HomeDelivery.objects.get_or_create(
                        town=town,
                        defaults={
                            "fee":      rand_ksh(150, 500),
                            "min_days": random.randint(1, 2),
                            "max_days": random.randint(3, 5),
                            "is_active": True,
                        },
                    )
            counties[county_name] = county
        self._log(f"  {County.objects.count()} counties, {Town.objects.count()} towns, "
                  f"{DeliveryStation.objects.count()} stations")
        return counties

    # ── brands ────────────────────────────────────────────────────────────────

    def _seed_brands(self):
        self.stdout.write("  Brands…")
        brand_objs = []
        for name, is_active in BRANDS:
            b, _ = Brand.objects.get_or_create(name=name, defaults={"is_active": is_active})
            brand_objs.append(b)
        self._log(f"  {len(brand_objs)} brands")
        return brand_objs

    # ── categories ────────────────────────────────────────────────────────────

    def _seed_categories(self):
        self.stdout.write("  Categories…")
        leaf_map = {}  # leaf name → Category instance
        sort = 0
        for parent_name, meta in CATEGORIES_TREE.items():
            parent, _ = Category.objects.get_or_create(
                name=parent_name,
                defaults={
                    "icon":       meta["icon"],
                    "is_active":  True,
                    "sort_order": sort,
                },
            )
            sort += 1
            for child_name in meta["children"]:
                child, _ = Category.objects.get_or_create(
                    name=child_name,
                    parent=parent,
                    defaults={
                        "is_active":  True,
                        "sort_order": sort,
                    },
                )
                sort += 1
                leaf_map[child_name] = child
        self._log(f"  {Category.objects.count()} categories ({len(leaf_map)} leaves)")
        return leaf_map

    # ── users ─────────────────────────────────────────────────────────────────

    def _seed_users(self):
        self.stdout.write("  Users…")
        first_names = ["James", "Grace", "Brian", "Faith", "Kevin", "Mercy",
                       "Daniel", "Sharon", "Peter", "Esther", "John", "Mary",
                       "Moses", "Ruth", "Samuel", "Lydia", "David", "Naomi",
                       "Joseph", "Dorcas"]
        last_names  = ["Kamau", "Ochieng", "Mutua", "Njoroge", "Wanjiku",
                       "Otieno", "Mwangi", "Achieng", "Kariuki", "Adhiambo",
                       "Kipchoge", "Wanjiru", "Omondi", "Nyambura", "Kipruto"]
        users = []
        for i in range(NUM_USERS):
            fname = random.choice(first_names)
            lname = random.choice(last_names)
            email = f"{fname.lower()}.{lname.lower()}{i}@example.co.ke"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "full_name":   f"{fname} {lname}",
                    "phone":       f"07{random.randint(10000000, 99999999)}",
                    "is_active":   True,
                    "is_verified": random.choice([True, True, False]),
                },
            )
            if created:
                user.set_password("Pass1234!")
                user.save()
            users.append(user)
        self._log(f"  {len(users)} regular users")

        # ensure a superuser exists
        if not User.objects.filter(is_superuser=True).exists():
            User.objects.create_superuser(
                email     = "admin@mkurugenzi.co.ke",
                password  = "Admin1234!",
                full_name = "Site Admin",
            )
            self._log("  superuser → admin@mkurugenzi.co.ke / Admin1234!")

        return users

    # ── products ──────────────────────────────────────────────────────────────

    def _seed_products(self, categories, brands):
        self.stdout.write(f"  Products (target: {self.num_products})…")

        leaf_categories = list(categories.values())
        brand_list      = list(Brand.objects.filter(is_active=True))

        products = []
        created_count = 0

        templates_cycle = (PRODUCT_TEMPLATES * ((self.num_products // len(PRODUCT_TEMPLATES)) + 2))
        random.shuffle(templates_cycle)

        for tmpl in templates_cycle:
            if created_count >= self.num_products:
                break

            name_tpl, cat_name, price_range, compare_mult = tmpl

            # Resolve category — fall back to random leaf
            cat = categories.get(cat_name) or random.choice(leaf_categories)

            brand = random.choice(brand_list) if brand_list else None

            # Fill template placeholders
            brand_name = brand.name if brand else "Generic"
            name = (
                name_tpl
                .replace("{brand}",  brand_name)
                .replace("{model}",  random.choice(MODELS))
                .replace("{size}",   str(random.choice(SIZES)))
            )
            # Make name unique enough to avoid slug collisions
            suffix = random.randint(100, 9999)
            name   = f"{name} [{suffix}]"

            price         = rand_price(*price_range)
            compare_price = round(price * Decimal(str(compare_mult)) / 50) * 50

            stock  = random.randint(0, 150)
            sku    = f"SKU-{random.randint(100000, 999999)}"

            is_featured   = random.random() < 0.2
            is_flash_deal = random.random() < 0.1
            flash_ends    = (
                timezone.now() + timedelta(hours=random.randint(6, 72))
                if is_flash_deal else None
            )

            try:
                product = Product.objects.create(
                    name              = name,
                    category          = cat,
                    brand             = brand,
                    short_description = f"Quality {name} — available now in Kenya.",
                    description       = (
                        f"<p>Introducing the <strong>{name}</strong>. "
                        f"Ideal for everyday use. Available at our pick-up stations "
                        f"and via home delivery across Kenya.</p>"
                    ),
                    price             = price,
                    compare_at_price  = compare_price,
                    cost_price        = round(price * Decimal("0.65") / 50) * 50,
                    stock             = stock,
                    sku               = sku,
                    is_active         = random.random() > 0.05,  # 95 % active
                    is_featured       = is_featured,
                    is_flash_deal     = is_flash_deal,
                    flash_deal_ends_at = flash_ends,
                    weight_kg         = Decimal(str(round(random.uniform(0.2, 15.0), 3))),
                    tags              = ", ".join(
                        random.sample(
                            ["kenya", "nairobi", "electronics", "fashion", "sale",
                             "jumia", "quality", "affordable", "delivery"],
                            k=random.randint(2, 5)
                        )
                    ),
                )
            except Exception as exc:
                self.stdout.write(self.style.WARNING(f'    ⚠ Skipped product "{name}": {exc}'))
                continue

            # ── images (1–3 per product) ──────────────────────────────────────
            num_images = random.randint(1, 3) if self.image_paths else 0
            used_paths = set()
            for img_idx in range(num_images):
                # Avoid duplicating the exact same file on a single product
                candidates = [p for p in self.image_paths if p not in used_paths]
                if not candidates:
                    break
                img_path = random.choice(candidates)
                used_paths.add(img_path)
                self._attach_image(
                    product,
                    img_path,
                    is_primary = (img_idx == 0),
                    sort_order = img_idx,
                )

            # ── variants (optional, ~40 % of products) ───────────────────────
            if random.random() < 0.4:
                variant_type  = random.choice(["Size", "Colour", "Storage"])
                variant_values = {
                    "Size":    ["S", "M", "L", "XL", "XXL"],
                    "Colour":  ["Black", "White", "Blue", "Red", "Grey"],
                    "Storage": ["32GB", "64GB", "128GB", "256GB"],
                }[variant_type]
                for val in random.sample(variant_values, k=random.randint(2, 4)):
                    adj = Decimal(str(random.choice([-500, -200, 0, 0, 200, 500, 1000])))
                    ProductVariant.objects.get_or_create(
                        product = product,
                        name    = variant_type,
                        value   = val,
                        defaults={
                            "price_adjustment": adj,
                            "stock":            random.randint(0, 30),
                            "sku":              f"{sku}-{val[:2].upper()}",
                        },
                    )

            products.append(product)
            created_count += 1

        self._log(f"  {created_count} products created "
                  f"({ProductImage.objects.count()} images, "
                  f"{ProductVariant.objects.count()} variants)")
        return products

    # ── reviews ───────────────────────────────────────────────────────────────

    def _seed_reviews(self, products, users):
        self.stdout.write("  Reviews…")
        count = 0
        pairs = set()

        attempts = 0
        while count < NUM_REVIEWS and attempts < NUM_REVIEWS * 5:
            attempts += 1
            product = random.choice(products)
            user    = random.choice(users)
            key     = (product.pk, user.pk)
            if key in pairs:
                continue
            pairs.add(key)
            rating, body = random.choice(REVIEWS_TEMPLATES)
            Review.objects.create(
                product              = product,
                user                 = user,
                rating               = rating,
                title                = body[:60],
                body                 = body,
                is_verified_purchase = random.choice([True, False]),
            )
            count += 1

        self._log(f"  {count} reviews")

    # ── coupons ───────────────────────────────────────────────────────────────

    def _seed_coupons(self):
        self.stdout.write("  Coupons…")
        for code, dtype, value, min_order, max_uses in COUPON_DATA:
            Coupon.objects.get_or_create(
                code=code,
                defaults={
                    "description":      f"Coupon {code}",
                    "discount_type":    dtype,
                    "value":            Decimal(str(value)),
                    "min_order_amount": Decimal(str(min_order)),
                    "max_uses":         max_uses,
                    "expires_at":       timezone.now() + timedelta(days=random.randint(30, 180)),
                    "is_active":        True,
                },
            )
        self._log(f"  {Coupon.objects.count()} coupons")

    # ── orders ────────────────────────────────────────────────────────────────

    def _seed_orders(self, users, products, counties):
        self.stdout.write("  Orders…")

        active_products = [p for p in products if p.is_active and p.stock > 0]
        if not active_products:
            self._log("  No active products with stock — skipping orders.")
            return

        statuses         = [s[0] for s in Order.STATUS_CHOICES]
        payment_methods  = [Order.MPESA, Order.MPESA, Order.MPESA, Order.CARD, Order.COD]
        payment_statuses = [Order.PAY_PENDING, Order.PAY_PAID, Order.PAY_PAID, Order.PAY_PAID]

        towns_qs = list(Town.objects.select_related("county").filter(is_active=True))
        if not towns_qs:
            self._log("  No towns found — skipping orders.")
            return

        coupons = list(Coupon.objects.filter(is_active=True))

        for _ in range(NUM_ORDERS):
            user    = random.choice(users + [None, None])   # ~33 % guest
            town    = random.choice(towns_qs)
            county  = town.county

            delivery_type = random.choice([Order.STATION, Order.HOME])
            station       = None
            home_address  = ""

            if delivery_type == Order.STATION:
                station_qs = list(town.stations.filter(is_active=True))
                if station_qs:
                    station      = random.choice(station_qs)
                    delivery_fee = station.fee
                else:
                    delivery_type = Order.HOME
            if delivery_type == Order.HOME:
                try:
                    hd           = town.home_delivery
                    delivery_fee = hd.fee if hd.is_active else Decimal("250")
                except HomeDelivery.DoesNotExist:
                    delivery_fee = Decimal("250")
                home_address = f"{random.randint(1, 999)} Example Road, {town.name}"

            # Pick 1–4 random products for this order
            order_products = random.sample(
                active_products, k=min(random.randint(1, 4), len(active_products))
            )

            # Coupon?
            coupon   = random.choice(coupons + [None, None, None])
            subtotal = Decimal("0")

            # Build order
            payment_method = random.choice(payment_methods)
            pay_status     = random.choice(payment_statuses)
            status         = random.choice(statuses)

            order = Order.objects.create(
                user            = user,
                guest_email     = "" if user else f"guest{random.randint(1000,9999)}@example.co.ke",
                guest_name      = "" if user else "Guest User",
                guest_phone     = "" if user else f"07{random.randint(10000000,99999999)}",
                status          = status,
                delivery_type   = delivery_type,
                county          = county,
                town            = town,
                station         = station,
                home_address    = home_address,
                subtotal        = 0,    # will be updated
                delivery_fee    = delivery_fee,
                discount        = 0,
                total           = 0,
                coupon          = coupon,
                payment_method  = payment_method,
                payment_status  = pay_status,
                payment_ref     = (
                    f"QJY{random.randint(100000,999999)}" if pay_status == Order.PAY_PAID else ""
                ),
                mpesa_phone     = (
                    f"07{random.randint(10000000,99999999)}" if payment_method == Order.MPESA else ""
                ),
            )

            # Order items
            for prod in order_products:
                qty        = random.randint(1, 3)
                unit_price = prod.price

                # Pick a variant?
                variant = None
                if prod.variants.exists() and random.random() < 0.5:
                    variant    = random.choice(list(prod.variants.all()))
                    unit_price = variant.final_price

                # Image URL snapshot
                primary_img = prod.primary_image
                img_url = ""
                if primary_img and primary_img.image:
                    try:
                        img_url = primary_img.image.url
                    except Exception:
                        img_url = ""

                item = OrderItem.objects.create(
                    order         = order,
                    product       = prod,
                    variant       = variant,
                    product_name  = prod.name,
                    product_slug  = prod.slug,
                    product_image = img_url,
                    variant_info  = f"{variant.name}: {variant.value}" if variant else "",
                    unit_price    = unit_price,
                    quantity      = qty,
                    subtotal      = unit_price * qty,   # auto-set by model save too
                )
                subtotal += item.subtotal

            # Apply coupon discount
            discount = Decimal("0")
            if coupon:
                valid, _ = coupon.is_valid(subtotal)
                if valid:
                    discount = coupon.calculate_discount(subtotal)

            order.subtotal = subtotal
            order.discount = discount
            order.save()   # recalculates total via Order.save()

        self._log(f"  {Order.objects.count()} orders, {OrderItem.objects.count()} items")