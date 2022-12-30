const express = require('express');
const puppeteer = require('puppeteer');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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
    await page.goto('https://google.com/', { waitUntil: 'domcontentloaded' });
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
    await page.goto('https://google.com/');
    const page_title = await page.title();
    res.send(page_title);
    console.log(page_title);
    browser.close();
});




app.get('/properties/v2/detail', async (req, res, next) => {
  const zpid = req.query.property_id;
  let properties_detail = [];
  const zpid_url = `https://www.zillow.com/homedetails/${zpid}_zpid/`;


  (async() =>{
  // Puppeteer
      const browser = await puppeteer.connect({
        browserWSEndpoint: 'wss://chrome.browserless.io?token=da549f5d-deea-4389-9fca-f088af72b3a1' 
      });

      const page = await browser.newPage();
      await page.goto(zpid_url);

      let quotes = await page.evaluate(() => {
          let quotes = document.body.querySelector('script[id="hdpApolloPreloadedData"]').textContent;
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