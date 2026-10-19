import {test,expect} from "./teacher-fixture";
import {choose,language,mock,open,run,response,pptx} from "./helpers";
test("language change preserves file, settings, pending work and suggestions with no model calls",async({page})=>{
 await open(page);await language(page,"zh-Hans");await page.getByTestId("subject").selectOption("Business");await page.getByTestId("toefl-number").fill("4.5");
 let release!:()=>void;const held=new Promise<void>(r=>release=r);let calls=0;
 await page.route("**/api/review",async route=>{calls++;await held;await route.fulfill({json:response(route)});});
 await choose(page,pptx());await language(page,"en");await expect(page.getByTestId("file-name")).toHaveText("test-lesson.pptx");
 await page.getByTestId("start-review").click();await expect(page.getByTestId("progress")).toContainText("Reviewing slides");
 await language(page,"zh-Hans");await expect(page.getByTestId("progress")).toContainText("正在审查幻灯片");release();
 await expect(page.getByTestId("finding")).toHaveCount(1);
 const id=await page.getByTestId("finding").getAttribute("data-finding-id");
 await language(page,"en");await expect(page.getByTestId("finding")).toHaveAttribute("data-finding-id",id!);
 await expect(page.getByTestId("subject")).toHaveCount(0);await expect(page.getByTestId("toefl-number")).toHaveCount(0);
 expect(calls).toBe(1);await page.reload();await expect(page.locator("html")).toHaveAttribute("lang","en");await expect(page.getByTestId("finding")).toHaveCount(0);
});
test("Chinese preference, blocked storage and narrow layout work",async({page})=>{
 await open(page);await language(page,"zh-Hans");await page.reload();await expect(page.locator("html")).toHaveAttribute("lang","zh-Hans");
 await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error("blocked")};Storage.prototype.setItem=()=>{throw Error("blocked")};});
 await page.reload();await page.getByText("Use my own DeepSeek account",{exact:true}).click();await page.getByRole("button",{name:"Remove key",exact:true}).click();await page.getByTestId("review-settings").locator("summary").click();await language(page,"zh-Hans");await page.setViewportSize({width:320,height:760});await mock(page);await page.getByTestId("subject").selectOption("Business");await choose(page);await run(page);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page).toHaveTitle(/审查/);await page.goto("/unknown-page");await expect(page.getByRole("heading",{level:1})).toBeVisible();
 await language(page,"zh-Hans");await expect(page.getByRole("heading",{level:1})).toContainText("找不到");
});

