const Utils = require('../utils')

Parse.Cloud.beforeSave('Notification', async (req) => {

  const obj = req.object
  const user = req.user

  const isAdmin = await Utils.isAdmin(user)
  if (!isAdmin && !req.master) throw 'Not Authorized'

  if (!obj.existed()) {
    const acl = new Parse.ACL()
    acl.setPublicReadAccess(true)
    acl.setRoleWriteAccess('Admin', true)
    obj.setACL(acl)
  }
})

Parse.Cloud.afterSave('Notification', (req) => {

  const { object } = req
  const attrs = object.attributes

  const query = new Parse.Query(Parse.Installation)
  query.containedIn('deviceType', ['ios', 'android'])
  query.equalTo('isPushEnabled', true)

  const users = attrs.users

  if (Array.isArray(users) && users.length) {
    query.containedIn('user', users)
  }

  const pushParams = {
    where: query,
    data: {
      alert: attrs.message,
      event: 'news',
      sound: 'default'
    }
  }

  if (attrs.brand) {
    pushParams.data.brandId = attrs.brand.id
  } else if (attrs.category) {
    pushParams.data.categoryId = attrs.category.id
  } else if (attrs.subcategory) {
    pushParams.data.subcategoryId = attrs.subcategory.id
  } else if (attrs.item) {
    pushParams.data.itemId = attrs.item.id
  }

  Parse.Push.send(pushParams, {
    useMasterKey: true
  })
})