const puppeteer = require("puppeteer");
let envFile;

try {
  envFile = require("./.env.json");
} catch (err) {
  envFile = {};
}

// Get username and password for FB
let username;
let password;
username = process.env.USERNAME || envFile.username;
password = process.env.PASSWORD || envFile.password;
if (!username || !password) {
  throw new Error("User details must be set via env var or .env.json file");
}

puppeteer
  .launch({
    headless: false,
    appMode: true,
    args: [
      "--user-data-dir=./.chrome/profile",
      "--disk-cache-size=0" /*, "--auto-open-devtools-for-tabs" */
    ]
  })
  .then(async browser => {
    const page = await browser.newPage();
    await page.setViewport({ width: 640, height: 480 });
    await page._client.send("Network.clearBrowserCookies");
    let a = [];
    page.on("response", async interceptedResponse => {
      if (
        interceptedResponse
          .request()
          .url()
          .includes("events/discover/query")
      ) {
        console.log(interceptedResponse.request().url());
        const data = JSON.parse(
          (await interceptedResponse.text()).substring(9)
        );
        // console.log(data.payload.results[0].events);
        // console.log(a)
        a = a.concat(data.payload.results[0].events);
      }
      // interceptedResponse.continue();
    });
    await page.goto("https://facebook.com/events/discovery/");
    await page.type("#email", username);
    await page.type("#pass", password);
    await page.click("#loginbutton");
    await page.waitForNavigation(["networkidle0", "load", "domcontentloaded"]);
    let previousHeight;
    for (let i = 0; i <= 100; i++) {
      previousHeight = await page.evaluate("document.body.scrollHeight");
      await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
      await page.waitForFunction(
        `document.body.scrollHeight > ${previousHeight}`
      );
      await page.waitFor(1000);
    }
    console.log(a);
  });
