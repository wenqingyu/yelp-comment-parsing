var Crawler = require("crawler");
let xlsxHandler = require('./utils/xlsxHandler')
const Regex = require('regexper.js');
const db = require('./utils/db')
const mysql = require('./utils/mysql')
const _ = require('lodash')
let webHandler = require('./utils/webHandler')

let proxy = ''

let requestCount = 0
let isRefresh = false
let city = ''

let citys = [
  "Chicago",
  "Las Vegas",
  "Los Angeles",
  "New York",
  "Orlando"
]

let preRequest = async function(options, done) {
  try{
    options.proxy = db.get('proxy.url').value()
    if(requestCount>=100||isRefresh){
      await webHandler.RefreshProxy()
      requestCount=0
      isRefresh=false
    }
  }catch(err){
    console.log(err)
  }
  
  done();
}

var businessCraw = new Crawler({
    maxConnections: 100,
    preRequest: async function(options, done) {
      requestCount++
      preRequest(options,done)
    },
    callback :async function (error, res, done) {
        if(error){
            console.log(error);
        }else{
            try{
              JSON.parse(res.body)
              let businessResult = JSON.parse(res.body)
              let bs = []
              if(businessResult.searchPageProps){
                let result = businessResult.searchPageProps.searchMapProps.hovercardData
                for(let key of Object.keys(result)){
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
              }else{
                let result = businessResult.search_results
                let regex = new Regex(/href="([^"]+)"><span\s*>([^<]+)[\s\S]*?(\d*\.\d*)\s*star[\s\S]+?(\d+)\s*reviews[\s\S]+?address>\S*\s*([^<\n]+)\S*\s*/,'ig'); 
                let matches = regex.matches(unescape(result))
                for(let match of matches){
                  let tTmp = {}
                  tTmp.url = match.groups[1]
                  tTmp.Rest_Name = match.groups[2]
                  tTmp.Rest_Rate = match.groups[3]
                  tTmp.Rest_total_Reviews = match.groups[4]
                  tTmp.Rest_location = match.groups[5]
                  bs.push(tTmp)
                }
              }
              for(let business of bs){
                let obj = {
                  url : business.url,
                  Rest_Name : business.Rest_Name,
                  Rest_Rate : business.Rest_Rate,
                  Rest_total_Reviews : business.Rest_total_Reviews,
                  Rest_location : business.Rest_location,
                  city,
                }
                await mysql.Business.findOrCreate({
                  where:obj,
                  defaults:obj
                })
                commentCraw.queue({
                  uri: `https://www.yelp.com${business.url}/review_feed?start=0&sort_by=date_desc`
                });
              }
            }catch(err){
              console.log(err)
            }
        }
        done();
    }
});

var commentCraw = new Crawler({
    maxConnections: 100,
    preRequest: async function(options, done) {
      requestCount++
      preRequest(options,done)
    },
    callback :async function (error, res, done) {
        requestCount++
        if(error){
          console.log(error)
        }else{
          try{
            let page =parseInt(/start=(\d*)/.exec(res.options.uri)[1]) / 20
            if(page<130){
              let url  = res.options.uri.replace(/start=\d*/,'start='+((page+1)*20))
              commentCraw.queue({
                url
              });
            }
            JSON.parse(res.body)
            let businessInfoResult = JSON.parse(res.body)
            console.log('得到商铺详情，开始匹配评论')
            let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/,'ig'); 
            let matches = regex.matches(unescape(businessInfoResult.review_list))
            let commentInfos = []
            for(let match of matches){
              if(new Date(match.groups[3])>new Date('10/1/2017')){
                let obj = {
                  Cus_Name : match.groups[1],
                  Cus_Review_Rate : match.groups[2],
                  Cus_Review_Date : new Date(match.groups[3]),
                  Review : match.groups[4],
                  url : /www.yelp.com([\s\S]+?)\/review_feed/.exec(res.options.uri)[1]
                }
                await mysql.Comment.findOrCreate({
                  where: obj,
                  defaults: obj
                })
              }
            }
          }catch(err){
            console.log(err)
          }
        }
        done()
    }
});

async function begin(city){
  await webHandler.RefreshProxy()
  requestCount = 0
  proxy = db.get('proxy.url').value()
  for(let i=0;i<100;i++){
    businessCraw.queue({
      uri: `https://www.yelp.com/search/snippet?find_desc=&find_loc=${city}&start=${i*10}`
    });
  }
}


city = process.argv.splice(2)[0]||citys[0]
//是否使用代理服务器
begin()


