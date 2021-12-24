const stripe = require('stripe')
const MailgunHelper = require('../helpers/mailgun').MailgunHelper
const Mailgen = require('mailgen')
const Utils = require('../utils')
const Review = require('../models/review')
const Item = require('../models/item')

Parse.Cloud.beforeSave('Order', async (req) => {

  const obj = req.object
  const attrs = obj.attributes
  const user = req.user

  if (!user && !req.master) throw 'Not Authorized'

  try {

    if (!obj.existed()) {
      const acl = new Parse.ACL()
      acl.setReadAccess(user, true)
      acl.setRoleReadAccess('Admin', true)
      acl.setRoleWriteAccess('Admin', true)
      obj.setACL(acl)
      obj.set('customer', user)
      obj.set('paymentStatus', 'Unpaid')
      obj.set('status', 'Pending')

      if (user.get('status') === 'Banned') {
        throw new Parse.Error(1001, 'Your account has been blocked.')
      }

      const queryCart = new Parse.Query('Cart')
      queryCart.equalTo('customer', user)
      queryCart.include('shipping.subzone', 'shipping.zone')
      const cart = await queryCart.first({ useMasterKey: true })

      if (!cart) throw 'Cart not found'

      let cartData = null

      const coupon = cart.get('coupon')

      if (coupon) {
        cartData = { coupon }
      }

      // Update cart to force and run coupon and total validations
      await cart.save(cartData, { useMasterKey: true })

      if (coupon) {
        obj.set('coupon', coupon)
      }

      const items = cart.get('items')

      if (!items || (items && !items.length)) {
        throw 'Cart should have items'
      }

      obj.set('items', items)
      obj.set('shipping', cart.get('shipping').toJSON())
      obj.set('subtotal', cart.get('subtotal'))
      obj.set('shippingFee', cart.get('shippingFee'))
      obj.set('total', cart.get('total'))

      const queryConfig = new Parse.Query('AppConfig')
      const config = await queryConfig.first({
        useMasterKey: true
      })

      const adminConfig = config.get('admin')

      if (adminConfig) {

        const minimumOrderAmount = adminConfig.minimumOrderAmount
        const maximumOrderAmount = adminConfig.maximumOrderAmount

        if (minimumOrderAmount && obj.get('subtotal') < minimumOrderAmount) {
          throw new Parse.Error(1004, `Minimum order amount is %${minimumOrderAmount}%`)
        }

        if (minimumOrderAmount && obj.get('subtotal') > maximumOrderAmount) {
          throw new Parse.Error(1005, `Maximum order amount is %${maximumOrderAmount}%`)
        }

        const isGuestCheckoutEnabled = adminConfig.isGuestCheckoutEnabled

        const authData = user.get('authData')
        const isGuest = authData && typeof authData['anonymous'] !== 'undefined'

        if (isGuest && !isGuestCheckoutEnabled) {
          throw new Parse.Error(1006, 'Guest checkout disabled')
        }
      }

      const orderNo = await Utils.generateNextOrderNumber()
      if (!orderNo) throw 'Internal error'

      obj.set('number', orderNo)

      if (attrs.paymentMethod === 'Card') {

        const card = attrs.card

        await card.fetch({
          useMasterKey: true
        })

        const stripeConfig = config.get('stripe')
        const stripeInstance = stripe(stripeConfig.secretKey)

        const customerEmail = attrs.contact.email
        const customerName = user.get('name') || customerEmail

        let chargeDescription = stripeConfig.chargeDescription
        chargeDescription = chargeDescription.replace('%CUSTOMER_NAME%', customerName)
        chargeDescription = chargeDescription.replace('%ORDER_NUMBER%', orderNo)

        const currency = stripeConfig.currency

        let total = obj.get('total')

        let amount = total * 100

        if (Utils.isZeroDecimalCurrency(currency.toUpperCase())) {
          amount = total;
        }

        if (total > 0) {

          const charge = await stripeInstance.charges.create({
            amount: amount,
            currency: currency,
            description: chargeDescription,
            customer: user.get('stripeCustomerId'),
            capture: true,
            source: card.get('cardId')
          })

          obj.set('charge', charge)
        }

        obj.set('card', card.toJSON())
        obj.set('paymentStatus', 'Paid')

      }

    }

  } catch (error) {

    switch (error.type) {
      case 'StripeCardError':
        // A declined card error
        error.code = 1002
        break
      case 'StripeInvalidRequestError':
      case 'StripeAPIError':
      case 'StripeConnectionError':
      case 'StripeAuthenticationError':
      case 'StripeRateLimitError':
        error.code = 1003
        break
    }

    throw new Parse.Error(error.code, error.message)
  }

})

