import {defineConfig} from "@playwright/test";
export default defineConfig({
 testDir:"tests/e2e",fullyParallel:false,workers:1,timeout:30000,
 use:{baseURL:"http://127.0.0.1:3100",headless:true,trace:"off"},
 reporter:"list",
 webServer:{command:"npm run build && npm run start",url:"http://127.0.0.1:3100",reuseExistingServer:false,timeout:120000},
});
