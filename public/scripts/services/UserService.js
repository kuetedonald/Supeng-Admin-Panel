angular.module('main').factory('User', function () {

  var User = Parse.User.extend({
    isAnonymous: function () {
      return !this.name;
    },
    hasPermission(permission) {
      return this.type === 'super_admin' ||
        (this.type === 'admin' &&
          Array.isArray(this.permissions) &&
          this.permissions.indexOf(permission) !== -1);
    }
  }, {

    getInstance: function () {
      return this;
    },

    all: function (params) {
      return Parse.Cloud.run('getUsers', params);
    },

    save: function (obj) {

      if (obj.id) {
        return Parse.Cloud.run('updateUser', obj.toJSON());
      } else {
        return Parse.Cloud.run('createUser', obj);
      }
    },

    delete: function (data) {
      return Parse.Cloud.run('destroyUser', data);
    },

    fetch: function () {
      return Parse.User.current().fetch();
    }

  });

  Object.defineProperty(User.prototype, 'name', {
    get: function () {
      return this.get('name');
    },
    set: function (val) {
      this.set('name', val);
    }
  });

  Object.defineProperty(User.prototype, 'username', {
    get: function () {
      return this.get('username');
    },
    set: function (val) {
      this.set('username', val);
    }
  });

  Object.defineProperty(User.prototype, 'email', {
    get: function () {
      return this.get('email');
    },
    set: function (val) {
      this.set('email', val);
    }
  });

  Object.defineProperty(User.prototype, 'photo', {
    get: function () {
      return this.get('photo');
    },
    set: function (val) {
      this.set('photo', val);
    }
  });

  Object.defineProperty(User.prototype, 'photoThumb', {
    get: function () {
      return this.get('photoThumb');
    },
    set: function (val) {
      this.set('photoThumb', val);
    }
  });

  Object.defineProperty(User.prototype, 'roleName', {
    get: function () {
      return this.get('roleName');
    },
    set: function (val) {
      this.set('roleName', val);
    }
  });

  Object.defineProperty(User.prototype, 'authData', {
    get: function () {
      return this.get('authData');
    },
    set: function (val) {
      this.set('authData', val);
    }
  });

  Object.defineProperty(User.prototype, 'type', {
    get: function () {
      return this.get('type');
    },
    set: function (val) {
      this.set('type', val);
    }
  });

  Object.defineProperty(User.prototype, 'permissions', {
    get: function () {
      return this.get('permissions');
    },
    set: function (val) {
      this.set('permissions', val);
    }
  });

  Object.defineProperty(User.prototype, 'status', {
    get: function () {
      return this.get('status');
    },
    set: function (val) {
      this.set('status', val);
    }
  });

  return User;

});