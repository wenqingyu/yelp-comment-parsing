let webHandler = require('./utils/webHandler')
let xlsxHandler = require('./utils/xlsxHandler')
const Regex = require('regexper.js');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');  // 有多种适配器可选择
const adapter = new FileSync('db.json'); // 申明一个适配器
const db = low(adapter);

let businessPage = 0
let commentPage = 0



let citys = [
  "Chicago",
  "Las Vegas",
  "Los Angeles",
  "New York",
  "Orlando"
]

async function work(city, proxy) {
  businessPage =  await db.get('pages.'+city).value().businessPage
  commentPage = await db.get('pages.'+city).value().commentPage
  while(true){
    console.log(`获取第${businessPage+1}页，城市:${city}`)
    let businessResult = await webHandler.Get(`https://www.yelp.com/search/snippet?find_desc=&find_loc=${city}&start=${(businessPage)*10}`,null,null,true,proxy)
    let businessInfos = []
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
        businessInfos.push(tTmp)
      }
    }else{
      let result = businessResult.search_results
      let regex = new Regex(/href="([^"]+)"><span\s*>([^<]+)[\s\S]*?(\d*\.\d*)\s*star[\s\S]+?(\d+)\s*reviews[\s\S]+?address>\S*\s*([^<\n]+)\S*\s*/,'ig'); 
      let matches = regex.matches(result)
      for(let match of matches){
        let tTmp = {}
        tTmp.url = match.groups[1]
        tTmp.Rest_Name = match.groups[2]
        tTmp.Rest_Rate = match.groups[3]
        tTmp.Rest_Price = 0
        tTmp.Rest_total_Reviews = match.groups[4]
        tTmp.Rest_location = match.groups[5]
        businessInfos.push(tTmp)
      }
    }

    console.log('根据商铺获取评论数据')
    for(let businessInfo of businessInfos){
      while(true){
        //分页读取评论列表
        let commentUrl = `https://www.yelp.com${businessInfo.url}/review_feed?start=${(commentPage)*20}&sort_by=date_desc`
        console.log(commentUrl)
        let businessInfoResult = await webHandler.Get(commentUrl,null,null,true,proxy)
        console.log('得到商铺详情，开始匹配评论')
        let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/,'ig'); 
        let matches = regex.matches(businessInfoResult.review_list)
        if(matches.length<=0){
          commentPage = 0
          await db.set('pages.'+city,{
            businessPage:businessPage,
            commentPage:0
          }).write()
          return
        }
        let commentInfos = []
        for(let match of matches){
          let tTmp = {}
          tTmp.Cus_Name = match.groups[1]
          tTmp.Cus_Review_Rate = match.groups[2]
          tTmp.Cus_Review_Date = match.groups[3]
          tTmp.Review = match.groups[4]
          commentInfos.push(tTmp)
          if(new Date(tTmp.Cus_Review_Date)<new Date('1/10/2017')){
            commentPage = 0
            await db.set('pages.'+city,{
              businessPage:businessPage,
              commentPage:0
            }).write()
            return
          }
        }

        let rows = []

        for(let comment of commentInfos){
          rows.push([
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

        //写入excel
        await xlsxHandler.insertRows(rows,'./excels/'+`${city}.xlsx` , city , ["City",'Rest_Name','Rest_Rate','location','Cus_Name','Cus_Rate','Cus_Review_Date','Review'])
        commentPage++
        await db.set('pages.'+city,{
          businessPage:businessPage,
          commentPage:commentPage
        }).write()
      }
    }
    businessPage++
    await db.set('pages.'+city,{
      businessPage:businessPage,
      commentPage:commentPage
    }).write()
  }
}

async function begin(isUsedproxy,city) {
  let pageObj = await db.get('pages.'+city).value()
  if(!pageObj){
    await db.set('pages.'+city,{
      businessPage:0,
      commentPage:0
    }).write()
  }
  let proxy = null
  //是否使用代理服务器
  if(isUsedproxy){
    proxy = true
  }
  try{
    await work(city,proxy)
  }catch(err){
    console.log('错误自修复，重启成功')
    webHandler.RefreshProxy()
    begin(isUsedproxy,city)
  }
}



//是否使用代理服务器
begin(true,process.argv.splice(2)[0]||citys[1])