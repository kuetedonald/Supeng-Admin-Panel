angular.module('main').factory('OrderLog', function () {

  var OrderLog = Parse.Object.extend('OrderLog', {}, {

    all: function (params) {
      var query = new Parse.Query(this);
      query.equalTo('order', params.order)
      query.include(['order', 'user']);
      query.doesNotExist('deletedAt');
      query.descending('createdAt');
      return query.find();
    }

  });

  Object.defineProperty(OrderLog.prototype, 'order', {
    get: function () {
      return this.get('order');
    },
    set: function (val) {
      this.set('order', val);
    }
  });

  Object.defineProperty(OrderLog.prototype, 'user', {
    get: function () {
      return this.get('user');
    },
    set: function (val) {
      this.set('user', val);
    }
  });

  Object.defineProperty(OrderLog.prototype, 'type', {
    get: function () {
      return this.get('type');
    },
    set: function (val) {
      this.set('type', val);
    }
  });

  Object.defineProperty(OrderLog.prototype, 'note', {
    get: function () {
      return this.get('note');
    },
    set: function (val) {
      this.set('note', val);
    }
  });

  Object.defineProperty(OrderLog.prototype, 'status', {
    get: function () {
      return this.get('status');
    },
    set: function (val) {
      this.set('status', val);
    }
  });

  return OrderLog;

});