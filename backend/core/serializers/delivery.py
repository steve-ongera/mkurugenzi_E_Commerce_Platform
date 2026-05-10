from rest_framework import serializers
from core.models import County, Town, DeliveryStation, HomeDelivery


class DeliveryStationSerializer(serializers.ModelSerializer):
    town_name   = serializers.CharField(source='town.name', read_only=True)
    county_name = serializers.CharField(source='town.county.name', read_only=True)

    class Meta:
        model  = DeliveryStation
        fields = [
            'id', 'name', 'slug', 'address',
            'latitude', 'longitude', 'fee',
            'operating_hours', 'contact_phone',
            'town_name', 'county_name',
        ]


class HomeDeliverySerializer(serializers.ModelSerializer):
    town_name   = serializers.CharField(source='town.name', read_only=True)
    county_name = serializers.CharField(source='town.county.name', read_only=True)
    eta_display = serializers.ReadOnlyField()

    class Meta:
        model  = HomeDelivery
        fields = ['id', 'fee', 'min_days', 'max_days', 'eta_display', 'town_name', 'county_name']


class TownSerializer(serializers.ModelSerializer):
    stations     = DeliveryStationSerializer(many=True, read_only=True)
    home_delivery = HomeDeliverySerializer(read_only=True)
    county_name  = serializers.CharField(source='county.name', read_only=True)
    county_slug  = serializers.CharField(source='county.slug', read_only=True)

    class Meta:
        model  = Town
        fields = [
            'id', 'name', 'slug',
            'county_name', 'county_slug',
            'has_station_delivery', 'has_home_delivery',
            'stations', 'home_delivery',
        ]


class CountySerializer(serializers.ModelSerializer):
    towns = serializers.SerializerMethodField()

    class Meta:
        model  = County
        fields = ['id', 'name', 'slug', 'towns']

    def get_towns(self, obj):
        active = obj.towns.filter(is_active=True).order_by('name')
        return [{'id': t.id, 'name': t.name, 'slug': t.slug,
                 'has_station_delivery': t.has_station_delivery,
                 'has_home_delivery': t.has_home_delivery}
                for t in active]