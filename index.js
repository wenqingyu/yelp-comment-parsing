let webHandler = require('./utils/webHandler')

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
  let businessResult = await webHandler.Get(`https://www.yelp.com/search/snippet?find_desc=&find_loc=Chicago`,null,null,true)
  console.log('匹配')
  console.log(Object.keys(businessResult))

  let businessInfo = {
    City: city,
    Rest_Name: '',
    Rest_Rate: 0,
    Rest_total_Reviews: 0,
    Rest_Price: 0,
    Rest_location:'',
    url: ''
  }

  if(businessResult.searchPageProps){
    let result = businessResult.searchPageProps.searchMapProps.hovercardData
    for(let key of Object.keys(result)){
      let business = result[key]
      businessInfo.url = business.businessUrl
      businessInfo.Rest_Name = business.name
      businessInfo.Rest_Rate = business.rating
      businessInfo.Rest_total_Reviews = business.numReviews
      businessInfo.Rest_location = business.addressLines[0]
      console.log(businessInfo)
    }
  }else{
    let result = businessResult.search_results
    while(true){
      let match = result.match(/href="([^"]+)"><span\s*>([^<]+)[\s\S]*?(\d*\.\d*)\s*star[\s\S]+?(\d+)\s*reviews[\s\S]+?address>\S*\s*([^<\n]+)\S*\s*/)
      if(!match){
        break
      }
      businessInfo.url = match[1]
      businessInfo.Rest_Name = match[2]
      businessInfo.Rest_Rate = match[3]
      businessInfo.Rest_total_Reviews = match[4]
      businessInfo.Rest_location = match[5]
      console.log(businessInfo)
    }
  }



  /*
  let businessResult = await webHandler.Get(`https://www.yelp.com/biz/girl-and-the-goat-chicago?start=20`,null,null,false)
  console.log('匹配')
  console.log(businessResult.match(/(Echoing) a lot of what I've/)[1])
   */
}

async function begin(city) {
  while(true){
    await work(citys[0])
  }
}


begin()