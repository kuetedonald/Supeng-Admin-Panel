angular.module('main')
  .controller('AppConfigCtrl', function ($scope, Toast, $mdDialog, $translate, AppConfig, File, Auth) {

    $scope.selectedHomePageBlock = null;

    $scope.homePageBlocks = [{
      type: 'slider_images',
    }, {
      type: 'categories',
    }, {
      type: 'brands',
    }, {
      type: 'featured_items',
    }, {
      type: 'sale_items',
    }, {
      type: 'new_arrival_items',
    }, {
      type: 'all_items',
    }];

    $scope.onAddBlock = function (block) {
      if (block) {
        $scope.obj.layout.home.blocks = $scope.obj.layout.home.blocks || [];
        $scope.obj.layout.home.blocks.unshift(block);
      }
    };

    $scope.onRemoveBlock = function (block) {
      var index = $scope.obj.layout.home.blocks.indexOf(block);
      if (index !== -1) {
        $scope.obj.layout.home.blocks.splice(index, 1);
      }
    };

    $scope.tinymceOptions = {
      height: 500,
      skin: 'lightgray',
      theme: 'modern',
      content_style: "img { max-width: 100%; height: auto; }",
      image_dimensions: false,
      media_dimensions: false,
      media_live_embeds: true,
      file_picker_types: 'image media',
      relative_urls: false,
      remove_script_host: false,
      file_picker_callback: function (cb, value, meta) {

        var input = document.createElement('input');
        input.setAttribute('type', 'file');

        if (meta.filetype == 'image') {
          input.setAttribute('accept', 'image/*');
        }

        if (meta.filetype == 'media') {
          input.setAttribute('accept', 'video/*');
        }

        input.onchange = function () {
          var file = this.files[0];
          var name = Math.random().toString(36).substring(7);

          File.upload(file, name).then(function (savedFile) {
            cb(savedFile.url(), {
              title: savedFile.name()
            });
          })

        };

        input.click();
      },
      extended_valid_elements: 'iframe[src|width|height|name|align|frameborder|scrolling]',
      plugins: 'link image media imagetools hr lists searchreplace wordcount visualblocks visualchars code fullscreen emoticons',
      toolbar: 'formatselect | bold italic strikethrough forecolor backcolor | link image media emoticons | alignleft aligncenter alignright alignjustify | numlist bullist outdent indent | removeformat'
    };

    Auth.ensureLoggedIn().then(function () {
      AppConfig.loadOne().then(function (appConfig) {
        $scope.obj = appConfig || new AppConfig;
        $scope.$apply();
      });
    });

    $scope.uploadImage = function (field, file) {

      if (file) {

        File.upload(file).then(function (savedFile) {
          $scope.obj.admin[field] = savedFile;
          $translate('FILE_UPLOADED').then(function (str) {
            Toast.show(str);
          });
          $scope.$apply();
        }, function (error) {
          Toast.show(error.message);
          $scope.$apply();
        });
      }
    };

    $scope.onSave = function () {

      $scope.isSaving = true;

      AppConfig.save($scope.obj).then(function () {
        $translate('SAVED').then(function (str) {
          Toast.show(str);
        });
        $scope.isSaving = false;
        $scope.$apply();
      }, function (error) {
        Toast.show(error.message);
        $scope.isSaving = false;
        $scope.$apply();
      });

    };

    $scope.hide = function () {
      $mdDialog.cancel();
    };

    $scope.openStripeCurrencies = function () {
      window.open('https://stripe.com/docs/currencies', '_blank');
    };

  });