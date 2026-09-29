import {defineConfig,devices} from '@playwright/test';
const port=Number(process.env.PORT??4330);
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,timeout:60000,expect:{timeout:10000},
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:{command:'npm run preview',url:baseURL,env:{PORT:String(port)},reuseExistingServer:!process.env.CI,timeout:30000},
});
