"""
core/views/payment.py
M-Pesa Daraja API — STK Push (Lipa na M-Pesa Online)
"""
import base64
import json
import requests
from datetime import datetime
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status
from core.models import Order


def _get_mpesa_token():
    """Fetch OAuth bearer token from Daraja."""
    env = settings.MPESA_ENVIRONMENT
    base_url = (
        'https://sandbox.safaricom.co.ke'
        if env == 'sandbox'
        else 'https://api.safaricom.co.ke'
    )
    credentials = base64.b64encode(
        f'{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}'.encode()
    ).decode()
    resp = requests.get(
        f'{base_url}/oauth/v1/generate?grant_type=client_credentials',
        headers={'Authorization': f'Basic {credentials}'},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()['access_token'], base_url


def _generate_password(shortcode, passkey, timestamp):
    raw = f'{shortcode}{passkey}{timestamp}'
    return base64.b64encode(raw.encode()).decode()


class MpesaInitiateView(APIView):
    """
    POST /payments/mpesa/initiate/
    Body: { order_number, phone }
    Triggers STK push to the customer's phone.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        order_number = request.data.get('order_number', '').strip()
        phone        = request.data.get('phone', '').strip()

        # Normalize phone: 0712... → 254712...
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('+'):
            phone = phone[1:]

        try:
            order = Order.objects.get(order_number=order_number)
        except Order.DoesNotExist:
            return Response({'detail': 'Order not found.'}, status=404)

        if order.payment_status == 'paid':
            return Response({'detail': 'Order already paid.'}, status=400)

        amount = int(order.total)  # M-Pesa expects integer KES

        try:
            token, base_url = _get_mpesa_token()
            timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
            password  = _generate_password(
                settings.MPESA_SHORTCODE, settings.MPESA_PASSKEY, timestamp
            )

            payload = {
                'BusinessShortCode': settings.MPESA_SHORTCODE,
                'Password':          password,
                'Timestamp':         timestamp,
                'TransactionType':   'CustomerPayBillOnline',
                'Amount':            amount,
                'PartyA':            phone,
                'PartyB':            settings.MPESA_SHORTCODE,
                'PhoneNumber':       phone,
                'CallBackURL':       settings.MPESA_CALLBACK_URL,
                'AccountReference':  order_number,
                'TransactionDesc':   f'Payment for order {order_number} — Mkurugenzi',
            }

            resp = requests.post(
                f'{base_url}/mpesa/stkpush/v1/processrequest',
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=15,
            )
            data = resp.json()

            if data.get('ResponseCode') == '0':
                # Store checkout request ID for callback matching
                order.payment_ref = data.get('CheckoutRequestID', '')
                order.mpesa_phone = phone
                order.save(update_fields=['payment_ref', 'mpesa_phone'])
                return Response({
                    'detail':             'STK push sent. Enter your M-Pesa PIN.',
                    'checkout_request_id': data.get('CheckoutRequestID'),
                })
            else:
                return Response({'detail': data.get('errorMessage', 'M-Pesa request failed.')},
                                status=status.HTTP_502_BAD_GATEWAY)

        except Exception as e:
            return Response({'detail': f'Payment initiation failed: {str(e)}'},
                            status=status.HTTP_502_BAD_GATEWAY)


class MpesaCallbackView(APIView):
    """
    POST /payments/mpesa/callback/
    Receives Daraja STK push result.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        try:
            body       = request.data
            stk_result = body['Body']['stkCallback']
            result_code = stk_result['ResultCode']
            checkout_id = stk_result['CheckoutRequestID']

            order = Order.objects.filter(payment_ref=checkout_id).first()
            if not order:
                return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

            if result_code == 0:
                # Payment successful
                items         = stk_result.get('CallbackMetadata', {}).get('Item', [])
                receipt_meta  = next((i for i in items if i['Name'] == 'MpesaReceiptNumber'), None)
                receipt_number = receipt_meta['Value'] if receipt_meta else ''

                order.payment_status = 'paid'
                order.status         = 'confirmed'
                order.payment_ref    = receipt_number
                order.save(update_fields=['payment_status', 'status', 'payment_ref'])
            else:
                # Payment failed or cancelled
                order.payment_status = 'failed'
                order.save(update_fields=['payment_status'])

        except Exception:
            pass  # Never return error to Daraja — it will retry

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})