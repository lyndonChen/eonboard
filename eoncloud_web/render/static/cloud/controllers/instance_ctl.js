'use strict';
/*
 CloudApp.controller('InstanceController', ['$rootScope', '$scope', '$state', '$filter', '$interval', '$modal', '$i18next', 'ngTableParams',
 'ToastrService', 'CommonHttpService', 'Instance', 'Image', 'Flavor', 'Network', 'status_desc',
 */
CloudApp.controller('InstanceController',
    function ($rootScope, $scope, $state, $filter, $interval, $modal, $i18next, ngTableParams, ToastrService,
              CommonHttpService, Instance, Image, Flavor, Network, status_desc) {
        $scope.$on('$viewContentLoaded', function () {
            Metronic.initAjax();
        });

        $rootScope.settings.layout.pageBodySolid = true;
        $rootScope.settings.layout.pageSidebarClosed = false;

        $scope.status_desc = status_desc;
        //$scope.instance_list = Instance.query();
        $scope.current_instance_data = []

        $scope.instance_table = new ngTableParams({
            page: 1,
            count: 10
        }, {
            counts: [],
            getData: function ($defer, params) {
                Instance.query(function (data) {
                    var data_list = params.sorting() ?
                        $filter('orderBy')(data, params.orderBy()) : name;
                    params.total(data_list.length);
                    $scope.current_instance_data = data_list.slice((params.page() - 1) * params.count(), params.page() * params.count());
                    $defer.resolve($scope.current_instance_data);
                });
            }
        });

        var previous_refresh = false;
        var timer = $interval(function () {
            var list = $scope.current_instance_data;
            var need_refresh = false;
            for (var i = 0; i < list.length; i++) {
                if (status_desc[list[i].status][1] == 0) {
                    need_refresh = true;
                    break;
                }
            }
            if (need_refresh) {
                $scope.instance_table.reload();
                previous_refresh = true;
            }
            else {
                if (previous_refresh) {
                    $scope.instance_table.reload();
                }
                previous_refresh = false;
            }

        }, 5000);
        $rootScope.timer_list.push(timer);

        $scope.modal_create_instance = function () {
            $modal.open({
                templateUrl: '/static/cloud/views/instance_create.html?t=' + Math.random(),
                controller: 'InstanceCreateController',
                backdrop: "static",
                size: 'lg',
                resolve: {
                    instance_table: function () {
                        return $scope.instance_table;
                    },
                    quota: function (CommonHttpService) {
                        return CommonHttpService.get("/api/account/quota/");
                    }
                }
            });
        };


        /////////////////////////
        $scope.checkboxes = {'checked': false, items: {}};

        // watch for check all checkbox
        $scope.$watch('checkboxes.checked', function (value) {
            angular.forEach($scope.current_instance_data, function (item) {
                if (angular.isDefined(item.id)) {
                    $scope.checkboxes.items[item.id] = value;
                }
            });
        });

        // watch for data checkboxes
        $scope.$watch('checkboxes.items', function (values) {
            $scope.checked_count = 0;
            if (!$scope.current_instance_data) {
                return;
            }
            var checked = 0, unchecked = 0,
                total = $scope.current_instance_data.length;

            angular.forEach($scope.current_instance_data, function (item) {
                checked += ($scope.checkboxes.items[item.id]) || 0;
                unchecked += (!$scope.checkboxes.items[item.id]) || 0;
            });
            if ((unchecked == 0) || (checked == 0)) {
                $scope.checkboxes.checked = ((checked == total) && total != 0);
            }

            $scope.checked_count = checked;
            // grayed checkbox
            angular.element(document.getElementById("select_all")).prop("indeterminate", (checked != 0 && unchecked != 0));
        }, true);
        ////////////////////////

        var need_confirm = true;
        var no_confirm = false;

        var post_action = function (ins, action) {
            var post_data = {
                "action": action,
                "instance": ins.id
            }
            CommonHttpService.post("/api/instances/" + ins.id + "/action/", post_data).then(function (data) {
                if (data.OPERATION_STATUS == 1) {
                    $scope.instance_table.reload();
                }
                else {
                    ToastrService.error($i18next("op_failed_msg"), $i18next("op_failed"));
                }
            });
        };
        var do_instance_action = function (ins, action, need_confirm) {
            if (need_confirm) {
                bootbox.confirm($i18next("instance.confirm_" + action), function (confirm) {
                    if (confirm) {
                        post_action(ins, action);
                    }
                });
            }
            else {
                post_action(ins, action);
            }
        };

        var instance_reboot = function (ins) {
            do_instance_action(ins, "reboot", need_confirm);
        };

        var instance_terminate = function (ins) {
            do_instance_action(ins, "terminate", need_confirm);
        };

        var instance_power_on = function (ins) {
            do_instance_action(ins, "power_on", no_confirm);
        };

        var instance_power_off = function (ins) {
            do_instance_action(ins, "power_off", need_confirm);
        };


        var instance_vnc_console = function (ins) {
            var post_data = {
                "action": "vnc_console",
                "instance": ins.id
            }
            $modal.open({
                templateUrl: 'vnc_console.html',
                controller: 'InstanceVNCController',
                backdrop: "static",
                //windowClass: 'large-Modal',
                size: 'lg',
                scope: $scope,
                resolve: {
                    'vnc_console': function (CommonHttpService) {
                        return CommonHttpService.post("/api/instances/" + ins.id + "/action/", post_data);
                    }
                }
            });
        };

        var instance_floating_ip = function (ins, action) {
            var modalInstance = $modal.open({
                templateUrl: 'floating.html',
                controller: 'InstanceFloatingController',
                backdrop: "static",
                resolve: {
                    type: function () {
                        return action;
                    },
                    floating_ips: function (CommonHttpService) {
                        return CommonHttpService.get("/api/floatings/");
                    },
                    instance_table: function () {
                        return $scope.instance_table;
                    },
                    instance: function () {
                        return ins;
                    }
                }
            });

            modalInstance.result.then(function (result) {
            }, function (result) {
            });
        };

        var instance_bind_floating = function (ins) {
            instance_floating_ip(ins, 'bind');
        }

        var instance_unbind_floating = function (ins) {
            instance_floating_ip(ins, 'unbind');
        }

        var instance_change_firewall = function (ins) {
            var modalInstance = $modal.open({
                templateUrl: 'firewall.html',
                controller: 'InstanceChangeFirewallController',
                backdrop: "static",
                resolve: {
                    firewalls: function (CommonHttpService) {
                        return CommonHttpService.get("/api/firewall/");
                    },
                    instance_table: function () {
                        return $scope.instance_table;
                    },
                    instance: function () {
                        return ins;
                    }

                }
            });

            modalInstance.result.then(function (result) {
            }, function (result) {
            });
        };

        var instance_volume = function (ins, action) {
            //挂载硬盘
            if (action == "attach") {
                var volumes = null;
                CommonHttpService.get("/api/volumes/search/").then(function (data) {
                    $scope.volumes = data;
                });
            }
            else {
                //卸载硬盘
                var post_data = {
                    'instance_id': ins.id
                }
                CommonHttpService.post("/api/volumes/search/", post_data).then(function (data) {
                    $scope.volumes = data;
                });
            }
            $scope.instance = ins;
            var modalInstance = $modal.open({
                templateUrl: 'volume.html',
                controller: 'InstanceVolumeController',
                backdrop: "static",
                scope: $scope,
                resolve: {
                    type: function () {
                        return action;
                    },
                    instance_table: function () {
                        return $scope.instance_table;
                    }
                }
            });

            modalInstance.result.then(function (result) {
            }, function (result) {
            });
        }

        var instance_attach_volume = function (ins) {
            instance_volume(ins, "attach");
        };

        var instance_detach_volume = function (ins) {
            instance_volume(ins, "detach");
        };


        var action_func = {
            "reboot": instance_reboot,
            "power_on": instance_power_on,
            "power_off": instance_power_off,
            "vnc_console": instance_vnc_console,
            "bind_floating": instance_bind_floating,
            "unbind_floating": instance_unbind_floating,
            "change_firewall": instance_change_firewall,
            "attach_volume": instance_attach_volume,
            "detach_volume": instance_detach_volume,
            "terminate": instance_terminate
        }

        $scope.instance_action = function (ins, action) {
            action_func[action](ins);
        }

        $scope.batch_action = function (action) {
            bootbox.confirm($i18next("instance.confirm_" + action), function (confirm) {
                if (confirm) {
                    var items = $scope.checkboxes.items;
                    var items_key = Object.keys(items);
                    for (var i = 0; i < items_key.length; i++) {
                        if (items[items_key[i]]) {
                            post_action({"id": items_key[i]}, action);
                            $scope.checkboxes.items[items_key[i]] = false;
                        }
                    }
                }
            });
        }

    });

