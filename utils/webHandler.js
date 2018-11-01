const request = require('request')
const requestSync = require('sync-request')
const md5 = require('md5')
const config = require('config')
const db = require('./db')
const moment = require('moment')

let webHandler = {

}

function UrlEncode (url) {
  url = encodeURIComponent(url)
  url = url.replace(/\\%3A/g, ':')
  url = url.replace(/\\%2F/g, '/')
  url = url.replace(/\\%3F/g, '?')
  url = url.replace(/\\%3D/g, '=')
  url = url.replace(/\\%26/g, '&')

  return url
}

webHandler.Post = (url, form, headers, isJson = true, cookie, isRespone = false) => {
  return new Promise((resolve, reject) => {
    request.post({
      url,
      headers,
      form
    },
    function (error, response, body) {
      try {
        if (error) {
          reject(error)
        }
        if (!response.statusCode) {
          reject(body)
        }

        if (isRespone) {
          resolve(response)
        }

        if (!error && /^2\d+/.test(response.statusCode.toString())) {
          isJson ? resolve(JSON.parse(body)) : resolve(body)
        } else {
          reject(body)
        }
      } catch (err) {
        console.log(err)
        reject(body)
      }
    }
    )
  })
}

function getFunc(url, query, cookie, isJson = true , proxy){
  return new Promise(async (resolve, reject) => {
    if (query) {
      url += `?query=${UrlEncode(query)}`
    }

    let proxyOption = null

    if(proxy){
      proxyOption = proxy
    }

    let t = setTimeout(() => {
      reject('timeout')
    }, 20000);

    request.get({
      url,
      proxy : proxyOption
    },
    function (error, response, body) {
      try {
        clearTimeout(t)
        if (error) {
          reject(error)
          return
        }
        if (!response.statusCode) {
          reject(body)
          return
        }

        if (!error) {
          if(isJson){
            resolve(JSON.parse(body))
          }else{
            resolve(body)
          }
          
        } else {
          reject(body)
        }
      } catch (err) {
        console.log(err)
        reject(body)
      }
    }
    )
  })
}

webHandler.Get =async  (url, query, cookie, isJson = true , proxy) => {
  let proxyHost = proxy
  if(proxy){
    proxyHost = await db.get('proxy').value()
    if(!proxyHost || (proxyHost && moment(proxyHost.time).diff(moment(Date.now()),'minute')<= -4)){
      let ipGet = requestSync('GET',`http://www.xiongmaodaili.com/xiongmao-web/api/glip?secret=${config.get('proxy.secret')}&orderNo=${config.get('proxy.orderId')}&count=1&isTxt=0&proxyType=1`)
      let ip = JSON.parse(ipGet.getBody().toString()) 
      proxyHost = `http://${ip.obj[0].ip}:${ip.obj[0].port}`
      await db.set('proxy',{
        url : proxyHost,
        time : Date.now()
      }).write()
    }else{
      proxyHost = proxyHost.url
    }
  }
  let result = {}
  
  result = await getFunc(url, query, cookie, isJson = true , proxy?proxyHost:proxy)
  return result
}

webHandler.RefreshProxy = async ()=>{
  let ipGet = requestSync('GET',`http://www.xiongmaodaili.com/xiongmao-web/api/glip?secret=${config.get('proxy.secret')}&orderNo=${config.get('proxy.orderId')}&count=1&isTxt=0&proxyType=1`)
  let ip = JSON.parse(ipGet.getBody().toString()) 
  proxyHost = `http://${ip.obj[0].ip}:${ip.obj[0].port}`
  await db.set('proxy',{
    url : proxyHost,
    time : Date.now()
  }).write()
}

webHandler.Delete = (url, form, cookie) => {
  return new Promise((resolve, reject) => {
    request.delete({
      url
    },
    function (error, response, body) {
      try {
        if (error) console.log(error)
        if (!response.statusCode) reject(body)
        if (!error && /^2\d+/.test(response.statusCode.toString())) {
          resolve(body)
        } else {
          reject(body)
        }
      } catch (err) {
        console.log(err)
        reject(err)
      }
    }
    )
  })
}

webHandler.Patch = (url, form, cookie) => {
  return new Promise((resolve, reject) => {
    request.patch({
      url,
      form
    },
    function (error, response, body) {
      try {
        if (error) console.log(error)
        if (!response.statusCode) reject(body)

        if (!error && /^2\d+/.test(response.statusCode.toString())) {
          resolve(body)
        } else {
          reject(body)
        }
      } catch (err) {
        console.log(err)
        reject(err)
      }
    }
    )
  })
}

webHandler.Put = (url, form, cookie) => {
  return new Promise((resolve, reject) => {
    request.put({
      url,
      form
    },
    function (error, response, body) {
      try {
        if (error) console.log(error)
        if (!response.statusCode) reject(body)

        if (!error && /^2\d+/.test(response.statusCode.toString())) {
          resolve(body)
        } else {
          reject(body)
        }
      } catch (err) {
        console.log(err)
        reject(err)
      }
    }
    )
  })
}

module.exports = webHandler
