#coding=utf-8

from django.contrib import admin
from biz.account.models import UserProfile, Contract, Quota


class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "mobile", "user_type", "balance")


class ContractAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "customer", "start_date", "end_date")


class QuotaAdmin(admin.ModelAdmin):
    list_display = ("id", "contract", "resource", "limit")



admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(Contract, ContractAdmin)
admin.site.register(Quota, QuotaAdmin)

