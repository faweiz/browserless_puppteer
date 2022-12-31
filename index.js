const express = require('express');
const puppeteer = require('puppeteer');
// const puppeteer = require('puppeteer-extra')
// const StealthPlugin = require('puppeteer-extra-plugin-stealth')
// puppeteer.use(StealthPlugin())

const randomUseragent = require('random-useragent');
const random_useragent = randomUseragent.getRandom();
const useragent_standard = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.75 Safari/537.36';
const userAgent = random_useragent || useragent_standard;
console.log('userAgent: ', userAgent);


const app = express();
app.use(express.json());

// Welcome route
app.get('/', async (req, res) => {
    res.send('Welcome to Zillow Scraper API!');
});

// const getBrowser = () =>
//   IS_PRODUCTION
//     ? // Connect to browserless so we don't run Chrome on the same hardware in production
//       puppeteer.connect({ browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' })
//     : // Run the browser locally while in development
//       puppeteer.launch();

app.get('/image', async (req, res) => {

  try {
    const browser = await puppeteer.connect({
        browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
    });
    
    // The rest of your script remains the same
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.goto('https://www.zillow.com/homedetails/36923545_zpid/', { waitUntil: 'domcontentloaded' });
    const screenshot = await page.screenshot();
    res.end(screenshot, 'binary');
    browser.close();
  } catch (error) {
    if (!res.headersSent) {
      res.status(400).send(error.message);
    }
  }
});

app.get('/title', async (req, res) => {
    // Replace puppeteer.launch with puppeteer.connect
    const browser = await puppeteer.connect({
        browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
    });
    
    // The rest of your script remains the same
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.goto('https://www.zillow.com/homedetails/36923545_zpid/');
    const page_title = await page.title();
    res.send(page_title);
    console.log(page_title);
    browser.close();
});

