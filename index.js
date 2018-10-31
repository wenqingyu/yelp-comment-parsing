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
        tTmp.url = match[1]
        tTmp.Rest_Name = match[2]
        tTmp.Rest_Rate = match[3]
        tTmp.Rest_Price = 0
        tTmp.Rest_total_Reviews = match[4]
        tTmp.Rest_location = match[5]
        businessInfos.push(tTmp)
      }
    }

    console.log(businessInfos)
    console.log('根据商铺获取评论数据')
    for(let businessInfo of businessInfos){
      console.log(`https://www.yelp.com${businessInfo.url}`)
      let businessInfoResult = await webHandler.Get(`https://www.yelp.com${businessInfo.url}`,null,null,false)
      //评论列表
      let regex = new Regex(/class="user-name"[\s\S]+?>([^<]+)[\s\S]+?<b>(\d+)[\s\S]+?<b>(\d+)<\/b>\s*reviews[\s\S]+?(\d+)<[\s\S]+?(\d+\.\d*)[\s\S]*?star rating[\s\S]+?<span class="rating-qualifier">\s*(\S+)[\s\S]+?<p\s*lang="en">([\s\S]+?)<\/p>[\s\S]+?Useful[\s\S+]?count">([^<]+)[\s\S]+?Funny[\s\S+]?count">([^<]+)[\s\S]+?Cool[\s\S+]?count">([^<]+)/,'i'); 
      let matches = regex.matches(businessInfoResult)
      console.log(matches[1])
      console.log('写入excel')
    }
  }

}

async function begin(city) {
  while(true){
    await work(citys[0])
  }
}


begin()