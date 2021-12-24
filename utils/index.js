const stripe = require('stripe')

function Utils() { }

Utils.isAdmin = function (user) {
  const query = new Parse.Query(Parse.Role)
  query.equalTo('name', 'Admin')
  query.equalTo('users', user)
  return query.first()
};

Utils.formatCurrency = function (value) {
  return value.toLocaleString(process.env.CURRENCY_LOCALE, {
    style: 'currency',
    currency: process.env.CURRENCY,
    currencyDisplay: process.env.CURRENCY_DISPLAY
  })
}

Utils.isZeroDecimalCurrency = function (currency) {
  const zeroDecimalCurrencies = [
    'BIF', 'DJF', 'JPY', 'KRW', 'PYG', 'VND', 'XAF',
    'XPF', 'CLP', 'GNF', 'KMF', 'MGA', 'RWF', 'VUV', 'XOF'
  ];
  return zeroDecimalCurrencies.includes(currency)
}

Utils.getConfig = async function () {
  const query = new Parse.Query('AppConfig')
  return await query.first({
    useMasterKey: true
  })
};

Utils.generateNextOrderNumber = async function () {

  try {
    const query = new Parse.Query('OrderCount')
    let obj = await query.first({ useMasterKey: true })
    obj = obj || new Parse.Object('OrderCount')
    obj.increment('count')
    await obj.save(null, { useMasterKey: true })
    return obj.attributes.count
  } catch (error) {
    return null
  }

};

Utils.createOrGetStripeCustomerId = async function (user) {
  try {

    await user.fetch()

    if (user.get('stripeCustomerId')) {
      return user.get('stripeCustomerId')
    }

    const queryConfig = new Parse.Query('AppConfig')
    const config = await queryConfig.first({
      useMasterKey: true
    })

    const stripeConfig = config.get('stripe')

    const stripeInstance = stripe(stripeConfig.secretKey)

    const customer = await stripeInstance.customers.create({
      email: user.get('email'),
      description: `Customer for ${user.get('username')}`
    })

    user.set('stripeCustomerId', customer.id)

    await user.save(null, {
      useMasterKey: true
    })

    return user.get('stripeCustomerId')

  } catch (error) {
    return null
  }
};

Utils.roundNumber = function (number) {
  return Math.round(number * 100) / 100
}

Utils.buildOrderDetails = function (attrs) {
  
  const data = attrs.items.map(item => {
    const row = {}
    row[__('EMAIL_ITEM_TITLE')] = item.qty + ' x ' + item.name + (item.variation ? ' (' + item.variation.name + ')' : '')
  

    if (item.hasOwnProperty('finalAmount')) {

      if (item.amount > item.finalAmount) {
        row[__('EMAIL_ITEM_AMOUNT')] = `
        <s>${Utils.formatCurrency(item.amount)}</s><br/>
        <span>${Utils.formatCurrency(item.finalAmount)}</span>
        `
      } else {
        row[__('EMAIL_ITEM_AMOUNT')] = Utils.formatCurrency(item.finalAmount)
      }

    } else {
      row[__('EMAIL_ITEM_AMOUNT')] = Utils.formatCurrency(item.amount)
    }
    return row
  })

  let summary = [
    `<strong>${__('ORDER_SUMMARY')}</strong>`,
    `${__('SUBTOTAL')}: ${Utils.formatCurrency(attrs.subtotal)}`,
  ]

  const coupon = attrs.coupon

  if (coupon) {
    summary.push(`${__('DISCOUNT')}: (${coupon.name}) ${Utils.formatCurrency(-coupon.amount)}`)
  }

  summary.push(`${__('SHIPPING_FEE')}: ${Utils.formatCurrency(attrs.shippingFee)}`)
  summary.push(`${__('TOTAL')}: ${Utils.formatCurrency(attrs.total)}`)

  return { data, summary }
}

module.exports = Utils;