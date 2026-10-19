import {test,expect} from './teacher-fixture';
import {choose,pptx} from './helpers';
const key='sample_personal_key_not_real_123';
const storage='slideready.deepseek-key.v1';
test('tests a key, saves on device, restores after reload, and removes it',async({page})=>{
 let probes=0;
 await page.route('**/api/probe',route=>{probes++;expect(route.request().headers()['x-slideready-deepseek-key']).toBe(key);expect(route.request().postDataJSON()).toEqual({});return route.fulfill({json:{ok:true}});});
 await page.goto('/');await page.getByText('Use my own DeepSeek account',{exact:true}).click();
 const input=page.getByLabel('API key',{exact:true});await input.fill(key);await expect(input).toHaveAttribute('type','password');
 await page.getByRole('button',{name:'Save on this device',exact:true}).click();
 await expect(page.getByText('Using your DeepSeek account.',{exact:true})).toBeVisible();
 expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBe(key);
 await page.reload();await expect(page.getByText('Using your DeepSeek account.',{exact:true})).toBeVisible();expect(probes).toBe(1);
 await page.getByText('Use my own DeepSeek account',{exact:true}).click();await page.getByRole('button',{name:'Remove key',exact:true}).click();
 expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBeNull();await expect(page.getByText('Using the school account.',{exact:true})).toBeVisible();
});
test('personal key failures never switch review requests to the school account',async({page})=>{
 await page.addInitScript(({key,storage})=>localStorage.setItem(storage,key),{key,storage});
 let calls=0;
 await page.route('**/api/review',route=>{calls++;expect(route.request().headers()['x-slideready-deepseek-key']).toBe(key);expect(JSON.stringify(route.request().postDataJSON())).not.toContain(key);return route.fulfill({status:502,json:{error:'PERSONAL_KEY_FAILED',retryable:false}});});
 await page.goto('/');await choose(page);await page.getByTestId('start-review').click();
 await expect(page.getByTestId('slide-coverage')).toContainText('Check your DeepSeek key and account balance. The school account was not used.');expect(calls).toBe(1);
});
test('failed replacement keeps the saved key and does not claim success',async({page})=>{
 await page.addInitScript(({key,storage})=>localStorage.setItem(storage,key),{key,storage});
 await page.route('**/api/probe',route=>route.fulfill({status:502,json:{error:'PERSONAL_KEY_FAILED'}}));
 await page.goto('/');await page.getByText('Use my own DeepSeek account',{exact:true}).click();await page.getByRole('button',{name:'Change key',exact:true}).click();
 await page.getByLabel('API key',{exact:true}).fill('sample_replacement_not_real_999');await page.getByRole('button',{name:'Save on this device',exact:true}).click();
 await expect(page.locator('main').getByRole('alert')).toContainText('Check your DeepSeek key');expect(await page.evaluate(k=>localStorage.getItem(k),storage)).toBe(key);
});
test('storage failure shows an error and does not activate the new key',async({page})=>{
 await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new Error('blocked');};});
 await page.route('**/api/probe',route=>route.fulfill({json:{ok:true}}));
 await page.goto('/');await page.getByText('Use my own DeepSeek account',{exact:true}).click();await page.getByLabel('API key',{exact:true}).fill(key);await page.getByRole('button',{name:'Save on this device',exact:true}).click();
 await expect(page.locator('main').getByRole('alert')).toContainText('Could not save the key');await expect(page.getByText('Using your DeepSeek account.',{exact:true})).toHaveCount(0);
});
test('Chinese key controls fit a phone and show and hide only the entered key',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByTestId('language').selectOption('zh-Hans');
 await page.getByText('使用我自己的 DeepSeek 账户',{exact:true}).click();const input=page.getByLabel('API 密钥',{exact:true});await input.fill(key);
 await page.getByRole('button',{name:'显示',exact:true}).click();await expect(input).toHaveAttribute('type','text');await page.getByRole('button',{name:'隐藏',exact:true}).click();await expect(input).toHaveAttribute('type','password');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('removal in another tab updates the account before the next review',async({page,context})=>{
 await page.goto('/');await page.evaluate(({key,storage})=>localStorage.setItem(storage,key),{key,storage});await page.reload();
 await expect(page.getByText('Using your DeepSeek account.',{exact:true})).toBeVisible();
 const other=await context.newPage();await other.goto('/');await other.evaluate(k=>localStorage.removeItem(k),storage);await other.close();
 await expect(page.getByText('Using the school account.',{exact:true})).toBeVisible();
});
test('a changed account cannot silently pay for a retry',async({page,context})=>{
 await page.goto('/');await page.evaluate(({key,storage})=>localStorage.setItem(storage,key),{key,storage});await page.reload();
 let calls=0;await page.route('**/api/review',route=>{calls++;return route.fulfill({status:502,json:{error:'PERSONAL_KEY_FAILED',retryable:false}});});
 await choose(page);await page.getByTestId('start-review').click();await expect(page.getByTestId('retry-failed')).toBeVisible();
 const other=await context.newPage();await other.goto('/');await other.evaluate(k=>localStorage.removeItem(k),storage);await other.close();
 await expect(page.getByText('Using the school account.',{exact:true})).toBeVisible();await page.getByTestId('retry-failed').click();
 await expect(page.locator('main').getByRole('alert').first()).toContainText('The DeepSeek account changed');expect(calls).toBe(1);
});
test('failed personal key can be changed and the same slides reviewed again',async({page})=>{
 await page.addInitScript(({key,storage})=>localStorage.setItem(storage,key),{key,storage});
 const replacement='sample_replacement_key_not_real_456';let calls=0;
 await page.route('**/api/review',route=>{calls++;const selected=route.request().headers()['x-slideready-deepseek-key'];if(calls===1){expect(selected).toBe(key);return route.fulfill({status:502,json:{error:'PERSONAL_KEY_FAILED',retryable:false}});}expect(selected).toBe(replacement);return route.fulfill({json:{findings:[],usage:{inputTokens:100,outputTokens:20,cachedInputTokens:0},elapsedMs:10,costUsd:null,model:'deepseek-flash'}});});
 await page.route('**/api/probe',route=>route.fulfill({json:{ok:true}}));
 await page.goto('/');await choose(page);await page.getByTestId('start-review').click();await expect(page.getByTestId('retry-failed')).toBeVisible();
 await page.getByText('Use my own DeepSeek account',{exact:true}).click();await page.getByRole('button',{name:'Change key',exact:true}).click();await page.getByLabel('API key',{exact:true}).fill(replacement);await page.getByRole('button',{name:'Save on this device',exact:true}).click();
 await expect(page.getByRole('button',{name:'Change key',exact:true})).toBeVisible();await page.getByTestId('restart-review').click();await page.getByTestId('replace-review').click();
 await expect(page.getByTestId('no-findings')).toBeVisible();expect(calls).toBe(2);
});
test('invalid saved keys block reviews until explicitly removed',async({page})=>{
 await page.addInitScript(storage=>localStorage.setItem(storage,'bad'),storage);let calls=0;
 await page.route('**/api/review',route=>{calls++;return route.abort();});
 await page.goto('/');await choose(page);await page.getByTestId('start-review').click();await expect(page.locator('main').getByRole('alert').last()).toContainText('Enter a valid DeepSeek API key');expect(calls).toBe(0);
});
test('personal key is absent from links and is sent only to probe or review routes',async({page})=>{
 const sent:string[]=[];page.on('request',request=>{expect(request.url()).not.toContain(key);expect(request.postData()??'').not.toContain(key);if(request.headers()['x-slideready-deepseek-key'])sent.push(new URL(request.url()).pathname);});
 await page.route('**/api/probe',route=>route.fulfill({json:{ok:true}}));await page.goto('/');await page.getByText('Use my own DeepSeek account',{exact:true}).click();await page.getByLabel('API key',{exact:true}).fill(key);await page.getByLabel('API key',{exact:true}).press('Enter');
 await expect(page.getByText('Using your DeepSeek account.',{exact:true})).toBeVisible();expect(sent).toEqual(['/api/probe']);expect(await page.locator('body').textContent()).not.toContain(key);
 await page.screenshot({path:'test-results/personal-key-desktop.png',fullPage:true});
});


test('changing the key in another tab stops an active review without switching payer',async({page,context})=>{
 await page.goto('/');await page.evaluate(({key,storage})=>localStorage.setItem(storage,key),{key,storage});await page.reload();
 const headers:string[]=[];
 await page.route('**/api/review',route=>{headers.push(route.request().headers()['x-slideready-deepseek-key']);});
 await choose(page,pptx(30));await page.getByTestId('start-review').click();
 await expect.poll(()=>headers.length).toBe(2);
 const other=await context.newPage();await other.goto('/');await other.evaluate(k=>localStorage.removeItem(k),storage);await other.close();
 await expect(page.getByTestId('restart-review')).toBeVisible();
 expect(headers).toEqual([key,key]);
 await page.unrouteAll({behavior:'ignoreErrors'});
});


test('personal account is selected when the review is opened',async({page})=>{
 await page.addInitScript(({key,storage})=>localStorage.setItem(storage,key),{key,storage});
 let admitted=false;
 await page.route('**/api/reviews',route=>{expect(route.request().headers()['x-slideready-deepseek-key']).toBe(key);admitted=true;return route.fulfill({json:{reviewId:'personal-test'}});});
 await page.route('**/api/review',route=>route.fulfill({status:502,json:{error:'PERSONAL_KEY_FAILED',retryable:false}}));
 await page.goto('/');await choose(page);await page.getByTestId('start-review').click();await expect(page.getByTestId('retry-failed')).toBeVisible();expect(admitted).toBe(true);
});

test('personal account short-term limits do not show a school daily-limit error',async({page})=>{
 await page.addInitScript(({key,storage})=>localStorage.setItem(storage,key),{key,storage});
 await page.route('**/api/reviews',route=>route.fulfill({status:429,json:{error:'TOO_MANY_REQUESTS'}}));
 await page.goto('/');await choose(page);await page.getByTestId('start-review').click();
 await expect(page.locator('main').getByRole('alert')).not.toContainText('daily');
 await expect(page.locator('main').getByRole('alert')).toContainText('Wait one minute');
});