// Get zip code details
app.get('/properties/v2/list-for-sale/', async (req, res, next) => {
    let address_parm = [], properties = [];
    var sdata = "", west = "", east = "", south = "", north = "";
    if(req.query.city && req.query.state_code){
        const address_city = req.query.city;
        const address_state = req.query.state_code;
        address_parm = `${address_city}-${address_state}`;
    }else if(req.query.zipcode){
        const address_zipcode = req.query.zipcode;
        address_parm = address_zipcode;
    }

    try {
        console.log(`Getting Zillow data`);
        (async() =>{
            // Get GPS coordinates from Google Map API
            function httprequest(address_value) {
                return new Promise((resolve, reject) => {
                    const options = {
                        "hostname": "maps.googleapis.com",
                        "port": null,
                        "path": `/maps/api/geocode/json?address=${address_value}&key=${process.env.GOOGLE_API_KEY}`,
                        method: 'GET'
                    };
                    const req = https.request(options, (res) => {
                    if (res.statusCode < 200 || res.statusCode >= 300) {
                            return reject(new Error('statusCode=' + res.statusCode));
                        }
                        var body = [];
                        res.on('data', function(chunk) {
                            body.push(chunk);
                        });
                        res.on('end', function() {
                            try {
                                body = JSON.parse(Buffer.concat(body).toString());
                            } catch(e) {
                                reject(e);
                            }
                            resolve(body);
                        });
                    });
                    req.on('error', (e) => {
                    reject(e.message);
                    });
                    // send the request
                req.end();
                });
            }
            httprequest().then((data) => {
                const response = {
                    statusCode: 200,
                    body: JSON.stringify(data),
                };
                return response;
            });
            sdata = await httprequest(address_parm);
            west = sdata.results[0].geometry.viewport.southwest.lng;
            east = sdata.results[0].geometry.viewport.northeast.lng;
            south = sdata.results[0].geometry.viewport.southwest.lat;
            north = sdata.results[0].geometry.viewport.northeast.lat;
            console.log("address_parm, west, east, south, north", address_parm, west, east, south, north);
            const params = {
                "pagination":{},
                "usersSearchTerm":"21076",
                "mapBounds":{
                    "west": west,
                    "east": east,
                    "south": south,
                    "north": north
                },
                "regionSelection":[{"regionId":66764,"regionType":7}],
                "isMapVisible":true,
                "filterState":{
                    "sortSelection":{"value":req.query.sort},   // pricea: low -> high, priced: high -> low
                    "isAllHomes":{"value":true},
                    "price":{"min":req.query.price_min,"max":req.query.price_max},
                    "beds":{"min":req.query.beds_min, "max":req.query.beds_max},
                    "baths":{"min":req.query.baths_min, "max":req.query.baths_max},
                    "sqft":{"min":req.query.sqft_min,"max":req.query.sqft_max},
                    "lotSize":{"min":req.query.lotSize_min,"max":req.query.lotSize_max},
                    "built":{"min":req.query.yearbuilt_min, "max":req.query.yearbuilt_max}
                },
                "isListVisible":true,
                "mapZoom":15
            };
            console.log('params', params);
            const wants = {
                "cat1": ["listResults", "mapResults"], "cat2": ["total"]
            };

            // Puppeteer
            //puppeteerExtra.use(pluginStealth());
            const browser = await puppeteer.connect({
              browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
            });
            const page = await browser.newPage();
            var url = `${baseUrl}/${address_parm}`;
            console.log(url);
            await page.setUserAgent(userAgent);
            await page.goto(url, { waitUntil: 'domcontentloaded' });
            await page.setViewport({
                width: 1200,
                height: 800
            });
            //await page.waitForTimeout (1000);
            // const json: any = await page.evaluate(async (params, wants) => {
            const json  = await page.evaluate(async (params, wants) => {
                return await new Promise(async (resolve, reject) => {
                    const response = await fetch(`https://www.zillow.com/search/GetSearchPageState.htm?searchQueryState=${encodeURIComponent(JSON.stringify(params))}&wants=${encodeURIComponent(JSON.stringify(wants))}&requestId=6`, {
                            "headers": {
                            "accept": "*/*",
                            "accept-language": "en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7",
                            "cache-control": "no-cache",
                            "pragma": "no-cache",
                            "sec-ch-ua": "\" Not;A Brand\";v=\"99\", \"Google Chrome\";v=\"97\", \"Chromium\";v=\"97\"",
                            "sec-ch-ua-mobile": "?0",
                            "sec-ch-ua-platform": "\"Windows\"",
                            "sec-fetch-dest": "empty",
                            "sec-fetch-mode": "cors",
                            "sec-fetch-site": "same-origin"
                        },
                        "referrerPolicy": "unsafe-url",
                        "body": null,
                        "method": "GET",
                        "mode": "cors",
                        "credentials": "include"
                    });
                    const json = await response.json();
                    console.log('json', json);

                    return resolve(json);
                });
            }, params, wants);
            let mapResults = json?.cat1?.searchResults?.mapResults;
            //console.log('map results', mapResults[22], mapResults?.length);
            console.log(mapResults?.length, "property found");
            let limit = 0;
            if(mapResults?.length > req.query.limit )
                limit = mapResults?.length;
            else limit = req.query.limit;
            for(let index = 0; index < limit; index++)
            {
                properties.push(index, mapResults[index]);
                //console.log('map results', mapResults[index]);
            }
            res.json(properties);

            //await page.screenshot({path: "image.png"});
            await page.close();
            await browser.close();
        })();
    } catch (error) {
        res.json(error);
        console.log(`Error`);
    }
});

app.get('/properties/v2/detail', async (req, res, next) => {
  const zpid = req.query.property_id;
  let properties_detail = [];
  const zpid_url = `https://www.zillow.com/homedetails/${zpid}_zpid/`;

  console.log(req.query.property_id);

  (async() =>{
    console.log(2);
  // Puppeteer
      const browser = await puppeteer.connect({
        browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
      });

      const page = await browser.newPage();
      console.log(zpid_url);
      await page.setUserAgent(userAgent)
      await page.goto(zpid_url, { waitUntil: 'domcontentloaded' });

      let quotes = await page.evaluate(() => {
          let quotes = document.body.querySelector('script[id="hdpApolloPreloadedData"]').innerText;
          return quotes;
      });

      let quotes_all = JSON.parse(quotes);
      let apiCache = JSON.parse(quotes_all.apiCache);
      let property_data = apiCache[`ForSaleShopperPlatformFullRenderQuery{\"zpid\":${zpid},\"contactFormRenderParameter\":{\"zpid\":${zpid},\"platform\":\"desktop\",\"isDoubleScroll\":true}}`].property;
      console.log(property_data);

      properties_detail.push(property_data);
      res.json(properties_detail);

      await page.close();
      await browser.close();
  })();

});









app.listen(8080, () => console.log('Listening on PORT: 8080'));