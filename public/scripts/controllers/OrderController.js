angular.module('main')
  .controller('OrderCtrl', function (Order, $scope, $mdDialog, $translate, Toast, Auth) {

    $scope.rowOptions = [5, 25, 50, 100];
    $scope.orders = [];
    $scope.total = 0;

    $scope.query = {
      number: '',
      status: null,
      paymentStatus: null,
      start: null,
      end: null,
      limit: 25,
      page: 1,
      total: 0,
    };

    $scope.onRefreshTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Order.all($scope.query).then(function (orders) {
          $scope.orders = orders;
          $scope.calculateTotals();
          Order.markAllAsSeen();
          $scope.$apply();
        });
      });
    };

    $scope.onCountTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Order.count($scope.query).then(function (total) {
          $scope.query.total = total;
          $scope.$apply();
        });
      });
    };

    $scope.onRefreshTable();
    $scope.onCountTable();

    $scope.onReorder = function (field) {
      var indexOf = field.indexOf('-');
      var field1 = indexOf === -1 ? field : field.slice(1, field.length);
      $scope.query.orderBy = indexOf === -1 ? 'asc' : 'desc';
      $scope.query.orderByField = field1;
      $scope.onRefreshTable();
    };

    $scope.calculateTotals = function () {
      $scope.total = 0;
      angular.forEach($scope.orders, function (order) {
        $scope.total += order.total;
      });
    }

    $scope.onReload = function () {
      $scope.query.page = 1;
      $scope.onRefreshTable();
      $scope.onCountTable();
    };

    $scope.onPaginationChange = function (page, limit) {
      $scope.query.page = page;
      $scope.query.limit = limit;
      $scope.onRefreshTable();
    };

    $scope.onView = function (event, order) {

      $mdDialog.show({
        controller: 'DialogOrderViewController',
        scope: $scope.$new(),
        templateUrl: '/views/partials/order.html',
        parent: angular.element(document.body),
        locals: {
          order: order
        },
        clickOutsideToClose: false

      }).then(function (response) {
        if (response) {
          $scope.onRefreshTable();
          $scope.onCountTable();
        }
      });
    };

    $scope.onChangePaymentStatus = function (order) {

      Order.save(order).then(function () {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $scope.onRefreshTable();
        $scope.onCountTable();
      }, function (error) {
        Toast.show(error.message);
      });
    };

    $scope.onChangeStatus = function (order, status) {

      $mdDialog.show({
        controller: 'DialogCancelOrderViewController',
        scope: $scope.$new(),
        templateUrl: '/views/partials/order-status.html',
        parent: angular.element(document.body),
        locals: {
          order: order,
          status: status,
        },
        clickOutsideToClose: false
      }).then(function (response) {
        order = response;
      }, function () {
        order.revert('status');
      });
    };

    $scope.onDelete = function (event, order) {

      $translate(['DELETE', 'CONFIRM_DELETE', 'CONFIRM', 'CANCEL', 'DELETED'])
        .then(function (str) {

          var confirm = $mdDialog.confirm()
            .title(str.DELETE)
            .textContent(str.CONFIRM_DELETE)
            .ariaLabel(str.DELETE)
            .ok(str.CONFIRM)
            .cancel(str.CANCEL);
          $mdDialog.show(confirm).then(function () {

            Order.delete(order).then(function () {
              $translate('DELETED').then(function (str) {
                Toast.show(str);
              });
              $scope.onRefreshTable();
              $scope.onCountTable();
            }, function (error) {
              Toast.show(error.message);
            });
          });
        });
    };

  }).controller('DialogOrderViewController', function ($scope, $mdDialog, OrderLog, order) {

    $scope.order = order;

    $scope.status = order.status.replace(/\s+/g, '_').toUpperCase();
    $scope.paymentStatus = order.paymentStatus ?
      order.paymentStatus.replace(/\s+/g, '_').toUpperCase() : '';

    $scope.onCancel = function () {
      $mdDialog.cancel();
    };

    $scope.formatBrand = function () {

      if ($scope.order.card) {
        return $scope.order.card.brand.toLowerCase().replace(' ', '_')
      }

      return '';
    }

    $scope.onChargeClicked = function () {
      window.open('https://dashboard.stripe.com/payments/' + $scope.order.charge.id, '_blank');
    };

    $scope.loadLogs = function () {
      OrderLog.all({ order: order }).then(function (logs) {
        $scope.logs = logs;
        $scope.$apply();
      })
    };

    $scope.loadLogs();

  }).controller('DialogCancelOrderViewController', function ($scope, $mdDialog, $translate, Toast, Order, order, status) {

    $scope.order = order;
    $scope.status = status;

    $scope.input = {
      orderId: order.id,
      status: status,
    };

    $scope.onCancel = function () {
      $mdDialog.cancel();
    };

    $scope.onSubmit = function () {

      $scope.isSaving = true;

      Order.updateStatus($scope.input).then(function (res) {
        $scope.isSaving = false;
        $mdDialog.hide(res);
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
      }, function () {
        $scope.isSaving = false;
        $translate('ERROR_NETWORK').then(function (str) {
          Toast.show(str);
        });
      });
    };

  });