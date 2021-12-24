angular.module('main')
  .controller('CouponCtrl', function ($scope, $mdDialog, $translate, Coupon, Toast, Auth) {

    $scope.rowOptions = [5, 25, 50, 100];
    $scope.coupons = [];

    $scope.query = {
      canonical: '',
      limit: 25,
      page: 1,
      total: 0,
    };

    $scope.onRefreshTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Coupon.all($scope.query)
          .then(function (coupons) {
            $scope.coupons = coupons;
          });
      });
    };

    $scope.onCountTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Coupon.count($scope.query)
          .then(function (total) {
            $scope.query.total = total
          });
      });
    };

    $scope.onRefreshTable();
    $scope.onCountTable();

    $scope.onRefresh = function () {
      $scope.onRefreshTable();
      $scope.onCountTable();
    };

    $scope.onPaginationChange = function (page, limit) {
      $scope.query.page = page;
      $scope.query.limit = limit;
      $scope.onRefreshTable();
    };

    $scope.onReorder = function (field) {

      var indexOf = field.indexOf('-');
      var field1 = indexOf === -1 ? field : field.slice(1, field.length);
      $scope.query.orderBy = indexOf === -1 ? 'asc' : 'desc';
      $scope.query.orderByField = field1;
      $scope.onRefreshTable();
    };

    $scope.onChangeStatus = function (obj, status) {
      obj.status = status;
      Coupon.save(obj).then(function () {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $scope.onRefreshTable();
        $scope.onCountTable();
      });

    };

    $scope.onEdit = function (event, obj) {

      $mdDialog.show({
        controller: 'DialogCouponController',
        scope: $scope.$new(),
        templateUrl: '/views/partials/coupon.html',
        parent: angular.element(document.body),
        locals: { obj },
        clickOutsideToClose: false

      }).then(function (response) {
        if (response) {
          $scope.onRefreshTable();
          $scope.onCountTable();
        }
      });
    };

    $scope.onDelete = function (event, obj) {

      $translate(['DELETE', 'CONFIRM_DELETE', 'CONFIRM', 'CANCEL', 'DELETED'])
        .then(function (str) {

          var confirm = $mdDialog.confirm()
            .title(str.DELETE)
            .textContent(str.CONFIRM_DELETE)
            .ariaLabel(str.DELETE)
            .ok(str.CONFIRM)
            .cancel(str.CANCEL);

          $mdDialog.show(confirm).then(function () {

            Coupon.delete(obj).then(function () {
              $translate('DELETED').then(function (str) {
                Toast.show(str);
              });
              $scope.onRefreshTable();
              $scope.onCountTable();
            }, function (error) {
              Toast.show(error.message)
            });
          });
        });
    }

  }).controller('DialogCouponController', function (Coupon, User, Zone, Item, Category, SubCategory, Brand, $scope, $translate, $mdDialog, Toast, obj) {

    $scope.obj = obj || new Coupon;

    $scope.users = $scope.obj.users || [];
    $scope.zones = $scope.obj.zones || [];
    $scope.subzones = $scope.obj.subzones || [];
    $scope.items = $scope.obj.items || [];
    $scope.categories = $scope.obj.categories || [];
    $scope.subcategories = $scope.obj.subcategories || [];
    $scope.brands = $scope.obj.brands || [];

    $scope.onClose = function () {
      if ($scope.obj.dirty()) $scope.obj.revert();
      $mdDialog.cancel();
    };

    $scope.queryUsers = function (query) {
      var query = query || '';
      var ids = $scope.users.map(function (user) {
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

    $scope.queryZones = function (query) {
      var query = query || '';
      var ids = $scope.zones.map(function (zone) {
        return zone.id
      });
      return Zone.all({
        canonical: query.toLowerCase(),
        exclude: ids,
        orderBy: 'asc',
        type: 'Parent',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.querySubZones = function (query) {
      var query = query || '';
      var ids = $scope.subzones.map(function (zone) {
        return zone.id
      });
      return Zone.all({
        canonical: query.toLowerCase(),
        exclude: ids,
        parent: $scope.zones,
        orderBy: 'asc',
        type: 'Child',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.queryItems = function (query) {
      var query = query || '';
      var ids = $scope.items.map(function (item) {
        return item.id
      });
      return Item.all({
        canonical: query.toLowerCase(),
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.queryCategories = function (query) {
      var query = query || '';
      var ids = $scope.categories.map(function (item) {
        return item.id
      });
      return Category.all({
        canonical: query.toLowerCase(),
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.querySubCategories = function (query) {
      var query = query || '';
      var ids = $scope.subcategories.map(function (item) {
        return item.id
      });
      return SubCategory.all({
        canonical: query.toLowerCase(),
        category: $scope.categories,
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.queryBrands = function (query) {
      var query = query || '';
      var ids = $scope.brands.map(function (item) {
        return item.id
      });
      return Brand.all({
        canonical: query.toLowerCase(),
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
        page: 1,
      });
    };

    $scope.onSubmit = function (isFormValid) {

      if (!isFormValid) {
        return $translate('FILL_FIELDS').then(function (str) {
          Toast.show(str);
        });
      }

      $scope.isSaving = true;

      $scope.obj.users = $scope.users;
      $scope.obj.zones = $scope.zones;
      $scope.obj.subzones = $scope.subzones;
      $scope.obj.items = $scope.items;
      $scope.obj.categories = $scope.categories;
      $scope.obj.subcategories = $scope.subcategories;
      $scope.obj.brands = $scope.brands;

      Coupon.save($scope.obj).then(function () {
        $scope.isSaving = false;
        $mdDialog.hide($scope.obj);
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
      }, function (error) {
        $scope.isSaving = false;

        if (error.code === 5000) {
          $translate('COUPON_CODE_ALREADY_EXISTS').then(function (str) {
            Toast.show(str);
          });
        } else {
          $translate('ERROR_NETWORK').then(function (str) {
            Toast.show(str);
          });
        }

      });
    };

  });