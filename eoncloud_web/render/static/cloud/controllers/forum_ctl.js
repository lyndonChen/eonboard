'use strict';

CloudApp.controller('ForumController',
    function($window, $rootScope, $scope, $interval,
             $modal, $i18next, $timeout, ForumReply,
             CommonHttpService,ToastrService) {
    $scope.$on('$viewContentLoaded', function() {   
        Metronic.initAjax();
        CommonHttpService.get('/api/forums/').then(function(data){
            $scope.forum_list =  data
            $scope.current_forum = data[0]
            $scope.forums_click($scope.current_forum);
        });
    });

    $rootScope.settings.layout.pageBodySolid = true;
    $rootScope.settings.layout.pageSidebarClosed = false;

    $scope.forum_list = [];
    $scope.forum_reply_list = [];
    $scope.reply_content = '';

    $scope.create_forum_model = function(){
        var modalForum =$modal.open({
            templateUrl: 'forum_create.html',
            controller: 'ForumCreateController',
            backdrop: "static",
            scope: $scope,
            resolve: {
            }
        });
    }

    $scope.forums_click = function(forum){
        $scope.current_forum = forum
        var post_data = {
            'forum_id':forum.id
        };

        $scope.forum_reply_list = ForumReply.query({forum_id: forum.id});
    };

    $scope.close_forum = function(forum){
        bootbox.confirm($i18next("forum.confirm_close"), function (confirm) {
            if (confirm) {
                var post_data={
                    "id":forum.id
                }
                CommonHttpService.post("/api/forums/close/", post_data).then(function (data) {
                    if (data.OPERATION_STATUS == 1) {
                        $scope.current_forum = data.data
                        CommonHttpService.get('/api/forums/').then(function(data2){
                            $scope.forum_list =  data2
                        });
                    }
                    else {
                        ToastrService.error(data.MSG, $i18next("op_failed"));
                    }
                });
            }
        });
    }
    $scope.forumReply =function(current_forum,reply_content){
        var post_data={
            "reply_content":reply_content,
            "forum":current_forum.id
        }
        $scope.reply_content = '';
        CommonHttpService.post("/api/forums/reply/create/", post_data).then(function (data) {
            if (data.OPERATION_STATUS == 1) {
                $scope.forums_click(current_forum)
            }
            else {
                ToastrService.error(data.MSG, $i18next("op_failed"));
            }
        });
    }
});
CloudApp.controller('ForumCreateController', function($rootScope, $scope,$modalInstance,$i18next,$timeout, CommonHttpService,ToastrService) {
    //关闭窗口方法
    $scope.cancel = function () {
        $modalInstance.dismiss();
    };
    $scope.forum = {}
    $scope.create_forum = function(forum){
        var post_data = {
            "title":forum.title,
            "content":forum.content
        }
        CommonHttpService.post('/api/forums/create/',post_data).then(function(data){
            if (data.OPERATION_STATUS == 1) {
                CommonHttpService.get('/api/forums/').then(function(data2){
                    $scope.forum_list =  data2
                });
            }
            else {
                ToastrService.error(data.MSG, $i18next("op_failed"));
            }
            $modalInstance.dismiss();
        });
    }
});