CloudApp.controller('InstanceVNCController', function ($rootScope, $scope, $sce, $modalInstance, vnc_console) {
    $scope.vnc_console = vnc_console;
    $scope.vnc_sce_url = function (vnc_console) {
        return $sce.trustAsResourceUrl(vnc_console.vnc_url);
    };

    $scope.cancel = function () {
        $modalInstance.dismiss();
    };
});

CloudApp.controller('InstanceFloatingController',
    function ($rootScope, $scope, $modalInstance, $i18next, $state, ToastrService, CommonHttpService, floating_ips, type, instance_table, instance) {
        $scope.is_bind = type == "bind";

        $scope.cancel = function () {
            $modalInstance.dismiss();
        }

        $scope.instance = instance;
        $scope.has_error = false;
        $scope.selected_ip = false;
        $scope.floating_ips = [];
        if (type == "bind") {
            for (var i = 0; i < floating_ips.length; i++) {
                if (floating_ips[i].status == 10 && floating_ips[i].instance == null) {
                    $scope.floating_ips.push(floating_ips[i]);
                }
            }
        }
        else {
            for (var i = 0; i < floating_ips.length; i++) {
                if (floating_ips[i].status == 20 && floating_ips[i].instance == instance.id) {
                    $scope.floating_ips.push(floating_ips[i]);
                }
            }
        }
        $scope.action = function (floating, action) {
            if (floating) {
                var post_data = {
                    "action": action,
                    "floating_id": floating.id,
                    "instance_id": $scope.instance.id
                };
                CommonHttpService.post("/api/floatings/action/", post_data).then(function (data) {
                    $modalInstance.dismiss();
                    if (data.OPERATION_STATUS == 1) {
                        ToastrService.success($i18next("floatingIP.create_success_and_waiting"), $i18next("success"));
                        $state.go("floating");
                    }
                    else {
                        ToastrService.error($i18next("op_failed_msg"), $i18next("op_failed"));
                    }
                });
            }
            else {
                $scope.has_error = true;
                $scope.selected_ip = false;
            }
        }
    });
