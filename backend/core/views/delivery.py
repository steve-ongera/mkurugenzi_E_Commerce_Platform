from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from core.models import County, Town, DeliveryStation, HomeDelivery
from core.serializers import (
    CountySerializer, TownSerializer,
    DeliveryStationSerializer, HomeDeliverySerializer,
)


class CountyListView(APIView):
    """List all counties with their towns."""
    permission_classes = [AllowAny]

    def get(self, request):
        counties = County.objects.prefetch_related('towns').order_by('name')
        return Response(CountySerializer(counties, many=True).data)


class TownDetailView(APIView):
    """Full town detail: stations + home delivery options."""
    permission_classes = [AllowAny]

    def get(self, request, slug):
        try:
            town = (
                Town.objects
                .select_related('county')
                .prefetch_related('stations', 'home_delivery')
                .get(slug=slug, is_active=True)
            )
        except Town.DoesNotExist:
            raise NotFound('Town not found.')
        return Response(TownSerializer(town).data)


class StationListView(APIView):
    """All active pick-up stations for a given town."""
    permission_classes = [AllowAny]

    def get(self, request, town_slug):
        stations = (
            DeliveryStation.objects
            .filter(town__slug=town_slug, is_active=True)
            .select_related('town__county')
            .order_by('fee', 'name')
        )
        return Response(DeliveryStationSerializer(stations, many=True).data)


class HomeDeliveryDetailView(APIView):
    """Home delivery fee & ETA for a given town."""
    permission_classes = [AllowAny]

    def get(self, request, town_slug):
        try:
            hd = HomeDelivery.objects.select_related('town__county').get(
                town__slug=town_slug, is_active=True
            )
        except HomeDelivery.DoesNotExist:
            raise NotFound('Home delivery not available for this town.')
        return Response(HomeDeliverySerializer(hd).data)