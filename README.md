# mkurugenzi.co.ke — E-Commerce Platform

> A full-stack e-commerce platform built for the Kenyan market, inspired by Jumia's delivery model. Built with Django (backend) and React (frontend).

---

## Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Django Backend](#django-backend)
  - [Core App & Models](#core-app--models)
  - [SEO & Slugs](#seo--slugs)
  - [Delivery System](#delivery-system)
  - [API Endpoints](#api-endpoints)
- [React Frontend](#react-frontend)
  - [Pages](#pages)
  - [Components](#components)
  - [State Management](#state-management)
- [Delivery & Pricing Model](#delivery--pricing-model)
- [Getting Started](#getting-started)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database Schema Overview](#database-schema-overview)
- [Deployment](#deployment)
- [SEO Strategy](#seo-strategy)
- [Contributing](#contributing)

---

## Project Overview

**mkurugenzi.co.ke** is a professional B2C e-commerce platform targeting Kenya. It supports:

- Product catalog with categories, brands, and variants
- SEO-optimized URLs using slugs across all models
- Jumia-style multi-tier delivery: pickup stations per town + home delivery
- Mombasa example: 5 pickup stations (e.g., Nyali, Likoni, Changamwe, Bamburi, Mtwapa), each with its own delivery fee
- Authenticated user accounts with order tracking
- Cart, checkout, and payment integration (M-Pesa / card)

---

## Tech Stack

| Layer      | Technology                                      |
|------------|-------------------------------------------------|
| Backend    | Django 5.x, Django REST Framework, SimpleJWT    |
| Database   | PostgreSQL                                      |
| Media      | Cloudinary (product images)                     |
| Frontend   | React 18, React Router v6, Axios                |
| Styling    | Custom CSS (Jumia-inspired, blue/white theme)   |
| Auth       | JWT (access + refresh tokens)                   |
| Payments   | M-Pesa Daraja API, Stripe (card)                |
| SEO        | React Helmet Async, server-side slug routing    |
| Hosting    | Railway / Render (backend), Vercel (frontend)   |

---

## Project Structure

```
mkurugenzi/
├── backend/
│   ├── manage.py
│   ├── mkurugenzi/              # Django project settings
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/                    # ONE core app — all models live here
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── category.py
│   │   │   ├── product.py
│   │   │   ├── order.py
│   │   │   ├── delivery.py
│   │   │   └── review.py
│   │   ├── serializers/
│   │   ├── views/
│   │   ├── urls.py
│   │   ├── admin.py
│   │   └── signals.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx
    │   ├── styles/
    │   │   └── main.css
    │   ├── utils/
    │   │   └── api.js
    │   ├── components/
    │   │   ├── Navbar.jsx
    │   │   ├── Footer.jsx
    │   │   ├── ProductCard.jsx
    │   │   ├── CategoryBar.jsx
    │   │   ├── CartDrawer.jsx
    │   │   ├── DeliveryPicker.jsx
    │   │   ├── ReviewStars.jsx
    │   │   ├── Breadcrumb.jsx
    │   │   └── Spinner.jsx
    │   ├── pages/
    │   │   ├── index.jsx            # Homepage — hero, featured, deals
    │   │   ├── store.jsx            # Full product listing with filters
    │   │   ├── product_detail.jsx   # PDP + related products
    │   │   ├── category.jsx         # Category listing page
    │   │   ├── cart.jsx             # Cart page
    │   │   ├── checkout.jsx         # Multi-step checkout
    │   │   ├── orders.jsx           # My orders list
    │   │   ├── order_detail.jsx     # Single order tracking
    │   │   ├── profile.jsx          # Account settings
    │   │   ├── register.jsx         # Sign up
    │   │   └── login.jsx            # Sign in (email-based)
    │   └── contexts/
    │       ├── AuthContext.jsx
    │       └── CartContext.jsx
    ├── package.json
    └── vite.config.js
```

---

## Django Backend

### Core App & Models

All models live in a single Django app: **`core`**. This keeps the codebase simple and avoids cross-app import complexity.

#### `User` (custom)
```
id, email (unique, login field), full_name, phone, avatar,
is_verified, date_joined
```
> Login is by **email**, not username. `USERNAME_FIELD = 'email'`

#### `Category`
```
id, name, slug (auto from name), parent (self FK, nullable — for subcategories),
icon, image, description, is_active, sort_order
```
Example slugs: `electronics`, `electronics/phones`, `fashion/womens-shoes`

#### `Brand`
```
id, name, slug, logo, is_active
```

#### `Product`
```
id, name, slug (auto, unique), category (FK), brand (FK),
description, short_description,
price, compare_at_price (struck-through), cost_price,
stock, sku, is_active, is_featured, is_flash_deal,
flash_deal_ends_at, weight_kg, images (M2M → ProductImage),
tags, created_at, updated_at, meta_title, meta_description
```

#### `ProductImage`
```
id, product (FK), image_url, alt_text, is_primary, sort_order
```

#### `ProductVariant`  *(size, colour, etc.)*
```
id, product (FK), name, value, price_adjustment, stock, sku
```

#### `Review`
```
id, product (FK), user (FK), rating (1–5), title, body,
is_verified_purchase, created_at
```

#### `County`  *(47 Kenyan counties)*
```
id, name, slug
```

#### `Town`
```
id, county (FK), name, slug, has_station_delivery, has_home_delivery
```

#### `DeliveryStation`  *(Jumia-style pickup points)*
```
id, town (FK), name, slug, address, latitude, longitude,
fee (KES), is_active, operating_hours, contact_phone
```
Example — Mombasa:
| Station | Fee (KES) |
|---|---|
| Nyali Station | 149 |
| Likoni Station | 179 |
| Changamwe Station | 149 |
| Bamburi Station | 149 |
| Mtwapa Station | 199 |

#### `HomeDelivery`
```
id, town (FK), fee (KES), min_days, max_days, is_active
```
Fee is per town, set by admin (mirrors Jumia's per-zone home delivery pricing).

#### `Order`
```
id, order_number (unique, auto), user (FK, nullable — guest checkout),
status [pending|confirmed|processing|shipped|out_for_delivery|delivered|cancelled|refunded],
delivery_type [station|home],
station (FK, nullable), home_address (text, nullable),
town (FK), county (FK),
subtotal, delivery_fee, discount, total,
payment_method [mpesa|card|cod], payment_status, payment_ref,
notes, created_at, updated_at
```

#### `OrderItem`
```
id, order (FK), product (FK), variant (FK nullable),
product_name (snapshot), product_image (snapshot),
unit_price (snapshot), quantity, subtotal
```
> Prices are **snapshotted** at time of order — never affected by future product price changes.

#### `Coupon`
```
id, code, discount_type [percent|fixed], value,
min_order_amount, max_uses, used_count, expires_at, is_active
```

---

### SEO & Slugs

Every model that has a public-facing page uses a `slug` field:

```python
from django.utils.text import slugify

class Product(models.Model):
    name  = models.CharField(max_length=255)
    slug  = models.SlugField(unique=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name)
            slug = base
            n = 1
            while Product.objects.filter(slug=slug).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)
```

URL patterns use slugs throughout:

```
/                               → Homepage
/store/                         → All products
/category/<slug>/               → Category page
/product/<slug>/                → Product detail
/brands/<slug>/                 → Brand page
```

---

### API Endpoints

All endpoints are under `/api/v1/`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register/` | Register (email + password) |
| POST | `/auth/login/` | Login → returns JWT pair |
| POST | `/auth/token/refresh/` | Refresh access token |
| GET | `/products/` | Product list (filter, search, sort) |
| GET | `/products/<slug>/` | Product detail |
| GET | `/products/<slug>/related/` | Related products |
| GET | `/categories/` | Category tree |
| GET | `/categories/<slug>/` | Category + products |
| GET | `/cart/` | Get cart (session or user) |
| POST | `/cart/add/` | Add to cart |
| PATCH | `/cart/update/` | Update qty |
| DELETE | `/cart/remove/` | Remove item |
| GET | `/delivery/counties/` | All counties |
| GET | `/delivery/towns/<county_slug>/` | Towns in county |
| GET | `/delivery/stations/<town_slug>/` | Stations in town + fees |
| GET | `/delivery/home/<town_slug>/` | Home delivery fee + ETA |
| POST | `/orders/` | Place order |
| GET | `/orders/` | My orders (auth) |
| GET | `/orders/<order_number>/` | Order detail + tracking |
| GET | `/profile/` | My profile (auth) |
| PATCH | `/profile/` | Update profile |

---

## React Frontend

### Pages

| File | Route | Description |
|---|---|---|
| `index.jsx` | `/` | Hero banner, flash deals, featured categories, new arrivals |
| `store.jsx` | `/store` | Product grid, sidebar filters (category, price, brand, rating) |
| `product_detail.jsx` | `/product/:slug` | Images, price, variants, add to cart, reviews, related products |
| `category.jsx` | `/category/:slug` | Products filtered by category + subcategory breadcrumb |
| `cart.jsx` | `/cart` | Cart items, quantities, coupon, order summary |
| `checkout.jsx` | `/checkout` | 3-step: Delivery → Payment → Confirm |
| `orders.jsx` | `/orders` | Order history table (auth-gated) |
| `order_detail.jsx` | `/orders/:orderNumber` | Status tracker, items, delivery info |
| `profile.jsx` | `/profile` | Name, email, phone, password change |
| `register.jsx` | `/register` | Email + password sign up |
| `login.jsx` | `/login` | Email + password sign in |

### Components

| Component | Purpose |
|---|---|
| `Navbar` | Logo, search bar, cart icon, account menu |
| `Footer` | Links, social, M-Pesa badge, county info |
| `ProductCard` | Image, name, price, rating, add-to-cart |
| `CategoryBar` | Horizontal scrollable category pill bar |
| `CartDrawer` | Slide-in cart sidebar |
| `DeliveryPicker` | County → Town → Station/Home selector with live fee |
| `ReviewStars` | Star rating display and input |
| `Breadcrumb` | SEO-friendly breadcrumb trail |
| `Spinner` | Loading state |

### State Management

- **AuthContext** — JWT tokens, current user, login/logout
- **CartContext** — Cart items, add/remove/update, total
- Both use `localStorage` for persistence across page reloads

---

## Delivery & Pricing Model

```
User selects: County → Town → Delivery Type

If Station Delivery:
  → Lists all active DeliveryStation rows for that town
  → Each station shows its individual fee (KES)
  → User picks one station

If Home Delivery:
  → Shows the HomeDelivery fee for that town
  → Shows estimated delivery window (e.g., 2–4 business days)
```

### Example — Mombasa County, Mombasa Town

```
Station Delivery options:
  • Nyali Pick-up Station ........... KES 149
  • Likoni Pick-up Station .......... KES 179
  • Changamwe Pick-up Station ....... KES 149
  • Bamburi Pick-up Station ......... KES 149
  • Mtwapa Pick-up Station .......... KES 199

Home Delivery:
  • Door delivery, Mombasa .......... KES 299  (3–5 days)
```

---

## Getting Started

### Backend Setup

```bash
# 1. Clone and navigate
git clone https://github.com/your-org/mkurugenzi.git
cd mkurugenzi/backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and edit environment variables
cp .env.example .env

# 5. Run migrations
python manage.py migrate

# 6. Create superuser
python manage.py createsuperuser

# 7. Load initial data (counties, towns, sample stations)
python manage.py loaddata fixtures/counties.json
python manage.py loaddata fixtures/towns.json
python manage.py loaddata fixtures/stations.json

# 8. Run the dev server
python manage.py runserver
```

### Frontend Setup

```bash
cd mkurugenzi/frontend

# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

Visit `http://localhost:5173`

---

## Environment Variables

### Backend `.env`

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,mkurugenzi.co.ke

DATABASE_URL=postgres://user:password@localhost:5432/mkurugenzi

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
MPESA_CALLBACK_URL=https://mkurugenzi.co.ke/api/v1/payments/mpesa/callback/

CORS_ALLOWED_ORIGINS=http://localhost:5173,https://mkurugenzi.co.ke

JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
```

### Frontend `.env.local`

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_SITE_NAME=mkurugenzi.co.ke
VITE_CLOUDINARY_BASE=https://res.cloudinary.com/your-cloud/
```

---

## Database Schema Overview

```
User ──────────────────────────────┐
  │                                │
  ├─< Order >─────────────────────>│
  │     │                          │
  │     ├─< OrderItem >── Product  │
  │     │                    │     │
  │     ├── DeliveryStation  ├── Category
  │     └── Town             ├── Brand
  │           │              └── ProductVariant
  │           └── County
  │
  └─< Review >── Product
```

---

## Deployment

### Backend (Railway / Render)

```bash
# Procfile
web: gunicorn mkurugenzi.wsgi --log-file -

# requirements.txt must include:
gunicorn
psycopg2-binary
whitenoise
django-storages[cloudinary]
```

### Frontend (Vercel)

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Set `VITE_API_BASE_URL` in Vercel environment variables to your production backend URL.

---

## SEO Strategy

| Feature | Implementation |
|---|---|
| Slug-based URLs | All products, categories, brands use meaningful slugs |
| Meta tags | `<title>` and `<meta name="description">` per page via `react-helmet-async` |
| Open Graph | OG tags on product and category pages for social sharing |
| Structured data | JSON-LD `Product` schema on product detail pages |
| Canonical URLs | Canonical `<link>` on all paginated and filtered pages |
| Sitemap | Django `django.contrib.sitemaps` generates `/sitemap.xml` |
| Robots.txt | Blocks `/admin/`, `/api/`, `/checkout/`, `/cart/` |
| Breadcrumbs | Visible + JSON-LD `BreadcrumbList` schema |

Example product URL:
```
https://mkurugenzi.co.ke/product/samsung-galaxy-a55-5g-256gb-awesome-navy
```

---

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add M-Pesa STK push'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please follow the [Conventional Commits](https://www.conventionalcommits.org/) standard for commit messages.

---

**mkurugenzi.co.ke** — *Delivering Kenya's best, to your door.*

> Built with Steve Ongera  in Nairobi, Kenya 🇰🇪