CloudApp.controller('InstanceChangeFirewallController',
    function ($rootScope, $scope, $modalInstance, $i18next, $state, ToastrService, CommonHttpService, firewalls, instance_table, instance) {
        $scope.cancel = function () {
            $modalInstance.dismiss();
        }

        $scope.instance = instance;
        $scope.has_error = false;
        $scope.selected_firewall = false;
        $scope.firewalls = firewalls;

        $scope.action = function (firewall) {
            if (firewall) {
                var post_data = {
                    "firewall_id": firewall.id,
                    "instance_id": $scope.instance.id
                };
                CommonHttpService.post("/api/firewall/server_change_firewall/", post_data).then(function (data) {
                    $modalInstance.dismiss();
                    if (data.OPERATION_STATUS == 1) {
                        ToastrService.success(data.MSG, $i18next("success"));
                    }
                    else {
                        ToastrService.error(data.MSG, $i18next("op_failed"));
                    }
                });
            }
            else {
                $scope.has_error = true;
                $scope.selected_firewall = false;
            }
        }
    });


CloudApp.controller('InstanceVolumeController', function ($rootScope, $scope, $modalInstance, $i18next, ToastrService, type, instance_table, CommonHttpService) {
    $scope.is_attach = type == "attach";

    $scope.cancel = function () {
        $modalInstance.dismiss();
    }

    $scope.has_error = false;
    $scope.selected_volume = false;

    $scope.attach = function (volume) {
        if (volume) {
            var post_data = {
                "volume_id": volume.id,
                "instance_id": $scope.instance.id,
                "action": type
            }
            CommonHttpService.post("/api/volumes/action/", post_data).then(function (data) {
                if (data.OPERATION_STATUS == 1) {
                    ToastrService.success($i18next("volume.update_success"), $i18next("success"));
                    //volume_table.reload();
                }
                else {
                    ToastrService.error($i18next("op_failed_msg"), $i18next("op_failed"));
                }
                $modalInstance.dismiss();
            });
        }
        else {
            $scope.has_error = true;
            $scope.selected_volume = false;
        }
    }
});


