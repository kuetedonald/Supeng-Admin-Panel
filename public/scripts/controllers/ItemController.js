angular.module('main')
  .controller('ItemCtrl', function ($scope, $mdDialog, $translate, Item, Toast, Auth) {

    $scope.rowOptions = [5, 25, 50, 100];
    $scope.items = [];
    $scope.query = {
      canonical: '',
      limit: 25,
      page: 1,
      total: 0,
    };

    $scope.onRefreshTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Item.all($scope.query).then(function (items) {
          $scope.items = items;
          $scope.$apply();
        });
      });
    };

    $scope.onCountTable = function () {
      Auth.ensureLoggedIn().then(function () {
        $scope.promise = Item.count($scope.query).then(function (total) {
          $scope.query.total = total;
          $scope.$apply();
        });
      });
    };

    $scope.onRefreshTable();
    $scope.onCountTable();

    $scope.onReload = function () {
      $scope.query.page = 1;
      $scope.onRefreshTable();
      $scope.onCountTable();
    };

    $scope.onReorder = function (field) {

      var indexOf = field.indexOf('-');
      var field1 = indexOf === -1 ? field : field.slice(1, field.length);
      $scope.query.orderBy = indexOf === -1 ? 'asc' : 'desc';
      $scope.query.orderByField = field1;
      $scope.onRefreshTable();
    };

    $scope.onPaginationChange = function (page, limit) {
      $scope.query.page = page;
      $scope.query.limit = limit;
      $scope.onRefreshTable();
    };

    $scope.onEdit = function (event, obj) {
      $mdDialog.show({
        controller: 'DialogItemController',
        scope: $scope.$new(),
        templateUrl: '/views/partials/item.html',
        parent: angular.element(document.body),
        locals: {
          obj: obj || null
        },
        clickOutsideToClose: false

      }).then(function (response) {
        if (response) {
          $scope.onRefreshTable();
          $scope.onCountTable();
        }
      });
    };

    $scope.onChangeStatus = function (item, status) {
      item.status = status;
      Item.save(item).then(function () {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $scope.onRefreshTable();
        $scope.onCountTable();
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

            Item.delete(obj).then(function () {
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

  }).controller('DialogItemController', function ($scope, $mdDialog, $mdConstant, $translate, Item, Category, SubCategory, ItemVariation, Brand, File, Toast, obj) {

    $scope.obj = obj || Item.new();

    $scope.images = []

    if ($scope.obj.images) {
      $scope.images = $scope.obj.images.map(function (image) {
        return {
          isUploading: false,
          file: image
        }
      })
    }

    $scope.relatedItems = $scope.obj.relatedItems || [];
    $scope.tags = $scope.obj.tags || [];
    $scope.obj.variations = $scope.obj.variations || [];
    $scope.categories = $scope.obj.categories || [];
    $scope.subcategories = $scope.obj.subcategories || [];

    $scope.separatorKeys = [
      $mdConstant.KEY_CODE.ENTER,
      $mdConstant.KEY_CODE.COMMA,
    ];

    $scope.queryBrands = function (query) {
      var query = query || '';
      return Brand.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name'
      })
        .then(function (brands) {
          return brands;
        });
    };

    $scope.queryRelatedItems = function (query) {
      var query = query || '';
      return Item.all({
        canonical: query.toLowerCase(),
        orderBy: 'asc',
        orderByField: 'name',
        limit: 10,
      });
    };

    $scope.queryCategories = function (query) {
      var ids = $scope.categories.map(function (item) {
        return item.id
      });
      return Category.all({
        canonical: query ? query.toLowerCase() : '',
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name',
      });
    };

    $scope.querySubCategories = function (query) {
      var ids = $scope.subcategories.map(function (item) {
        return item.id
      });
      return SubCategory.all({
        canonical: query ? query.toLowerCase() : '',
        category: $scope.categories,
        exclude: ids,
        orderBy: 'asc',
        orderByField: 'name'
      });
    };

    $scope.onAddVariation = function () {
      $scope.obj.variations.unshift(new ItemVariation);
    };

    $scope.onRemoveVariation = function (variation) {
      var index = $scope.obj.variations.indexOf(variation);
      $scope.obj.variations.splice(index, 1);
    };

    $scope.onCategoryChanged = function () {
      loadSubCategories();
    }

    $scope.onClose = function () {
      if ($scope.obj.dirty()) $scope.obj.revert();
      $mdDialog.cancel();
    };

    $scope.onDeleteImage = function (image) {
      var index = $scope.images.indexOf(image);
      if (index !== -1) {
        $scope.images.splice(index, 1);
      }
    }

    $scope.onImageClicked = function (file) {
      var viewer = ImageViewer();
      viewer.show(file.url());
    };

    $scope.onUploadImages = function (files) {

      if (files && files.length) {

        angular.forEach(files, function (file) {

          var index = $scope.images.push({
            isUploading: true,
            file: null
          }) - 1;

          $scope.images[index].isUploading = true;

          File.upload(file).then(function (savedFile) {

            $scope.images[index].file = savedFile;
            $scope.images[index].isUploading = false;
            $scope.$apply();

          }, function (error) {
            Toast.show(error.message);
            $scope.images[index].isUploading = false;
            $scope.$apply();
          });

        });

      }
    };

    $scope.onUploadImage = function (file) {

      if (file) {

        var index = $scope.images.push({
          isUploading: true,
          file: null
        }) - 1;

        $scope.images[index].isUploading = true;

        File.upload(file).then(function (savedFile) {

          $scope.images[index].file = savedFile;
          $scope.images[index].isUploading = false;
          $scope.$apply();

        }, function (error) {
          Toast.show(error.message);
          $scope.images[index].isUploading = false;
          $scope.$apply();
        });
      }
    };

    $scope.onUploadFeaturedImage = function (file) {

      if (file) {

        $scope.isUploading = true;

        File.upload(file).then(function (savedFile) {
          $scope.obj.featuredImage = savedFile;
          $scope.isUploading = false;
          $translate('FILE_UPLOADED').then(function (str) {
            Toast.show(str);
          });
          $scope.$apply();
        }, function (error) {
          Toast.show(error.message);
          $scope.isUploading = false;
          $scope.$apply();
        });
      }
    };

    $scope.onSubmit = function () {

      $scope.isSaving = true;

      $scope.obj.images = $scope.images.map(function (image) {
        if (image.file) {
          return image.file;
        }
      });

      $scope.obj.relatedItems = $scope.relatedItems;
      $scope.obj.tags = $scope.tags;
      $scope.obj.categories = $scope.categories;
      $scope.obj.subcategories = $scope.subcategories;

      Item.save($scope.obj).then(function (obj) {
        $scope.isSaving = false;
        $mdDialog.hide(obj);
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $scope.$apply();
      }, function (error) {
        $scope.isSaving = false;
        Toast.show(error.message);
        $scope.$apply();
      });

    };

  });