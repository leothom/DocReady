import {test,expect} from './teacher-fixture';
import {choose,language,pptx,response,run} from './helpers';
for(const locale of ['en','zh-Hans'] as const)test(locale+' focuses on one actionable slide and manual copy',async({page})=>{
 await page.goto('/');await language(page,locale);let calls=0;
 await page.route('**/api/review',async route=>{calls++;const data=response(route);const slides=route.request().postDataJSON().slides;data.findings=[1,5].map(n=>{const s=slides.find((s:{slideNumber:number})=>s.slideNumber===n);return {...data.findings[0],slideNumber:n,shapeId:s.elements[0].shapeId,elementId:s.elements[0].elementId};});await route.fulfill({json:data});});
 await choose(page,pptx(5));await run(page);
 await expect(page.getByTestId('file-drop')).toHaveCount(0);await expect(page.getByTestId('finding')).toHaveCount(1);
 await expect(page.getByTestId('current-slide')).toContainText(locale==='en'?'Slide 1':'幻灯片 1');
 await expect(page.getByTestId('accept')).toHaveCount(0);await expect(page.getByTestId('ignore')).toHaveCount(0);
 await expect(page.locator('main')).not.toContainText(locale==='en'?'Review details':'审查详情');
 await expect(page.locator('main')).not.toContainText(locale==='en'?'Content not reviewed':'未审查的内容');
 await expect(page.locator('main')).not.toContainText(locale==='en'?'Review is complete':'审查已完成');
 await expect(page.getByTestId('slide-pill')).toHaveCount(2);
 await expect(page.getByTestId('slide-pill').filter({hasText:'1'})).toHaveAttribute('aria-current','step');
 await page.getByTestId('slide-pill').filter({hasText:'5'}).click();await expect(page.getByTestId('current-slide')).toContainText(locale==='en'?'Slide 5':'幻灯片 5');
 await expect(page.getByTestId('slide-pill').filter({hasText:'5'})).toHaveAttribute('aria-current','step');
 await page.getByTestId('previous-slide').click();
 const nav=await page.locator('.slide-navigation').boundingBox(),next=await page.getByTestId('next-slide').boundingBox();expect(Math.abs(nav!.x+nav!.width-next!.x-next!.width)).toBeLessThan(2);
 await expect(page.getByTestId('language')).toHaveAccessibleName(locale==='en'?'Language':'语言');await expect(page.locator('.language-globe')).toBeVisible();
 await page.getByTestId('next-slide').click();await expect(page.getByTestId('current-slide')).toContainText(locale==='en'?'Slide 5':'幻灯片 5');
 await language(page,locale==='en'?'zh-Hans':'en');await expect(page.getByTestId('current-slide')).toContainText(locale==='en'?'幻灯片 5':'Slide 5');expect(calls).toBe(1);
 await page.getByTestId('previous-slide').click();await expect(page.getByTestId('current-slide')).toContainText(locale==='en'?'幻灯片 1':'Slide 1');
 await expect(page.getByTestId('reset')).toHaveCSS('background-color','rgb(230, 236, 227)');
 await page.getByTestId('reset').click();
 const modal=page.getByRole('dialog'),box=await modal.boundingBox(),size=page.viewportSize()!;
 expect(Math.abs(box!.x+box!.width/2-size.width/2)).toBeLessThan(2);expect(Math.abs(box!.y+box!.height/2-size.height/2)).toBeLessThan(2);
 await expect(page.getByTestId('replace-review')).toHaveText(locale==='en'?'新 PPTX':'New PPTX');
 const replace=await page.getByTestId('replace-review').boundingBox(),keep=await page.getByTestId('keep-review').boundingBox();expect(replace!.x).toBeLessThan(keep!.x);
 await page.screenshot({path:'evidence/polish-dialog-'+locale+'.png'});
 await page.getByTestId('replace-review').click();await expect(page.getByTestId('file-drop')).toBeVisible();
});

test('current pill stays visible on a narrow screen with many slides',async({page})=>{
 await page.setViewportSize({width:320,height:760});await page.goto('/');
 await page.route('**/api/review',async route=>{const data=response(route);data.findings=route.request().postDataJSON().slides.map((s:{slideNumber:number;elements:{shapeId:string;elementId:string;text:string}[]})=>({...data.findings[0],slideNumber:s.slideNumber,shapeId:s.elements[0].shapeId,elementId:s.elements[0].elementId,originalText:s.elements[0].text}));await route.fulfill({json:data});});
 await choose(page,pptx(15));await run(page);for(let i=1;i<15;i++)await page.getByTestId('next-slide').click();
 const row=await page.locator('.slide-pills').boundingBox(),pill=await page.locator('[data-testid="slide-pill"][aria-current="step"]').boundingBox();
 expect(pill!.x).toBeGreaterThanOrEqual(row!.x);expect(pill!.x+pill!.width).toBeLessThanOrEqual(row!.x+row!.width);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

