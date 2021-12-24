const moment = require('moment')
const Utils = require('../utils')
const intersect = require('fast_array_intersect').default

Parse.Cloud.beforeSave('Cart', async (req) => {

  const obj = req.object
  const attrs = obj.attributes
  const original = req.original
  const origAttrs = original ? original.attributes : {}
  const user = req.user

  if (!user && !req.master) throw 'Not Authorized'

  const dirtyKeys = obj.dirtyKeys()

  if (attrs.coupon && dirtyKeys.includes('coupon') && !req.master) {
    throw 'Operation not permitted'
  }

  if ((dirtyKeys.includes('customer') ||
    dirtyKeys.includes('subtotal') ||
    dirtyKeys.includes('shippingFee') ||
    dirtyKeys.includes('total')) && !req.master) {
    throw 'Operation not permitted'
  }

  if (!obj.existed()) {
    const acl = new Parse.ACL()
    acl.setReadAccess(user, true)
    acl.setWriteAccess(user, true)
    obj.setACL(acl)
    obj.set('customer', user)
    obj.set('status', 'active')
  }

  const validStatusList = ['active', 'expired']

  const status = obj.get('status')

  if (!validStatusList.includes(status)) {
    throw 'Invalid status'
  }

  let items = obj.get('items') || []

  if (items &&
    (dirtyKeys.includes('items') ||
    (dirtyKeys.includes('coupon') && attrs.coupon === null))) {

    obj.set('coupon', null)

    const objs = attrs.items.map(item => {
      item.className = 'Item'
      return Parse.Object.fromJSON(item, false)
    })

    const fetchedItems = await Parse.Object.fetchAllWithInclude(objs)

    if (Array.isArray(origAttrs.items) && items.length) {

      const lastItem = fetchedItems.find(o1 => {
        return !origAttrs.items.some(o2 => o1.id === o2.objectId)
      })

      if (lastItem && lastItem.get('isNotAvailable')) {
        throw new Parse.Error(3000, 'Item not available')
      }

    }

    items = attrs.items.map(rawItem => {

      const fetchedItem = fetchedItems.find(item => item.id === rawItem.objectId)

      const fetchedAttrs = fetchedItem.toJSON()

      const allowed = [
        'objectId',
        'name',
        'salePrice',
        'price',
        'netPrice',
        'featuredImage',
        'featuredImageThumb',
        'categories',
        'subcategories',
        'brand',
        'slug',
      ]

      const filtered = Object.keys(fetchedAttrs)
        .filter(key => allowed.includes(key))
        .reduce((obj, key) => {
          obj[key] = fetchedAttrs[key]
          return obj
        }, {})

      if (fetchedAttrs.variations && fetchedAttrs.variations.length) {
        filtered.variation = rawItem.variation
      }

      filtered.qty = rawItem.qty

      const amount = Utils.roundNumber(rawItem.qty * filtered.netPrice)
      filtered.amount = amount
      filtered.finalAmount = amount

      return filtered
    })

    obj.set('items', items)

    let subtotal = items.reduce((total, item) => total + item.amount, 0)
    obj.set('subtotal', subtotal)
  }

  let coupon = obj.get('coupon')
  let fetchedCoupon = null

  if (coupon && dirtyKeys.includes('coupon')) {

    const query = new Parse.Query('Coupon')
    query.equalTo('objectId', coupon.id)
    query.doesNotExist('deletedAt')

    fetchedCoupon = await query.first({ useMasterKey: true })

    if (!fetchedCoupon) {
      throw new Parse.Error(5000, 'Coupon not found')
    }

    if (fetchedCoupon.get('status') === 'Inactive') {
      throw new Parse.Error(5001, 'Coupon inactive')
    }

    if (fetchedCoupon.get('usageCount') >= fetchedCoupon.get('usageLimit')) {
      throw new Parse.Error(5002, 'Usage limit reached')
    }

    const startDate = fetchedCoupon.get('startDate')

    if (startDate) {
      const now = moment().utc()
      const started = moment(startDate).isBefore(now)

      if (!started) {
        throw new Parse.Error(5003, 'Coupon not started yet')
      }
    }

    const endDate = fetchedCoupon.get('endDate')

    if (endDate) {
      const now = moment().utc()
      const isExpired = moment(endDate).isBefore(now)

      if (isExpired) {
        throw new Parse.Error(5004, 'Coupon expired')
      }
    }

    const usageLimitPerUser = fetchedCoupon.get('usageLimitPerUser')

    if (usageLimitPerUser) {

      const queryOrder = new Parse.Query('Order')
      queryOrder.equalTo('customer', attrs.customer)
      queryOrder.equalTo('coupon.id', fetchedCoupon.id)
      queryOrder.doesNotExist('deletedAt')

      const count = await queryOrder.count({ useMasterKey: true })

      if (count >= usageLimitPerUser) {
        throw new Parse.Error(5005, 'Usage limit per user reached')
      }

    }

    const minimumOrderAmount = fetchedCoupon.get('minimumOrderAmount')

    if (minimumOrderAmount && obj.get('subtotal') < minimumOrderAmount) {
      throw new Parse.Error(5006, `Minimum order amount is %${minimumOrderAmount}%`)
    }

    const maximumOrderAmount = fetchedCoupon.get('maximumOrderAmount')

    if (maximumOrderAmount && obj.get('subtotal') > maximumOrderAmount) {
      throw new Parse.Error(5007, `Maximum order amount is %${maximumOrderAmount}%`)
    }

    const users = fetchedCoupon.get('users')

    if (Array.isArray(users) && users.length) {

      const customer = obj.get('customer')
      const match = users.find(user1 => user1.id === customer.id)

      if (!match) {
        throw new Parse.Error(5008, 'Unable to apply coupon to this user')
      }
    }

    const zones = fetchedCoupon.get('zones')

    if (Array.isArray(zones) && zones.length) {

      const shipping = obj.get('shipping')

      if (!shipping) {
        throw new Parse.Error(5009, 'Cannot apply coupon')
      }

      await shipping.fetch({ useMasterKey: true })

      const zone = shipping.get('zone')
      const match = zones.find(zone1 => zone1.id === zone.id)

      if (!match) {
        throw new Parse.Error(5009, 'Unable to apply coupon to this shipping zone')
      }
    }

    const subzones = fetchedCoupon.get('subzones')

    if (Array.isArray(subzones) && subzones.length) {

      const shipping = obj.get('shipping')

      if (!shipping) {
        throw new Parse.Error(5009, 'Cannot apply coupon')
      }

      await shipping.fetch({ useMasterKey: true })

      const zone = shipping.get('subzone')
      const match = subzones.find(zone1 => zone1.id === zone.id)

      if (!match) {
        throw new Parse.Error(5010, 'Unable to apply coupon to this shipping sub-zone')
      }
    }

    const customerRestriction = fetchedCoupon.get('customerRestriction')

    if (customerRestriction) {

      const queryOrder = new Parse.Query('Order')
      queryOrder.equalTo('customer', attrs.customer)
      queryOrder.doesNotExist('deletedAt')

      const count = await queryOrder.count({ useMasterKey: true })

      if (customerRestriction === 'new' && count > 0) {
        throw new Parse.Error(5011, 'This coupon is only available for new customers')
      } else if (customerRestriction === 'existing' && count === 0) {
        throw new Parse.Error(5011, 'This coupon is only available for existing customers')
      }

    }

    const isAccountRequired = fetchedCoupon.get('isAccountRequired')

    if (isAccountRequired) {

      const customer = await attrs.customer.fetch({ useMasterKey: true })
      const authData = customer.get('authData')

      if (authData && typeof authData['anonymous'] !== 'undefined') {
        throw new Parse.Error(5012, 'This coupon is only available for customers with full account')
      }

    }

    const couponItems = fetchedCoupon.get('items')

    let matchedItems = []
    let matchedItemsByCategory = []
    let matchedItemsBySubCategory = []
    let matchedItemsByBrand = []
    let hasRestriction = false
    let hasItemRestriction = false
    let hasCategoryRestriction = false
    let hasSubCategoryRestriction = false
    let hasBrandRestriction = false
    let restrictionErrorCode = null

    if (Array.isArray(couponItems) && couponItems.length) {

      hasRestriction = true
      hasItemRestriction = true

      const matches = items.filter(item => {
        return couponItems.some(couponItem => {
          return item.objectId === couponItem.id
        })
      })

      if (!matches.length) {
        restrictionErrorCode = 5013
      }

      matchedItems.push(...matches)
    }

    const couponCategories = fetchedCoupon.get('categories')

    if (Array.isArray(couponCategories) && couponCategories.length) {

      hasRestriction = true
      hasCategoryRestriction = true

      const matches = items.filter(item => {
        return couponCategories.some(couponCategory => {
          return Array.isArray(item.categories) && item.categories.length &&
            item.categories.find(category => category.id === couponCategory.id)
        })
      })

      if (!matches.length) {
        restrictionErrorCode = 5014
      }

      matchedItemsByCategory.push(...matches)
    }

    const couponSubCategories = fetchedCoupon.get('subcategories')

    if (Array.isArray(couponSubCategories) && couponSubCategories.length) {

      hasRestriction = true
      hasSubCategoryRestriction = true

      const matches = items.filter(item => {
        return couponSubCategories.some(couponCategory => {
          return Array.isArray(item.subcategories) && item.subcategories.length &&
            item.subcategories.find(category => category.id === couponCategory.id)
        })
      })

      if (!matches.length) {
        restrictionErrorCode = 5015
      }

      matchedItemsBySubCategory.push(...matches)
    }

    const couponBrands = fetchedCoupon.get('brands')

    if (Array.isArray(couponBrands) && couponBrands.length) {

      hasRestriction = true
      hasBrandRestriction = true

      const matches = items.filter(item => {
        return couponBrands.some(couponBrand => {
          return item.brand && item.brand.id === couponBrand.id
        })
      })

      if (!matches.length) {
        restrictionErrorCode = 5016
      }

      matchedItemsByBrand.push(...matches)
    }

    let arrays = []

    if (hasItemRestriction) {
      arrays.push(matchedItems)
    }

    if (hasCategoryRestriction) {
      arrays.push(matchedItemsByCategory)
    }

    if (hasSubCategoryRestriction) {
      arrays.push(matchedItemsBySubCategory)
    }

    if (hasBrandRestriction) {
      arrays.push(matchedItemsByBrand)
    }

    const intersectedItems = intersect(arrays, item => item.objectId)

    if (hasRestriction && !intersectedItems.length) {
      throw new Parse.Error(restrictionErrorCode, 'Cannot apply coupon')
    }

    let couponAmount = fetchedCoupon.get('amount') || 0
    let couponTotal = obj.get('subtotal')

    if (hasRestriction) {

      couponTotal = items.reduce((sum, item) => {

        const match = intersectedItems.find(intersectedItem => {
          return intersectedItem.objectId === item.objectId
        })

        if (match) {
          return sum + item.amount
        }

        return sum

      }, 0)
    }

    if (fetchedCoupon.get('type') === 'percentage') {
      couponAmount = couponTotal * (couponAmount / 100)
      couponAmount = Utils.roundNumber(couponAmount)
    }

    items.forEach(item => {
      const discount = item.amount / obj.get('subtotal') * couponAmount

      if (discount > item.amount) {
        item.finalAmount = 0
        item.discountAmount = item.amount
      } else {
        const finalAmount = item.amount - discount
        item.finalAmount = Utils.roundNumber(finalAmount)
        item.discountAmount = Utils.roundNumber(discount)
      }
    })

    obj.set('coupon', {
      id: fetchedCoupon.id,
      name: fetchedCoupon.get('code'),
      freeShipping: fetchedCoupon.get('isFreeShippingEnabled'),
      amount: couponAmount,
    })

  }

  if (dirtyKeys.includes('shipping') || dirtyKeys.includes('coupon')) {

    const shipping = attrs.shipping

    if (shipping) {
      await shipping.fetchWithInclude('subzone', {
        useMasterKey: true
      })

      const shippingFee = shipping.get('subzone').get('fee') || 0
      obj.set('shippingFee', shippingFee)
    }
  }

  if (dirtyKeys.includes('coupon') ||
    dirtyKeys.includes('shipping') ||
    dirtyKeys.includes('items')) {

    let total = obj.get('subtotal')

    coupon = obj.get('coupon')

    if (coupon) {
      // Cart total can't be less than zero
      if (coupon.amount > total) {
        total = 0
      } else {
        total -= coupon.amount
      }

      if (coupon.freeShipping) {
        obj.set('shippingFee', 0)
      }
    }

    total += obj.get('shippingFee') || 0

    obj.set('total', total)
  }

  if (status !== 'expired') {
    const appConfig = await Utils.getConfig()

    if (appConfig) {
      const expiration = appConfig.get('admin') ?
        appConfig.get('admin').cartExpiration : null

      if (expiration) {
        const expiresAt = moment().utc().add(expiration, 'hours').toDate()
        obj.set('expiresAt', expiresAt)
      }
    }

  }

})

Parse.Cloud.job('migrateOldCarts', async (req) => {

  const { message } = req

  message(`Job started at ${new Date().toISOString()}`)

  try {

    const query = new Parse.Query('Cart')

    await query.each(cart => {

      if (cart.get('status') === 'Pending') {
        cart.set('status', 'active')
        return cart.save(null, { useMasterKey: true })
      }

    }, { useMasterKey: true })

    message(`Job finished at ${new Date().toISOString()}`)

  } catch (error) {
    message(error.message)
  }

})