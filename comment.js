var Crawler = require('crawler')
const Regex = require('regexper.js')
const db = require('./utils/db')
const mysql = require('./utils/mysql')
const moment = require('moment')
let webHandler = require('./utils/webHandler')

let requestCount = 0

let preRequest = async function (options, done) {
  options.proxy = db.get('proxy.url').value()
  options.retryTimeout = 5000
  requestCount++
  if (requestCount >= 50) {
    requestCount = 0
    await webHandler.RefreshProxy()
  }

  done()
}

var commentCraw = new Crawler({
  maxConnections: 50,
  preRequest: async function (options, done) {
    preRequest(options, done)
  },
  callback: async function (error, res, done) {
    if (error) {
      console.log(error)
    } else {
      try {
        let page = parseInt(/start=(\d*)/.exec(res.options.uri)[1]) / 20
        if (page < 130) {
          let url = res.options.uri.replace(/start=\d*/, 'start=' + ((page + 1) * 20))
          commentCraw.queue({
            uri: url
          })
        }
        JSON.parse(res.body)
        let businessInfoResult = JSON.parse(res.body)
        console.log('得到商铺详情，开始匹配评论')
        let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/, 'ig')
        let html = unescape(businessInfoResult.review_list)
        let matches = regex.matches(html)
        let commentQues = []
        for (let match of matches) {
          if (new Date(match.groups[3]) > new Date('1/6/2018')) {
            let obj = {
              Cus_Name: match.groups[1],
              Cus_Review_Rate: match.groups[2],
              Cus_Review_Date: new Date(match.groups[3]),
              Review: match.groups[4],
              url: /www.yelp.com([\s\S]+?)\/review_feed/.exec(res.options.uri)[1],
              Helpful_Vote: /Useful<[\s\S]+?count">(\d*)/.exec(html)[1] || 0,
              Funny_Vote: /Funny<[\s\S]+?count">(\d*)/.exec(html)[1] || 0,
              Cool_Vote: /Cool<[\s\S]+?count">(\d*)/.exec(html)[1] || 0
            }
            commentQues.push(`(${res.options.businessId},'${obj.Cus_Name}','${obj.Cus_Review_Rate}','${moment(obj.Cus_Review_Date).format('YYYY-MM-DD')}','${obj.Review}','${obj.url}',${obj.Helpful_Vote},${obj.Funny_Vote},${obj.Cool_Vote})`)
          }
        }
        if (commentQues.length > 0) {
          global.sequelize.query(`
                INSERT INTO 

                comment(Business_Id,Cus_Name,Cus_Review_Rate,Cus_Review_Date,Review,url,Helpful_Vote,Funny_Vote,Cool_Vote) 
                
                VALUES
                ${commentQues.join(',')}
              `)
        }
      } catch (err) {
        if (err.toString().indexOf('TimeoutError') >= 0) {
          commentCraw.queue({
            uri: res.options.uri
          })
        } else {
          console.log('报错：' + res.options.uri)
          console.log(err)
        }
      }
    }
    done()
  }
})

async function begin () {
  await webHandler.RefreshProxy()
  let business = await mysql.Business.findAll({
    attributes: ['id', 'url'],
    order: [['id', 'ASC']]
  })
  for (let b of business) {
    commentCraw.queue({
      uri: `https://www.yelp.com${b.url}/review_feed?start=0&sort_by=date_desc`,
      businessId: b.id
    })
  }
}

// 是否使用代理服务器
begin()
