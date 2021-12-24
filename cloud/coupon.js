
const Utils = require('../utils')

Parse.Cloud.beforeSave('Coupon', async (req) => {

  const obj = req.object
  const attrs = obj.attributes
  const user = req.user

  const isAdmin = await Utils.isAdmin(user)
  if (!isAdmin && !req.master) throw 'Not Authorized'

  const code = attrs.code.trim().toUpperCase()

  if (obj.dirty('code')) {
    obj.set('code', code)
  }

  if (!obj.existed()) {
    const acl = new Parse.ACL()
    acl.setPublicReadAccess(false)
    acl.setRoleReadAccess('Admin', true)
    acl.setRoleWriteAccess('Admin', true)
    obj.setACL(acl)
    obj.set('usageCount', 0)

    const query = new Parse.Query('Coupon')
    query.equalTo('code', code)
    query.doesNotExist('deletedAt')

    const exists = await query.first({ useMasterKey: true })

    if (exists) throw new Parse.Error(5000, 'Coupon already exists')

  }

})

Parse.Cloud.define('applyCoupon', async (req) => {

  const { user, params } = req

  if (!user) throw 'Not Authorized'

  const queryCart = new Parse.Query('Cart')
  queryCart.equalTo('customer', user)

  const cart = await queryCart.first({
    sessionToken: user.getSessionToken()
  })

  if (!cart) throw 'Cart not found'

  const couponCode = (params.couponCode || '')
    .trim()
    .toUpperCase()

  if (!couponCode) throw 'Coupon code is required'

  const query = new Parse.Query('Coupon')
  query.equalTo('code', couponCode)
  query.doesNotExist('deletedAt')

  const coupon = await query.first({ useMasterKey: true })

  if (!coupon) {
    throw new Parse.Error(5000, 'Coupon not found')
  }

  cart.set('coupon', {
    id: coupon.id,
  })

  return await cart.save(null, {
    useMasterKey: true,
  })

})

Parse.Cloud.define('removeCoupon', async (req) => {

  const { user } = req

  if (!user) throw 'Not Authorized'

  const queryCart = new Parse.Query('Cart')
  queryCart.equalTo('customer', user)

  const cart = await queryCart.first({
    sessionToken: user.getSessionToken()
  })

  if (!cart) throw 'Cart not found'

  cart.set('coupon', null)

  return await cart.save(null, {
    useMasterKey: true,
  })

})

Parse.Cloud.define('getCoupons', async (req) => {

  const params = req.params
  const user = req.user

  const isAdmin = await Utils.isAdmin(user)
  if (!isAdmin) throw 'Not Authorized'

  var query = new Parse.Query('Coupon')

  if (params && params.canonical) {
    query.contains('code', params.canonical.toUpperCase())
  }

  if (params && params.limit && params.page) {
    query.limit(params.limit)
    query.skip((params.page * params.limit) - params.limit)
  }

  query.descending('createdAt')
  query.doesNotExist('deletedAt')
  query.include([
    'users',
    'zones',
    'subzones',
    'items',
    'categories',
    'subcategories',
    'brands',
  ]);

  return await query.find({ useMasterKey: true })

})