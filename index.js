let webHandler = require('./utils/webHandler')
const Regex = require('regexper.js');

let citys = [
  "Chicago",
  "Las Vegas",
  "Los Angeles",
  "New York",
  "Orlando"
]

let count=0

async function work(city) {
  let page = 0

  while(true){
    page++
    console.log(`获取第${page}页，城市:${city}`)
    let businessResult = await webHandler.Get(`https://www.yelp.com/search/snippet?find_desc=&find_loc=Chicago&start=${(page-1)*10}`,null,null,true)

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
      let commentPage = 0
      let isCommentRunning = true
      while(isCommentRunning){
        commentPage++
        console.log(`https://www.yelp.com${businessInfo.url}/review_feed/?start=0&sort_by=date_desc`)
        let businessInfoResult = await webHandler.Get(`https://www.yelp.com${businessInfo.url}/review_feed/?start=${(page-1)*20}&sort_by=date_desc`,null,null,true)
        console.log('得到商铺详情，开始匹配评论')
        //评论列表
        let regex = new Regex(/dropdown_user-name[^>]+?>([^<]+)[\s\S]+?([\d\.]+)\s*star rating[\s\S]+?rating-qualifier\S+\s*([\d\/]+)[\s\S]+?<p[^>]+>([\s\S]+?<\/p>)/,'ig'); 
        let matches = regex.matches(businessInfoResult.review_list)
        let commentInfos = []
        for(let match of matches){
          let tTmp = {}
          tTmp.Cus_Name = match.groups[1]
          tTmp.Cus_Review_Rate = match.groups[2]
          tTmp.Cus_Review_Date = match.groups[3]
          tTmp.Review = match.groups[4]
          commentInfos.push(tTmp)
          if(new Date(tTmp.Cus_Review_Date)<new Date('1/1/2018')){
            isCommentRunning = false
          }
          continue
        }
        console.log(commentInfos)
      }
    }
  }
}

async function begin(city) {
  while(true){
    await work(citys[0])
  }
}


begin()