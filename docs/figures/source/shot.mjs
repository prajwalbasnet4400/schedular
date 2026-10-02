import puppeteer from 'puppeteer';
const files=process.argv.slice(2);
const b=await puppeteer.launch({args:['--no-sandbox']});
const p=await b.newPage();
await p.setViewport({width:1400,height:1000,deviceScaleFactor:3});
for(const f of files){await p.goto('file://'+process.cwd()+'/'+f,{waitUntil:'load'});await new Promise(r=>setTimeout(r,200));
 const el=await p.$('#fig');await el.screenshot({path:f.replace('.html','.png')});console.log('ok',f);}
await b.close();
