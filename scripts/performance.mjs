import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';

const outputDirectory='.reports/performance';
const chrome=await launch({chromePath:process.env.CHROME_PATH,chromeFlags:['--headless','--disable-gpu']});
try {
  await mkdir(outputDirectory,{recursive:true});
  const result=await lighthouse(`http://127.0.0.1:${process.env.PORT??4321}/`,{port:chrome.port,output:['html','json'],onlyCategories:['performance','accessibility','best-practices','seo']});
  if(!result)throw new Error('Lighthouse tidak menghasilkan laporan');
  await writeFile(`${outputDirectory}/lighthouse.html`,result.report[0]);
  await writeFile(`${outputDirectory}/lighthouse.json`,result.report[1]);
  const scores=Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value])=>[key,Math.round((value.score??0)*100)]));
  console.log(JSON.stringify({kind:'laboratorium',scores,LCP:result.lhr.audits['largest-contentful-paint'].numericValue,CLS:result.lhr.audits['cumulative-layout-shift'].numericValue,INP:'Memerlukan data penggunaan nyata'},null,2));
  if(Object.values(scores).some((score)=>score<95))process.exitCode=1;
} finally { await chrome.kill(); }
