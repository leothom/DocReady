import {test,expect} from './teacher-fixture';
import {language} from './helpers';
for(const locale of ['en','zh-Hans'] as const)test(locale+' has public contact, privacy and terms',async({page})=>{
 await page.goto('/');await language(page,locale);await expect(page.getByTestId('review-settings')).toContainText(locale==='en'?'Subject and TOEFL level (optional)':'学科和 TOEFL 水平（可选）');
 for(const path of ['contact','terms','privacy']){await page.goto('/'+path);await expect(page.locator('main')).toContainText('Leo Thom');await expect(page.getByRole('link',{name:'work@leothom.com'})).toHaveAttribute('href','mailto:work@leothom.com');await expect(page.getByRole('heading',{level:1})).toBeVisible();}
});