Parse.Cloud.afterSave('Order', async (req) => {

  let obj = req.object
  let attrs = obj.attributes
  const original = req.original
  const user = req.user
  const { notify } = req.context

  // Send push notification to customer when order status changes

  if (obj.existed()) {

    try {

      const origAttrs = original.attributes

      if (attrs.status !== origAttrs.status) {

        if (notify) {

          const pushQuery = new Parse.Query(Parse.Installation)
          pushQuery.equalTo('isPushEnabled', true)
          pushQuery.equalTo('user', attrs.customer)

          const query = new Parse.Query('AppConfig')
          const config = await query.first({
            useMasterKey: true
          })

          if (config && config.get('push')) {

            const pushConfig = config.get('push')

            const formattedStatus = attrs.status
              .replace(/\s+/g, '_')
              .toLowerCase()

            let pushMessage = pushConfig['order_' + formattedStatus]

            if (pushMessage) {

              pushMessage = pushMessage.replace('%ORDER_NUMBER%', attrs.number)

              const pushParams = {
                where: pushQuery,
                data: {
                  alert: pushMessage,
                  event: 'order',
                  orderId: obj.id,
                  sound: 'default'
                }
              }

              Parse.Push.send(pushParams, {
                useMasterKey: true
              })
            }

          }

          if (config && config.get('email')) {

            const emailConfig = config.get('email')
            const adminConfig = config.get('admin')

            const fromAddress = emailConfig.fromAddress || process.env.MAILGUN_FROM_ADDRESS

            await attrs.customer.fetch({ useMasterKey: true })

            const customerEmail = attrs.contact.email
            const customerName = attrs.customer.get('name') || customerEmail

            const formattedStatus = attrs.status
              .replace(/\s+/g, '_')

            let body = emailConfig['order_body_' + formattedStatus.toLowerCase()] ||
              __('EMAIL_BODY_ORDER_' + formattedStatus.toUpperCase())
            body = body.replace('%ORDER_NUMBER%', attrs.number)
            body = body.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
            body = body.replace('%CUSTOMER_NAME%', customerName)

            if (attrs.status === 'Cancelled') {
              body = body.replace('%REASON%', attrs.cancellationReason || '---')
            }

            if (attrs.status === 'Shipped Out') {
              const trackingNumber = attrs.tracking ? attrs.tracking.number : ''
              const trackingCarrier = attrs.tracking ? attrs.tracking.carrier : ''
              body = body.replace('%TRACKING_NUMBER%', trackingNumber || '---')
              body = body.replace('%TRACKING_CARRIER%', trackingCarrier || '---')
            }

            body = body.replace(/\n/g, '<br />');

            const email = {
              body: {
                signature: false,
                title: ' ',
                intro: body,
              }
            }

            if (emailConfig['order_details_' + formattedStatus.toLowerCase()]) {

              const { data, summary } = Utils.buildOrderDetails(attrs)

              email.body.table = { data }
              email.body.outro = summary

              email.body.table.columns = { customWidth: {}, customAlignment: {} }
              email.body.table.columns.customWidth[__('EMAIL_ITEM_AMOUNT')] = '15%'
              email.body.table.columns.customAlignment[__('EMAIL_ITEM_AMOUNT')] = 'right'
            }

            const mailgunHelper = new MailgunHelper({
              apiKey: process.env.MAILGUN_API_KEY,
              domain: process.env.MAILGUN_DOMAIN,
              host: process.env.MAILGUN_HOST,
            })

            const mailGenerator = new Mailgen({
              theme: 'default',
              product: {
                name: process.env.APP_NAME,
                link: process.env.MAILGUN_PUBLIC_LINK,
                logo: adminConfig.logo ? adminConfig.logo.url() : '',
                copyright: emailConfig.footer || __('EMAIL_COPYRIGHT')
              }
            })

            let subject = emailConfig['order_subject_' + formattedStatus.toLowerCase()] ||
              __('EMAIL_SUBJECT_ORDER_' + formattedStatus.toUpperCase())

            subject = subject.replace('%ORDER_NUMBER%', attrs.number)
            subject = subject.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
            subject = subject.replace('%CUSTOMER_NAME%', customerName)

            mailgunHelper.send({
              from: fromAddress,
              to: customerEmail,
              subject: subject,
              html: mailGenerator.generate(email),
            })

          }
        }

        const orderLog = new Parse.Object('OrderLog')
        orderLog.set('order', obj)
        orderLog.set('user', user || attrs.customer)
        orderLog.set('status', attrs.status.replace(/\s+/g, '_').toUpperCase())
        orderLog.set('type', 'ORDER_STATUS_CHANGED')
        orderLog.save(null, { useMasterKey: true })

      }

      if (attrs.paymentStatus !== origAttrs.paymentStatus) {
        const orderLog = new Parse.Object('OrderLog')
        orderLog.set('order', obj)
        orderLog.set('user', user)
        orderLog.set('status', attrs.paymentStatus.replace(/\s+/g, '_').toUpperCase())
        orderLog.set('type', 'ORDER_PAYMENT_STATUS_CHANGED')
        orderLog.save(null, { useMasterKey: true })
      }

    } catch (error) {
      // error
    }
  }

  // clean cart...

  if (!obj.existed() && user) {

    try {

      const query = new Parse.Query('Cart')
      query.equalTo('customer', attrs.customer)
      const cart = await query.first({
        useMasterKey: true
      })
      if (cart) cart.destroy({
        useMasterKey: true
      })

    } catch (err) {
      // error
    }

    try {

      user.set('contactEmail', attrs.contact ? attrs.contact.email : '')
      await user.save(null, {
        sessionToken: user.getSessionToken()
      })
      
    } catch (error) {
      console.log(error.message)
    }

  }

  // Increment coupon usage

  if (!obj.existed()) {

    const coupon = attrs.coupon

    if (coupon) {

      try {
        const couponObj = new Parse.Object('Coupon')
        couponObj.id = coupon.id
        couponObj.increment('usageCount', 1)
        await couponObj.save(null, { useMasterKey: true })
      } catch (error) {
        console.log(error.message)
      }
    }

    // Send email order confirmation to owner shop

    try {

      const query = new Parse.Query('AppConfig')
      const config = await query.first({
        useMasterKey: true
      })
      const emailConfig = config.get('email')
      const adminConfig = config.get('admin')

      const fromAddress = emailConfig.fromAddress || process.env.MAILGUN_FROM_ADDRESS

      if (emailConfig && emailConfig.addressForNewOrders) {

        await attrs.customer.fetch({ useMasterKey: true })

        const customerEmail = attrs.contact.email
        const customerName = attrs.customer.get('name') || customerEmail

        let body = emailConfig.bodyNewOrder || __('EMAIL_BODY_NEW_ORDER')
        body = body.replace('%ORDER_NUMBER%', attrs.number)
        body = body.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
        body = body.replace('%CUSTOMER_NAME%', customerName)

        const email = {
          body: {
            title: ' ',
            intro: body,
            signature: false,
            action: {
              instructions: '',
              button: {
                text: __('EMAIL_VIEW_ORDERS_BUTTON'),
                link: process.env.PUBLIC_SERVER_URL + '/admin/orders'
              }
            },
          }
        }

        if (emailConfig.detailsNewOrder) {

          const { data, summary } = Utils.buildOrderDetails(attrs)

          email.body.table = { data }
          email.body.outro = summary

          email.body.table.columns = { customWidth: {}, customAlignment: {} }
          email.body.table.columns.customWidth[__('EMAIL_ITEM_AMOUNT')] = '15%'
          email.body.table.columns.customAlignment[__('EMAIL_ITEM_AMOUNT')] = 'right'
        }

        const mailgunHelper = new MailgunHelper({
          apiKey: process.env.MAILGUN_API_KEY,
          domain: process.env.MAILGUN_DOMAIN,
          host: process.env.MAILGUN_HOST,
        })

        const mailGenerator = new Mailgen({
          theme: 'default',
          product: {
            name: process.env.APP_NAME,
            link: process.env.MAILGUN_PUBLIC_LINK,
            logo: adminConfig.logo ? adminConfig.logo.url() : '',
            copyright: emailConfig.footer || __('EMAIL_COPYRIGHT')
          }
        })

        let subject = emailConfig.subjectForNewOrders || __('EMAIL_SUBJECT_NEW_ORDER')
        subject = subject.replace('%ORDER_NUMBER%', attrs.number)
        subject = subject.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
        subject = subject.replace('%CUSTOMER_NAME%', customerName)

        mailgunHelper.send({
          subject: subject,
          from: fromAddress,
          to: emailConfig.addressForNewOrders,
          html: mailGenerator.generate(email),
        })

      }

    } catch (err) {
      console.log(err)
    }

    // Send email order confirmation to customer

    try {

      const query = new Parse.Query('AppConfig')
      const config = await query.first({
        useMasterKey: true
      })

      const emailConfig = config.get('email')
      const adminConfig = config.get('admin')

      const fromAddress = emailConfig.fromAddress || process.env.MAILGUN_FROM_ADDRESS

      await attrs.customer.fetch({ useMasterKey: true })

      const customerEmail = attrs.contact.email
      const customerName = attrs.customer.get('name') || customerEmail

      let body = emailConfig.bodyOrderConfirmation || __('EMAIL_BODY_ORDER_CONFIRMATION')
      body = body.replace('%ORDER_NUMBER%', attrs.number)
      body = body.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
      body = body.replace('%CUSTOMER_NAME%', customerName)
      body = body.replace(/\n/g, '<br />');

      const email = {
        body: {
          signature: false,
          title: ' ',
          intro: body,
        }
      }

      if (emailConfig.detailsOrderConfirmation) {

        const { data, summary } = Utils.buildOrderDetails(attrs)

        email.body.table = { data }
        email.body.outro = summary

        email.body.table.columns = { customWidth: {}, customAlignment: {} }
        email.body.table.columns.customWidth[__('EMAIL_ITEM_AMOUNT')] = '15%'
        email.body.table.columns.customAlignment[__('EMAIL_ITEM_AMOUNT')] = 'right'
      }

      const mailgunHelper = new MailgunHelper({
        apiKey: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
        host: process.env.MAILGUN_HOST,
      })

      const mailGenerator = new Mailgen({
        theme: 'default',
        product: {
          name: process.env.APP_NAME,
          link: process.env.MAILGUN_PUBLIC_LINK,
          logo: adminConfig.logo ? adminConfig.logo.url() : '',
          copyright: emailConfig.footer || __('EMAIL_COPYRIGHT')
        }
      })

      let subject = emailConfig.subjectOrderConfirmation || __('EMAIL_SUBJECT_ORDER_CONFIRMATION')
      subject = subject.replace('%ORDER_NUMBER%', attrs.number)
      subject = subject.replace('%ORDER_TOTAL%', Utils.formatCurrency(attrs.total))
      subject = subject.replace('%CUSTOMER_NAME%', customerName)

      mailgunHelper.send({
        from: fromAddress,
        to: customerEmail,
        subject: subject,
        html: mailGenerator.generate(email),
      })

    } catch (err) {
      console.log(err)
    }

    const orderLog = new Parse.Object('OrderLog')
    orderLog.set('order', obj)
    orderLog.set('user', attrs.customer)
    orderLog.set('type', 'ORDER_PLACED')
    orderLog.save(null, { useMasterKey: true })

  }

})

