"""
core/signals.py
Post-save signals for order confirmation emails, etc.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from core.models import Order


@receiver(post_save, sender=Order)
def send_order_confirmation(sender, instance, created, **kwargs):
    """Send confirmation email when a new order is placed."""
    if not created:
        return

    email = instance.customer_email
    if not email:
        return

    subject = f'Order Confirmed — {instance.order_number} | Mkurugenzi'
    message = (
        f'Hi {instance.customer_name},\n\n'
        f'Thank you for your order!\n\n'
        f'Order Number: {instance.order_number}\n'
        f'Total: KES {instance.total}\n'
        f'Delivery: {instance.get_delivery_type_display()}\n\n'
        f'Track your order at: {settings.SITE_URL}/orders/{instance.order_number}\n\n'
        f'— Mkurugenzi Team'
    )

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [email],
            fail_silently=True,
        )
    except Exception:
        pass