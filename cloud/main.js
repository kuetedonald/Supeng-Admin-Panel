// Import cloud functions
// Cloud code guide: https://docs.parseplatform.org/cloudcode/guide/

require('./app-config')
require('./card')
require('./cart')
require('./category')
require('./subcategory')
require('./customer-address')
require('./item')
require('./notification')
require('./order')
require('./order-count')
require('./parse-installation')
require('./slide-image')
require('./subcategory')
require('./user')
require('./zone')
require('./review')
require('./item-variation')
require('./brand')
require('./page')
require('./coupon')
require('./order-log')

// Cloud function called in home page of mobile app

Parse.Cloud.define('getHomePageData', async () => {

  // Categories
  const query1 = new Parse.Query('Category')
  query1.doesNotExist('deletedAt')
  query1.equalTo('isFeatured', true)
  query1.equalTo('status', 'Active')
  query1.ascending('name')
  query1.limit(8)

  // Sale items
  const query2 = new Parse.Query('Item')
  query2.equalTo('status', 'Active')
  query2.greaterThan('salePrice', 0)
  query2.doesNotExist('deletedAt')
  query2.limit(8)
  query2.descending('createdAt')

  // New arrival items
  const query3 = new Parse.Query('Item')
  query3.equalTo('status', 'Active')
  query3.equalTo('isNewArrival', true)
  query3.doesNotExist('deletedAt')
  query3.limit(8)
  query3.descending('createdAt')

  // Featured items
  const query4 = new Parse.Query('Item')
  query4.equalTo('status', 'Active')
  query4.equalTo('isFeatured', true)
  query4.doesNotExist('deletedAt')
  query4.limit(8)
  query4.descending('createdAt')

  // Latest items
  const query5 = new Parse.Query('Item')
  query5.equalTo('status', 'Active')
  query5.doesNotExist('deletedAt')
  query5.limit(20)
  query5.descending('createdAt')

  // Slide images
  const query6 = new Parse.Query('SlideImage')
  query6.equalTo('isActive', true)
  query6.ascending('sort')
  query6.include('item')

  // Brands
  const query7 = new Parse.Query('Brand')
  query7.equalTo('status', 'Active')
  query7.ascending('name')
  query7.doesNotExist('deletedAt')
  query7.limit(8)

  const results = await Promise.all([
    query1.find(),
    query2.find(),
    query3.find(),
    query4.find(),
    query5.find(),
    query6.find(),
    query7.find(),
  ])

  return {
    categories: results[0],
    itemsOnSale: results[1],
    itemsNewArrival: results[2],
    itemsFeatured: results[3],
    items: results[4],
    slides: results[5],
    brands: results[6],
  }

})