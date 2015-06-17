#coding=utf-8

from django.contrib.auth.models import User
from rest_framework import serializers


from biz.account.models import Contract, Quota


class ContractSerializer(serializers.ModelSerializer):
    quotas = serializers.ReadOnlyField(source="get_quotas")
    start_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", required=False, allow_null=True)
    end_date = serializers.DateTimeField(format="%Y-%m-%d %H:%M", required=False, allow_null=True)

    class Meta:
        model = Contract


class QuotaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quota

