var Crawler = require("crawler");
let xlsxHandler = require('./utils/xlsxHandler')
const Regex = require('regexper.js');
const db = require('./utils/db')
const _ = require('lodash')
let webHandler = require('./utils/webHandler')

let proxy = ''

let businessInfos = []
let requestCount = 0
let isRefresh = false
let isWriting =false
let city = 'Chicago'
let comments = []

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
      preRequest(options,done)
    },
    callback :async function (error, res, done) {
        requestCount++
        if(error){
            console.log(error);
        }else{
            try{
              JSON.parse(res.body)
            }catch(err){
              console.log('无法访问，切换ip')
              isRefresh=true
            }
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
                tTmp.Rest_Price = 0
                tTmp.Rest_total_Reviews = match.groups[4]
                tTmp.Rest_location = match.groups[5]
                bs.push(tTmp)
              }
            }

            businessInfos=businessInfos.concat(bs)

            for(let business of bs){
              for(let i=0;i<=130;i++){
                commentCraw.queue({
                  uri: `https://www.yelp.com${business.url}/review_feed?start=${i*20}&sort_by=date_desc`
                });
              }
            }
        }
        done();
    }
});

var commentCraw = new Crawler({
    maxConnections: 100,
    preRequest: async function(options, done) {
      preRequest(options,done)
    },
    callback :async function (error, res, done) {
        requestCount++
        if(error){
          console.log(error)
        }else{
          try{
              JSON.parse(res.body)
            }catch(err){
              console.log('无法访问，切换ip')
              isRefresh=true
            }
          let businessInfoResult = JSON.parse(res.body)
          console.log('得到商铺详情，开始匹配评论')
          let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/,'ig'); 
          let matches = regex.matches(unescape(businessInfoResult.review_list))
          let commentInfos = []
          for(let match of matches){
            if(new Date(match.groups[3])<new Date('10/1/2017')){
              break
            }
            let tTmp = {}
            tTmp.Cus_Name = match.groups[1]
            tTmp.Cus_Review_Rate = match.groups[2]
            tTmp.Cus_Review_Date = match.groups[3]
            tTmp.Review = match.groups[4]
            commentInfos.push(tTmp)
          }

          for(let comment of commentInfos){
            let bindex = _.findIndex(businessInfos, function(o) { return res.options.uri.indexOf(o.url)>=0 });
            let businessInfo = businessInfos[bindex]
            comments.push([
                city,
                businessInfo.Rest_Name,
                businessInfo.Rest_Rate,
                businessInfo.Rest_location,
                comment.Cus_Name,
                comment.Cus_Review_Rate,
                comment.Cus_Review_Date,
                comment.Review
              ])
          }
          
        }
        done()
    }
});

setInterval(async () => {
  if(!isWriting){
    isWriting = true
    let cs = []
    for(let i=0;i<10;i++){
      cs.push(comments.shift(10))
    }
    if(cs[0]){
      //写入excel
      await xlsxHandler.insertRows(cs,'./excels/'+`${city}.xlsx` , city , ["City",'Rest_Name','Rest_Rate','location','Cus_Name','Cus_Rate','Cus_Review_Date','Review'])
    }
    isWriting = false
  }
}, 100);

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



//是否使用代理服务器
begin(process.argv.splice(2)[0]||citys[0])


