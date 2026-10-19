import {test,expect} from './teacher-fixture';
import {choose,language,pptx,response} from './helpers';
for(const locale of ['en','zh-Hans'] as const)test(locale+' shows the updated setup and reduced-motion loading state',async({page})=>{
 await page.goto('/');await language(page,locale);
 await expect(page.getByRole('heading',{level:1})).toHaveText(locale==='en'?'Better wording for better lessons.':'优化措辞，让教学更有效。');
 await expect(page.locator('.intro')).toHaveText(locale==='en'?'Suggestions for spelling, grammar and clear teaching content.':'提供拼写、语法和教学内容清晰度建议。');
 await expect(page.locator('.review-notice')).toHaveCount(0);await choose(page,pptx());
 const start=await page.getByTestId('start-review').boundingBox(),reset=await page.getByTestId('reset').boundingBox();expect(Math.abs(start!.y-reset!.y)).toBeLessThan(2);
 await page.emulateMedia({reducedMotion:'reduce'});
 let release!:()=>void;const blocked=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/review',async route=>{await blocked;await route.fulfill({json:response(route)});});
 await page.getByTestId('start-review').click();
 try{await expect(page.locator('.loading-dots')).toBeVisible();await expect(page.locator('.loading-dots span').first()).toHaveCSS('animation-name','none');}finally{release();}
 await expect(page.getByTestId('review-summary')).toBeVisible();await expect(page.locator('.loading-dots')).toHaveCount(0);
});

