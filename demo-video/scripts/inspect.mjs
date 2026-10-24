import {chromium} from 'playwright';
const browser = await chromium.launch({headless:true,executablePath:'C:/Users/Andrii/AppData/Local/ms-playwright/chromium-1243/chrome-win64/chrome.exe'});
const page = await browser.newPage({viewport:{width:1600,height:900}});
await page.goto('http://127.0.0.1:5173');
await page.waitForTimeout(10000);
console.log((await page.locator('body').innerText()).slice(0,14000));
await page.screenshot({path:'out/inspect.png'});
await browser.close();
