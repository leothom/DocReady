import {test,expect} from './teacher-fixture';
import {choose,language,mock,run,pptx,response} from './helpers';
for(const locale of ['en','zh-Hans'] as const){
 test(locale+' simple start, optional settings and privacy page',async({page})=>{
  await page.goto('/');await language(page,locale);await mock(page);
  await expect(page.getByTestId('review-settings')).not.toHaveAttribute('open','');
  await choose(page);const sent=page.waitForRequest(r=>new URL(r.url()).pathname==="/api/review");await run(page);expect((await sent).postDataJSON().settings).toEqual({subject:"Other",toeflLevel:3});
  await expect(page.getByTestId('review-summary')).not.toContainText(locale==='en'?'Settings changed':'设置已更改');
  const opened=page.waitForEvent('popup');await page.getByRole('link',{name:locale==='en'?'Privacy':'隐私政策',exact:true}).click();
  const privacy=await opened;await expect(privacy).toHaveURL(/\/privacy$/);await expect(privacy.getByRole('heading',{level:1})).toHaveText(locale==='en'?'Privacy':'隐私政策');
  await expect(privacy.locator('main')).toContainText('DeepSeek');await privacy.close();await expect(page.getByTestId('finding')).toHaveCount(1);
 });
 test(locale+' drag drop reads locally and invalid multiple files preserve current deck',async({page})=>{
  await page.goto('/');await language(page,locale);let calls=0;await page.route('**/api/review',route=>{calls++;return route.abort();});
  const file=pptx();const transfer=await page.evaluateHandle(({name,bytes})=>{const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(bytes)],name));return dt;},{name:file.name,bytes:[...file.buffer]});
  await page.getByTestId('file-drop').dispatchEvent('drop',{dataTransfer:transfer});await transfer.dispose();
  await expect(page.getByTestId('start-review')).toBeEnabled();expect(calls).toBe(0);
  const two=await page.evaluateHandle(()=>{const dt=new DataTransfer();dt.items.add(new File(['x'],'a.pptx'));dt.items.add(new File(['x'],'b.pptx'));return dt;});
  await page.getByTestId('file-drop').dispatchEvent('drop',{dataTransfer:two});await two.dispose();
  await expect(page.locator('main [role="alert"]')).toContainText(locale==='en'?'one':'一个');
  await expect(page.getByTestId('file-name')).toHaveText(file.name);expect(calls).toBe(0);
 });
}

for(const locale of ['en','zh-Hans'] as const)test(locale+' setup stays hidden during review and reset keeps or clears results',async({page})=>{
 await page.goto('/');await language(page,locale);await choose(page);let release!:()=>void;const held=new Promise<void>(r=>release=r);let calls=0;
 await page.route('**/api/review',async route=>{calls++;await held;await route.fulfill({json:response(route)});});
 await page.getByTestId('start-review').click();await expect(page.getByTestId('progress')).toBeVisible();await expect(page.getByTestId('file-drop')).toHaveCount(0);
 release();await expect(page.getByTestId('finding')).toHaveCount(1);await page.getByTestId('reset').click();await page.getByTestId('keep-review').click();await expect(page.getByTestId('finding')).toHaveCount(1);
 await page.getByTestId('reset').click();await page.getByTestId('replace-review').click();await expect(page.getByTestId('file-drop')).toBeVisible();await expect(page.getByTestId('finding')).toHaveCount(0);expect(calls).toBe(1);
});

