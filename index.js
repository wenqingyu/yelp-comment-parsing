var Crawler = require('crawler')
const Regex = require('regexper.js')
const db = require('./utils/db')
const mysql = require('./utils/mysql')
let webHandler = require('./utils/webHandler')

let requestCount = 0

let citys = [
  'Chicago',
  'Las Vegas',
  'Los Angeles',
  'New York',
  'Orlando'
]

let preRequest = async function (options, done) {
  try {
    requestCount++
    console.log(requestCount)
    options.proxy = db.get('proxy.url').value()
    if (requestCount >= 50) {
      requestCount = 0
      await webHandler.RefreshProxy()
    }
  } catch (err) {
    console.log(err)
  }

  done()
}

var businessCraw = new Crawler({
  maxConnections: 100,
  preRequest: async function (options, done) {
    preRequest(options, done)
  },
  callback: async function (error, res, done) {
    if (error) {
      console.log(error)
    } else {
      try {
        console.log('进入：' + res.options.uri)
        JSON.parse(res.body)
        let businessResult = JSON.parse(res.body)
        let bs = []
        if (businessResult.searchPageProps) {
          let result = businessResult.searchPageProps.searchMapProps.hovercardData
          for (let key of Object.keys(result)) {
            let business = result[key]
            let tTmp = {}
            tTmp.url = business.businessUrl
            tTmp.Rest_Name = business.name
            tTmp.Rest_Rate = business.rating
            tTmp.Rest_Price = 0
            tTmp.Rest_total_Reviews = business.numReviews
            tTmp.Rest_location = business.addressLines[0]
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
        let businessQues = []
        for (let business of bs) {
          let obj = {
            url: business.url,
            Rest_Name: business.Rest_Name,
            Rest_Rate: business.Rest_Rate,
            Rest_total_Reviews: business.Rest_total_Reviews,
            Rest_location: business.Rest_location,
            city: /find_loc=([^&]+)/.exec(res.options.uri)[1]
          }

          businessQues.push(`('${business.url}','${business.Rest_Name}','${business.Rest_Rate}','${business.Rest_total_Reviews}','${business.Rest_location}','${obj.city}')`)

          console.log('comment入口：' + `https://www.yelp.com${business.url}/review_feed?start=0&sort_by=date_desc`)
          commentCraw.queue({
            uri: `https://www.yelp.com${business.url}/review_feed?start=0&sort_by=date_desc`
          })
        }
      } catch (err) {
        console.log(err)
      }
    }
    done()
  }
})

var commentCraw = new Crawler({
  maxConnections: 100,
  preRequest: async function (options, done) {
    preRequest(options, done)
  },
  callback: async function (error, res, done) {
    requestCount++
    if (error) {
      console.log(error)
    } else {
      try {
        let page = parseInt(/start=(\d*)/.exec(res.options.uri)[1]) / 20
        if (page < 130) {
          let url = res.options.uri.replace(/start=\d*/, 'start=' + ((page + 1) * 20))
          console.log('comment自进入：' + url)
          commentCraw.queue({
            uri: url
          })
        }
        JSON.parse(res.body)
        let businessInfoResult = JSON.parse(res.body)
        console.log('得到商铺详情，开始匹配评论')
        let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/, 'ig')
        let matches = regex.matches(unescape(businessInfoResult.review_list))
        for (let match of matches) {
          if (new Date(match.groups[3]) > new Date('10/1/2017')) {
            let obj = {
              Cus_Name: match.groups[1],
              Cus_Review_Rate: match.groups[2],
              Cus_Review_Date: new Date(match.groups[3]),
              Review: match.groups[4],
              url: /www.yelp.com([\s\S]+?)\/review_feed/.exec(res.options.uri)[1]
            }
            await mysql.Comment.findOrCreate({
              where: obj,
              defaults: obj
            })
          }
        }
      } catch (err) {
        console.log('报错：' + res.options.uri)
        console.log(err)
      }
    }
    done()
  }
})

async function begin () {
  await webHandler.RefreshProxy()
  for (let city of citys) {
    for (let i = 0; i <= 100; i++) {
      businessCraw.queue({
        uri: `https://www.yelp.com/search/snippet?find_desc=&find_loc=${city}&start=${i * 10}`
      })
    }
  }
}

begin()
