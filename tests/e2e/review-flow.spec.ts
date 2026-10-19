import {test,expect} from "./teacher-fixture";
import {choose,language,mock,open,run,pptx,response} from "./helpers";
test("subject is optional and TOEFL controls share valid half-point values",async({page})=>{
 await open(page);await mock(page);await choose(page);
 await page.getByTestId("subject").selectOption("Business");
 const number=page.getByTestId("toefl-number"),range=page.getByTestId("toefl-range");
 await expect(number).toHaveValue("3");await number.fill("4.5");await expect(range).toHaveValue("4.5");
 await range.focus();await page.keyboard.press("ArrowLeft");await expect(number).toHaveValue("4");
 await number.fill("3.2");await page.getByTestId("start-review").click();await expect(page.locator('main [role="alert"]')).toContainText("0.5");
 await number.fill("3");await run(page);await expect(page.getByTestId("finding")).toHaveCount(1);
});
for(const locale of ["en","zh-Hans"] as const){
 test(locale+" manual copy failure and safe reset",async({page})=>{
  await open(page);await language(page,locale);await mock(page);await page.getByTestId("subject").selectOption("Business");await choose(page);await run(page);
  const finding=page.getByTestId("finding");
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{throw Error("blocked");}},configurable:true}));
  await finding.getByTestId("copy").click();await expect(page.getByTestId("action-message")).toContainText(locale==="en"?"Could not copy":"无法复制");
  await expect(page.getByTestId("download-feedback")).toHaveCount(0);
  await page.getByTestId("reset").click();await expect(page.getByRole("dialog")).toBeVisible();await page.getByTestId("keep-review").click();await expect(finding).toBeVisible();
  await page.getByTestId("reset").click();await page.getByTestId("replace-review").click();await expect(finding).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveValue("");
 });
 test(locale+" complete with no findings, unreadable input and image-only coverage",async({page})=>{
  await open(page);await language(page,locale);const calls=await mock(page,false);await page.getByTestId("subject").selectOption("Business");
  await choose(page);await run(page);await expect(page.getByTestId("no-findings")).toContainText(locale==="en"?"No suggestions":"没有建议");
  await choose(page,{name:"broken.pptx",mimeType:"application/octet-stream",buffer:Buffer.from("bad")});await expect(page.locator('main [role="alert"]')).toContainText(locale==="en"?"file":"文件");
  await choose(page,pptx(1,true));await expect(page.getByTestId("start-review")).toBeDisabled();await expect(page.getByTestId("no-text")).toBeVisible();
  expect(calls()).toBe(1);await expect(page.getByTestId("review-summary")).toHaveCount(0);
 });
 test(locale+" failed coverage does not look like a clean review",async({page})=>{
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");
  let failed=0;await page.route("**/api/review",async route=>{
   if(route.request().postDataJSON().slides[0].slideNumber===6){failed++;await route.fulfill({status:503,json:{error:"MODEL_TIMEOUT",retryable:true}});}
   else await route.fulfill({json:response(route,false)});
  });
  await choose(page,pptx(6));await run(page);await expect(page.getByTestId("review-summary")).toContainText(locale==="en"?"Review is incomplete":"审查未完成");
  await expect(page.getByTestId("no-findings")).toHaveCount(0);await expect(page.getByTestId("slide-coverage")).toContainText(locale==="en"?"Failed":"失败");expect(failed).toBe(2);
  await page.unroute("**/api/review");let retryCalls=0;await page.route("**/api/review",async route=>{retryCalls++;expect(route.request().postDataJSON().slides[0].slideNumber).toBe(6);await route.fulfill({json:response(route,false)});});
  await page.getByTestId("retry-failed").click();await expect(page.getByTestId("review-summary")).toHaveAttribute("aria-label",locale==="en"?"Review is complete.":"审查已完成。");expect(retryCalls).toBe(1);
 });
 test(locale+" missing configuration has a safe localized error",async({page})=>{
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");await page.route("**/api/review",route=>route.fulfill({status:503,json:{error:"NOT_CONFIGURED",retryable:false}}));
  await choose(page);await run(page);await expect(page.getByTestId("slide-coverage")).toContainText(locale==="en"?"server setup":"服务器配置");
 });
 test(locale+" reset during review discards late work",async({page})=>{
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");
  let release!:()=>void;const held=new Promise<void>(r=>release=r);let seen!:()=>void;const started=new Promise<void>(r=>seen=r);
  await page.route("**/api/review",async route=>{seen();await held;try{await route.fulfill({json:response(route)});}catch{}});
  await choose(page);await page.getByTestId("start-review").click();await started;
  await page.getByTestId("reset").click();release();await expect(page.getByTestId("review-summary")).toHaveCount(0);
  await expect(page.getByTestId("finding")).toHaveCount(0);await expect(page.getByTestId("start-review")).toBeDisabled();
 });
}
test("copy success, new-file confirmation and cancellation preserve completed work",async({page})=>{
 await open(page);await mock(page);await page.getByTestId("subject").selectOption("Business");await choose(page);await run(page);
 await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{}},configurable:true}));
 await page.getByTestId("copy").click();await expect(page.getByTestId("action-message")).toHaveText("Text copied.");
 await page.getByTestId("reset").click();
 await expect(page.getByRole("dialog")).toBeVisible();await page.getByTestId("keep-review").click();await expect(page.getByTestId("finding")).toHaveCount(1);
 await choose(page,{...pptx(6),name:"second.pptx"});
 await page.unroute("**/api/review");let started=0;let release!:()=>void;const held=new Promise<void>(r=>release=r);
 await page.route("**/api/review",async route=>{started++;if(route.request().postDataJSON().slides[0].slideNumber===1)await route.fulfill({json:response(route)});else {await held;try{await route.fulfill({json:response(route)});}catch{}}});
 await page.getByTestId("start-review").click();await expect(page.getByTestId("progress")).toContainText("1 of 2");
 expect(started).toBe(2);await page.getByTestId("cancel").click();release();await expect(page.getByTestId("review-summary")).toContainText("Review stopped");
 await expect(page.getByTestId("finding")).toHaveCount(1);
});

