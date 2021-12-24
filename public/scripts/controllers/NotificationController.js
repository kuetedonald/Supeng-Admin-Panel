angular.module('main').controller('NotificationCtrl',
  function ($scope, $translate, $mdDialog, Auth, Notification, User, Item, Brand, Category, SubCategory, Toast) {

    $scope.notification = new Notification;

    $scope.notifications = [];

    $scope.loadNotifications = function () {
      Auth.ensureLoggedIn().then(function () {
        Notification.all().then(function (notifications) {
          $scope.notifications = notifications;
          $scope.$apply();
        });
      });
    };

    $scope.loadNotifications();

    $scope.onTypeChanged = function () {
      $scope.notification.item = null;
      $scope.notification.brand = null;
      $scope.notification.category = null;
      $scope.notification.subcategory = null;
    };

    $scope.onDeleteNotification = function (notification) {

      $translate(['DELETE', 'CONFIRM_DELETE', 'CONFIRM', 'CANCEL', 'DELETED'])
        .then(function (str) {

          var confirm = $mdDialog.confirm()
            .title(str.DELETE)
            .textContent(str.CONFIRM_DELETE)
            .ariaLabel(str.DELETE)
            .ok(str.CONFIRM)
            .cancel(str.CANCEL);

          $mdDialog.show(confirm).then(function () {

            notification.destroy().then(function () {
              $translate('DELETED').then(function (str) {
                Toast.show(str);
              });
              $scope.$apply();
              $scope.loadNotifications();
            }, function (error) {
              $scope.$apply();
              Toast.show(error.message)
            });
          });
        });
    };

    $scope.queryItems = function (query) {
      var query = query || '';
      return Item.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.queryBrands = function (query) {
      var query = query || '';
      return Brand.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.queryCategories = function (query) {
      var query = query || '';
      return Category.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.querySubCategories = function (query) {
      var query = query || '';
      return SubCategory.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.queryUsers = function (query) {
      var query = query || '';
      var ids = $scope.notification.users.map(function (user) {
        return user.id
      });
      return User.all({
        canonical: query.toLowerCase(),
        anonymous: false,
        exclude: ids,
        orderBy: 'asc',
        type: 'customer',
        orderByField: 'name',
        limit: 10,
        page: 1,
      }).then(function (data) {
        return data.users;
      });
    };

    $scope.onSubmit = function () {

      $scope.isSending = true;

      Notification.save($scope.notification).then(function () {

        $translate('SENT').then(function (str) {
          Toast.show(str);
        });

        $scope.notifications.unshift($scope.notification);
        $scope.notification = new Notification;
        $scope.isSending = false;
        $scope.form.$setUntouched();
        $scope.form.$setPristine();

        $scope.$apply();

      }, function (error) {
        Toast.show(error.message);
        $scope.isSending = false;
        $scope.$apply();
      });
    }

  });