Parse.Cloud.define('markOrdersAsSeen', async (req) => {

  const user = req.user

  const isAdmin = await Utils.isAdmin(user)
  if (!isAdmin && !req.master) throw 'Not Authorized'

  const query = new Parse.Query('Order')
  query.notEqualTo('views', user)

  const orders = await query.find({ useMasterKey: true })

  const promises = orders.map(order => {
    const relation = order.relation('views')
    relation.add(user)
    return order.save(null, {
      useMasterKey: true
    })
  })

  return await Promise.all(promises)
})

Parse.Cloud.define('markOrderAsDelivered', async (req) => {

  const params = req.params
  const user = req.user

  if (!user && !req.master) throw 'Not Authorized'

  const query = new Parse.Query('Order')
  const order = await query.get(params.id, {
    useMasterKey: true
  })

  if (user.id !== order.get('customer').id) {
    throw 'Invalid customer'
  }

  if (order.get('status') !== 'Shipped Out') {
    throw 'Invalid status'
  }

  order.set('status', 'Delivered')

  return await order.save(null, {
    useMasterKey: true
  })

})

Parse.Cloud.define('reviewOrderItem', async (req) => {

  const params = req.params
  const user = req.user

  if (!user && !req.master) throw 'Not Authorized'

  const query = new Parse.Query('Order')
  const order = await query.get(params.id, {
    useMasterKey: true
  })

  if (user.id !== order.get('customer').id) {
    throw 'Invalid customer'
  }

  const items = order.get('items')

  const item = items.find(item => item.objectId === params.itemId)

  if (!item) {
    throw 'Item not found'
  }

  const itemObj = new Item
  itemObj.id = params.itemId

  const review = new Review

  review.rating = params.rating
  review.comment = params.comment
  review.order = order
  review.item = itemObj

  await review.save(null, {
    sessionToken: user.getSessionToken()
  })

  item.rating = params.rating

  await order.save(null, {
    useMasterKey: true
  })

  return order

})

Parse.Cloud.define('updateOrderStatus', async (req) => {

  const params = req.params
  const user = req.user

  const query = new Parse.Query('Order')
  const order = await query.get(params.orderId, {
    sessionToken: user.getSessionToken()
  })

  const validStatusList = [
    'Pending',
    'In Process',
    'Packed',
    'Shipped Out',
    'Delivered',
    'Cancelled',
  ]

  if (!validStatusList.includes(params.status)) {
    throw 'Invalid status'
  }

  order.set('status', params.status)

  if (params.reason && params.status === 'Cancelled') {
    order.set('cancellationReason', params.reason)
  }

  if (params.tracking && params.status === 'Shipped Out') {
    order.set('tracking', params.tracking)
  }

  await order.save(null, {
    sessionToken: user.getSessionToken(),
    context: { notify: params.notify }
  })

  return order

})
