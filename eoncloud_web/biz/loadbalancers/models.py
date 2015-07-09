from django.db import models
from django.utils.translation import ugettext_lazy as _
from .settings import POOL_CREATING, POOL_ACTIVE, POOL_ERROR, POOL_STATES, \
    PROTOCOL_CHOICES, LB_METHOD_CHOICES, ADMIN_STATE_UP, MONITOR_TYPE, PROVIDER_CHOICES, SESSION_PER_CHOICES
# Create your models here.


class BalancerPool(models.Model):
    id = models.AutoField(primary_key=True)

    pool_uuid = models.CharField(_("Pool UUID"), null=True, blank=True, max_length=40)
    name = models.CharField(_("Pool name"), null=False, blank=False, max_length=64)
    description = models.CharField(_("Description"), null=False, blank=True, max_length=128)
    subnet = models.ForeignKey('network.Subnet')
    protocol = models.IntegerField(_("protocol"), choices=PROTOCOL_CHOICES)
    lb_method = models.IntegerField(_("lb_method"), choices=LB_METHOD_CHOICES)
    provider = models.IntegerField(_("Provider"), default=0, choices=PROVIDER_CHOICES)
    admin_state_up = models.BooleanField(_("admin state up"), default=True, choices=ADMIN_STATE_UP)
    vip = models.ForeignKey("loadbalancers.BalancerVIP",  null=True, blank=True)

    status = models.IntegerField(_("Status"), default=POOL_CREATING, choices=POOL_STATES)
    create_date = models.DateTimeField(_("Create Date"), auto_now_add=True)
    deleted = models.BooleanField(_("Deleted"), default=False)
    user = models.ForeignKey('auth.User')
    user_data_center = models.ForeignKey('idc.UserDataCenter')

    class Meta:
        db_table = "balance_pools"


class BalancerMember(models.Model):
    id = models.AutoField(primary_key=True)
    pool = models.ForeignKey('loadbalancers.BalancerPool', null=True, blank=True)
    instance = models.ForeignKey("instance.Instance", null=True, blank=True)

    member_uuid = models.CharField(_("Member_UUID"), null=True, blank=True, max_length=40)
    address = models.CharField(_("Address"), null=True, blank=True, max_length=20)
    protocol_port = models.CharField(_('protocol_port'), null=True, blank=True, max_length=10)
    weight = models.IntegerField(_('Weight'))
    admin_state_up = models.BooleanField(_("admin state up"), default=True, choices=ADMIN_STATE_UP)

    status = models.IntegerField(_("Status"), default=POOL_CREATING, choices=POOL_STATES)
    create_date = models.DateTimeField(_("Create Date"), auto_now_add=True)
    deleted = models.BooleanField(_("Deleted"), default=False)
    user = models.ForeignKey('auth.User')
    user_data_center = models.ForeignKey('idc.UserDataCenter')

    class Meta:
        db_table = 'balancer_member'


class BalancerVIP(models.Model):
    id = models.AutoField(primary_key=True)
    vip_uuid = models.CharField(_('VIP_uuid'), null=False, blank=True, max_length=40)

    name = models.CharField(_("Pool name"), null=True, blank=True, max_length=64)
    description = models.CharField(_("Description"), null=True, blank=True, max_length=128)

    pool = models.ForeignKey('loadbalancers.BalancerPool', null=True, blank=True)
    subnet = models.ForeignKey("network.Subnet", null=True, blank=True)
    public_address = models.CharField(_('Address'), null=True, blank=True, max_length=20)
    address = models.CharField(_('Address'), null=True, blank=True, max_length=20)
    protocol = models.IntegerField(_("protocol"), choices=PROTOCOL_CHOICES)
    protocol_port = models.CharField(_('protocol_port'), null=True, blank=True, max_length=10)

    port_id = models.CharField(_("port_id"), null=True, blank=True,max_length=40)
    session_persistence = models.IntegerField(_('session_persistence'), choices=SESSION_PER_CHOICES, null=True, blank=True)
    connection_limit = models.IntegerField(_("connection_limit"), default=-1)
    admin_state_up = models.BooleanField(_("admin state up"), default=True, choices=ADMIN_STATE_UP)
    status = models.IntegerField(_("Status"), default=POOL_CREATING, choices=POOL_STATES)

    create_date = models.DateTimeField(_("Create Date"), auto_now_add=True)
    deleted = models.BooleanField(_("Deleted"), default=False)
    user = models.ForeignKey('auth.User')
    user_data_center = models.ForeignKey('idc.UserDataCenter')

    class Meta:
        db_table = 'balancer_vip'

    @property
    def session_persistence_desc(self):
        return dict(SESSION_PER_CHOICES)[self.session_persistence]


class BalancerMonitor(models.Model):
    id = models.AutoField(primary_key=True)
    monitor_uuid = models.CharField(_('monitor_uuid'), null=False, blank=True, max_length=40)

    type = models.IntegerField(_("Type"), choices=MONITOR_TYPE)
    delay = models.IntegerField(_("delay"), null=True, blank=True, max_length=10)
    timeout = models.IntegerField(_("timeout"), null=True, blank=True, max_length=10)
    max_retries = models.IntegerField(_("max_retries"))
    http_method = models.CharField(_("http_method"), default="POST", null=True, blank=True, max_length=10)
    url_path = models.CharField(_("url_path"), default="/",  null=True, blank=True, max_length=10)
    expected_codes = models.CharField(_("expected_codes"), default="200", null=True, blank=True, max_length=128)
    admin_state_up = models.BooleanField(_("admin state up"), default=True, choices=ADMIN_STATE_UP)

    create_date = models.DateTimeField(_("Create Date"), auto_now_add=True)
    deleted = models.BooleanField(_("Deleted"), default=False)
    user = models.ForeignKey('auth.User')
    user_data_center = models.ForeignKey('idc.UserDataCenter')

    @property
    def balancer(self):
        query_set = BalancerPoolMonitor.objects.filter(monitor=self.id)
        desc = ""
        if len(query_set) > 0:
            for b in query_set:
                if desc != '':
                    desc += ","
                desc += b.pool.name
        return desc

    class Meta:
        db_table = 'balancer_monitor'


class BalancerPoolMonitor(models.Model):
    id = models.AutoField(primary_key=True)
    monitor = models.ForeignKey("loadbalancers.BalancerMonitor", related_name="monitor_re")
    pool = models.ForeignKey("loadbalancers.BalancerPool", related_name="pool_re")

    class Meta:
        db_table = 'balancer_pool_monitor'
