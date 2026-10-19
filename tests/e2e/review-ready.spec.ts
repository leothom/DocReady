import {test,expect} from './teacher-fixture';
import {choose,language} from './helpers';
for(const locale of ['en','zh-Hans'] as const)test(locale+' review action pulses only when ready',async({page})=>{
 await page.goto('/');await language(page,locale);const button=page.getByTestId('start-review');await expect(button).toBeDisabled();await expect(button).not.toHaveClass(/review-ready/);await choose(page);await expect(button).toBeEnabled();await expect(button).toHaveCSS('animation-name','review-heartbeat');await expect(page.getByTestId('reset')).toHaveText(locale==='en'?'Clear slides':'清除幻灯片');await page.emulateMedia({reducedMotion:'reduce'});await expect(button).toHaveCSS('animation-name','none');await page.getByTestId('reset').click();await expect(button).toBeDisabled();await expect(button).not.toHaveClass(/review-ready/);
});

