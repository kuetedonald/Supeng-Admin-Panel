angular.module('main').factory('Notification', function () {

  var Notification = Parse.Object.extend('Notification', {
    initialize: function () {
      this.users = [];
      this.type = null;
    }
  }, {

    all: function () {
      var query = new Parse.Query(this);
      query.descending('createdAt');
      return query.find();
    },

    save: function (obj) {
      return obj.save();
    }
  });

  Object.defineProperty(Notification.prototype, 'message', {
    get: function () {
      return this.get('message');
    },
    set: function (val) {
      this.set('message', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'users', {
    get: function () {
      return this.get('users');
    },
    set: function (val) {
      this.set('users', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'type', {
    get: function () {
      return this.get('type');
    },
    set: function (val) {
      this.set('type', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'item', {
    get: function () {
      return this.get('item');
    },
    set: function (val) {
      this.set('item', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'brand', {
    get: function () {
      return this.get('brand');
    },
    set: function (val) {
      this.set('brand', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'category', {
    get: function () {
      return this.get('category');
    },
    set: function (val) {
      this.set('category', val);
    }
  });

  Object.defineProperty(Notification.prototype, 'subcategory', {
    get: function () {
      return this.get('subcategory');
    },
    set: function (val) {
      this.set('subcategory', val);
    }
  });

  return Notification;

});