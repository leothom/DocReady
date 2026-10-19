import {test,expect} from "./teacher-fixture";
import {choose,language,open,run,pptx,response} from "./helpers";
for(const locale of ["en","zh-Hans"] as const){
 test(locale+" language change during local reading preserves file and makes no AI call",async({page})=>{
  await page.addInitScript(()=>{
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{
    constructor(url:string|URL,options?:WorkerOptions){
     super(url,options);const deferred=new WeakSet<Event>();
     this.addEventListener("message",event=>{if(deferred.has(event))return;event.stopImmediatePropagation();const copy=new MessageEvent("message",{data:event.data});deferred.add(copy);setTimeout(()=>this.dispatchEvent(copy),800);});
    }
   } as typeof Worker;
  });
  let calls=0;await page.route("**/api/review",route=>{calls++;return route.abort();});
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Science");await page.getByTestId("toefl-number").fill("2.5");await choose(page);
  await expect(page.getByTestId("start-review")).toBeDisabled();
  await language(page,locale==="en"?"zh-Hans":"en");
  await expect(page.getByTestId("file-name")).toHaveText("test-lesson.pptx");
  await expect(page.getByTestId("start-review")).toBeEnabled();await expect(page.getByTestId("subject")).toHaveValue("Science");await expect(page.getByTestId("toefl-number")).toHaveValue("2.5");expect(calls).toBe(0);
 });
 test(locale+" optional suggestion and keyboard copy",async({page})=>{
  await open(page);await language(page,locale);await page.getByTestId("subject").selectOption("Business");
  await page.route("**/api/review",async route=>{
   const data=response(route);data.findings[0]={...data.findings[0],reviewType:"enhancement",category:"clarity",optional:true};
   await route.fulfill({json:data});
  });
  await choose(page);await run(page);const finding=page.getByTestId("finding");
  await expect(finding).toContainText(locale==="en"?"Optional enhancement":"可选优化");
  await page.evaluate(()=>Object.defineProperty(navigator,"clipboard",{value:{writeText:async()=>{}},configurable:true}));await finding.getByTestId("copy").focus();await page.keyboard.press("Enter");await expect(page.getByTestId("action-message")).toContainText(locale==="en"?"Text copied":"文本已复制");
  await page.getByTestId("reset").click();await expect(page.getByRole("dialog")).toBeVisible();await page.keyboard.press("Escape");await expect(page.getByRole("dialog")).not.toBeVisible();await expect(finding).toBeVisible();
 });
 test(locale+" local read cancellation stops the worker",async({page})=>{
  await page.addInitScript(()=>{
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{postMessage(){/* Hold this worker to test teacher cancellation. */}} as typeof Worker;
  });
  await open(page);await language(page,locale);await choose(page,pptx(10));await page.getByTestId("cancel").click();
  await expect(page.locator("main")).toContainText(locale==="en"?"Reading stopped":"已停止读取");await expect(page.getByTestId("start-review")).toBeDisabled();
 });
}
test("safe review errors have known Chinese messages",async({page})=>{
 await open(page);await language(page,"zh-Hans");await page.getByTestId("subject").selectOption("Business");
 for(const [code,message] of [["REQUEST_TOO_LARGE","请求文本超过"],["MODEL_ACCESS_FAILED","账户余额"],["INVITE_REQUIRED","邀请链接"]] as const){
  await page.unroute("**/api/review");await page.route("**/api/review",route=>route.fulfill({status:403,json:{error:code,retryable:false}}));
  await choose(page);await run(page);await expect(page.getByTestId("slide-coverage")).toContainText(message);
 }
});

