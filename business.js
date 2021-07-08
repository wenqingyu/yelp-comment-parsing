var Crawler = require('crawler')
const Regex = require('regexper.js')
const mysql = require('./utils/mysql')
const db = require('./utils/db')
const webHandler = require('./utils/webHandler')
let requestCount = 0

let citys = [
  'Chicago',
  'Las Vegas',
  'Los Angeles',
  'New York',
  'Orlando'
]

let preRequest = async function (options, done) {
  options.retryTimeout = 5000
  options.proxy = db.get('proxy.url').value()
  requestCount++
  if (requestCount >= 50) {
    requestCount = 0
    await webHandler.RefreshProxy()
  }

  done()
}

var businessCraw = new Crawler({
  maxConnections: 50,
  preRequest: async function (options, done) {
    preRequest(options, done)
  },
  callback: async function (error, res, done) {
    if (error) {
      console.log(error)
    } else {
      try {
        console.log('进入：' + res.options.uri)
        let businessResult = JSON.parse(res.body)
        let bs = []
        if (businessResult.searchPageProps) {
          let result = businessResult.searchPageProps.searchMapProps.hovercardData
          for (let key of Object.keys(result)) {
            let business = result[key]
            let tTmp = {}
            tTmp.url = `/biz/${business.photoPageUrl.match(/biz_photos\/([^?]+)/)[1]}`
            tTmp.Rest_Name = business.name
            tTmp.Rest_Rate = business.rating
            tTmp.Rest_Price = 0
            tTmp.Rest_total_Reviews = business.numReviews
            tTmp.Rest_location = `${business.addressLines[0]} \n ${business.addressLines[1]}`
            bs.push(tTmp)
          }
        } else {
          let result = businessResult.search_results
          let regex = new Regex(/href="([^"]+)"><span\s*>([^<]+)[\s\S]*?(\d*\.\d*)\s*star[\s\S]+?(\d+)\s*reviews[\s\S]+?address>\S*\s*([^<\n]+)\S*\s*/, 'ig')
          let matches = regex.matches(unescape(result))
          for (let match of matches) {
            let tTmp = {}
            tTmp.url = match.groups[1]
            tTmp.Rest_Name = match.groups[2]
            tTmp.Rest_Rate = match.groups[3]
            tTmp.Rest_total_Reviews = match.groups[4]
            tTmp.Rest_location = match.groups[5]
            bs.push(tTmp)
          }
        }
        for (let business of bs) {
          let obj = {
            url: business.url,
            Rest_Name: business.Rest_Name,
            Rest_Rate: business.Rest_Rate,
            Rest_total_Reviews: business.Rest_total_Reviews,
            Rest_location: business.Rest_location,
            city: /find_loc=([^&]+)/.exec(res.options.uri)[1]
          }

          await mysql.Business.findOrCreate({
            where: obj,
            defaults: obj
          })
        }
      } catch (err) {
        console.log(err)
      }
    }
    done()
  }
})

async function begin () {
  await webHandler.RefreshProxy()
  for (let city of citys) {
    for (let i = 0; i <= 99; i++) {
      businessCraw.queue({
        uri: `https://www.yelp.com/search/snippet?find_desc=&find_loc=${city}&start=${i * 10}`
      })
    }
  }
}

begin()
