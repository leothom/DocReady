import {test,expect} from "./teacher-fixture";
import {choose,language,open,pptx,run,response} from "./helpers";
for(const locale of ["en","zh-Hans"] as const)test(locale+" has an app-owned translated file button",async({page})=>{
 await open(page);await language(page,locale);const picker=page.locator("button").filter({hasText:locale==="en"?"Choose file":"选择文件"});
 await expect(picker).toBeVisible();const event=page.waitForEvent("filechooser");await picker.click();await (await event).setFiles(pptx());await expect(page.getByTestId("file-name")).toHaveText("test-lesson.pptx");
});
test("retry retains original settings while setup is hidden",async({page})=>{
 await open(page);await page.getByTestId("subject").selectOption("Business");let calls=0;
 await page.route("**/api/review",async route=>{calls++;expect(route.request().postDataJSON().settings.subject).toBe("Business");if(route.request().postDataJSON().slides[0].slideNumber===6)await route.fulfill({status:503,json:{error:"MODEL_UNAVAILABLE",retryable:false}});else await route.fulfill({json:response(route)});});
 await choose(page,pptx(6));await run(page);await expect(page.getByTestId("subject")).toHaveCount(0);await expect(page.getByTestId("retry-failed")).toBeEnabled();expect(calls).toBe(2);
 await language(page,"zh-Hans");await page.getByTestId("retry-failed").click();await expect.poll(()=>calls).toBe(3);
});

