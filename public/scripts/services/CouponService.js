angular.module('main').factory('Coupon', function ($q) {

  var Coupon = Parse.Object.extend('Coupon', {

    isActive: function () {
      return this.status === 'Active';
    },

    isInactive: function () {
      return this.status === 'Inactive';
    }

  }, {

    getInstance() {
      return this;
    },

    all: function (params) {

      var defer = $q.defer();

      Parse.Cloud.run('getCoupons', params)
        .then(function (objs) {
          defer.resolve(objs);
        }, function (error) {
          defer.reject(error);
        });

      return defer.promise;

    },

    count: function (params) {

      var defer = $q.defer();
      var query = new Parse.Query(this);

      if (params && params.canonical) {
        query.contains('canonical', params.canonical);
      }

      query.doesNotExist('deletedAt');

      query.count().then(function (count) {
        defer.resolve(count);
      }, function (error) {
        defer.reject(error);
      })

      return defer.promise;

    },

    save: function (obj) {

      var defer = $q.defer();

      obj.save().then(function (obj) {
        defer.resolve(obj);
      }, function (error) {
        defer.reject(error);
      });

      return defer.promise;
    },

    delete: function (obj) {

      var defer = $q.defer();

      obj.deletedAt = new Date;
      obj.save().then(function (res) {
        defer.resolve(res);
      }, function (error) {
        defer.reject(error);
      });

      return defer.promise;

    }

  });

  Object.defineProperty(Coupon.prototype, 'code', {
    get: function () {
      return this.get('code');
    },
    set: function (val) {
      this.set('code', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'amount', {
    get: function () {
      return this.get('amount');
    },
    set: function (val) {
      this.set('amount', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'startDate', {
    get: function () {
      return this.get('startDate');
    },
    set: function (val) {
      this.set('startDate', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'endDate', {
    get: function () {
      return this.get('endDate');
    },
    set: function (val) {
      this.set('endDate', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'status', {
    get: function () {
      return this.get('status');
    },
    set: function (val) {
      this.set('status', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'minimumOrderAmount', {
    get: function () {
      return this.get('minimumOrderAmount');
    },
    set: function (val) {
      this.set('minimumOrderAmount', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'maximumOrderAmount', {
    get: function () {
      return this.get('maximumOrderAmount');
    },
    set: function (val) {
      this.set('maximumOrderAmount', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'usageLimit', {
    get: function () {
      return this.get('usageLimit');
    },
    set: function (val) {
      this.set('usageLimit', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'usageCount', {
    get: function () {
      return this.get('usageCount');
    },
    set: function (val) {
      this.set('usageCount', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'usageLimitPerUser', {
    get: function () {
      return this.get('usageLimitPerUser');
    },
    set: function (val) {
      this.set('usageLimitPerUser', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'deletedAt', {
    get: function () {
      return this.get('deletedAt');
    },
    set: function (val) {
      this.set('deletedAt', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'type', {
    get: function () {
      return this.get('type');
    },
    set: function (val) {
      this.set('type', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'isFreeShippingEnabled', {
    get: function () {
      return this.get('isFreeShippingEnabled');
    },
    set: function (val) {
      this.set('isFreeShippingEnabled', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'users', {
    get: function () {
      return this.get('users');
    },
    set: function (val) {
      this.set('users', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'zones', {
    get: function () {
      return this.get('zones');
    },
    set: function (val) {
      this.set('zones', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'subzones', {
    get: function () {
      return this.get('subzones');
    },
    set: function (val) {
      this.set('subzones', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'items', {
    get: function () {
      return this.get('items');
    },
    set: function (val) {
      this.set('items', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'categories', {
    get: function () {
      return this.get('categories');
    },
    set: function (val) {
      this.set('categories', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'subcategories', {
    get: function () {
      return this.get('subcategories');
    },
    set: function (val) {
      this.set('subcategories', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'brands', {
    get: function () {
      return this.get('brands');
    },
    set: function (val) {
      this.set('brands', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'customerRestriction', {
    get: function () {
      return this.get('customerRestriction');
    },
    set: function (val) {
      this.set('customerRestriction', val);
    }
  });

  Object.defineProperty(Coupon.prototype, 'isAccountRequired', {
    get: function () {
      return this.get('isAccountRequired');
    },
    set: function (val) {
      this.set('isAccountRequired', val);
    }
  });

  return Coupon;

});