CloudApp.controller('InstanceCreateController',
    function ($rootScope, $scope, $state, $filter, $interval, $modalInstance, $i18next, ngTableParams, ToastrService,
              CommonHttpService, Instance, Image, Flavor, Network, instance_table, quota) {

        $scope.instance_config = {
            "instance": 1
        };

        Image.query(function (data) {
            $scope.images_list = data;
            if (data.length > 0) {
                $scope.instance_config.image = data[0];
                $scope.instance_config.select_image = data[0];
                $scope.instance_config.login_type = 'password';
            }
        });

        Flavor.query(function (data) {
            $scope.flavors_list = data;

            if (data.length > 0) {
                var cpu_memory_list = new Object();
                var cpu_array = new Array();
                var memory_array = new Array();
                for (var i = 0; i < data.length; i++) {
                    cpu_memory_list["" + data[i].cpu] = [];

                    if (cpu_array.indexOf(data[i].cpu) == -1) {
                        cpu_array.push(data[i].cpu);
                    }
                    if (memory_array.indexOf(data[i].memory) == -1) {
                        memory_array.push(data[i].memory);
                    }
                }
                for (var i = 0; i < data.length; i++) {
                    if (cpu_memory_list["" + data[i].cpu].indexOf(data[i].memory) == -1) {

                        cpu_memory_list["" + data[i].cpu].push(data[i].memory)
                    }
                }

                $scope.cpu_list = cpu_array;
                $scope.memory_list = memory_array;

                $scope.cpu_memory_map = cpu_memory_list;

                $scope.instance_config.vcpu = cpu_array[0];
                $scope.instance_config.memory = cpu_memory_list["" + cpu_array[0]][0];
                $scope.instance_config.cpu_memory = cpu_memory_list["" + cpu_array[0]];

                $scope.cpu_click = function (cpu) {
                    $scope.instance_config.vcpu = cpu;
                    $scope.instance_config.memory = $scope.cpu_memory_map["" + cpu][0];
                    $scope.instance_config.cpu_memory = $scope.cpu_memory_map[cpu];
                };
            }
        });

        Network.query(function (data) {
            $scope.network_list = data;
            if (data.length > 0) {
                $scope.instance_config.network = data[0];
            }
            else {
                $scope.instance_config.network = 0;
            }
        });

        $scope.cancel = function () {
            $modalInstance.dismiss();
        };

        $scope.submit_click = function (instance_config) {
            var post_data = {
                "name": instance_config.name,
                "cpu": instance_config.vcpu,
                "memory": instance_config.memory,
                "network_id": instance_config.network == 0 ? 0 : instance_config.network.id,
                "image": instance_config.select_image.id,
                "image_info": instance_config.select_image.id,
                "sys_disk": instance_config.select_image.disk_size,
                "password": instance_config.password

            }
            CommonHttpService.post("/api/instances/create/", post_data).then(function (data) {
                if (data.OPERATION_STATUS == 1) {
                    ToastrService.success($i18next("instance.create_success_and_waiting"), $i18next("success"));
                    instance_table.reload();
                }
                else {
                    ToastrService.error($i18next("op_failed_msg"), $i18next("op_failed"));
                }
                $modalInstance.dismiss();
            });
        };

        $scope.quota = quota;
        $scope.calcuate_resource_persent = function (resource) {
            if (quota[resource] <= 0) {
                return 0;
            }
            else {
                return (quota[resource + "_used"] + $scope.instance_config[resource] ) / quota[resource] * 100;

            }
        };
        $scope.resource_persent = function(resource){
            return $scope.calcuate_resource_persent(resource) + "%";
        }
        $scope.resource_persent_desc = function (resource) {
            var str = "";
                str += (quota[resource + "_used"] + $scope.instance_config[resource] ) + "/";
                if (quota[resource] <= 0) {
                    str += "Free";
                }
                else {
                    str += quota[resource];
                }
            return str;
        };
        $scope.check_can_submit = function(){
            if($scope.calcuate_resource_persent("instance") > 100){
                return true;
            }
            if($scope.calcuate_resource_persent("vcpu") > 100){
                return true;
            }
            if($scope.calcuate_resource_persent("memory") > 100){
                return true;
            }
            return false;
        }
    });
