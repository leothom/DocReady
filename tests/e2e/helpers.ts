import {expect,type Page,type Route} from "@playwright/test";
import {fixture,slide,shape,paragraph} from "../fixtures/build-pptx";
export const pptx=(count=1,empty=false)=>({name:"test-lesson.pptx",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation",buffer:Buffer.from(fixture(Array.from({length:count},()=>slide(empty?"<p:pic/>":shape("2",paragraph("The company sell goods."))))))});
export async function choose(page:Page,file=pptx()){if(await page.getByTestId("review-summary").count()){await page.getByTestId("reset").click();await page.getByTestId("replace-review").click();}await page.locator('input[type="file"]').setInputFiles(file);}
export async function language(page:Page,locale:"en"|"zh-Hans"){await page.getByTestId("language").selectOption(locale);await expect(page.locator("html")).toHaveAttribute("lang",locale);}
export function response(route:Route,findings=true){
 const body=route.request().postDataJSON(),s=body.slides[0],e=s.elements[0];
 return {findings:findings?[{slideNumber:s.slideNumber,shapeId:e.shapeId,elementId:e.elementId,originalText:e.text,suggestedText:"The company sells goods.",reviewType:"correction",category:"grammar",optional:false,confidence:.95,explanation:{en:"Use sells with company.","zh-Hans":"company 是单数主语，应使用 sells。"}}]:[],usage:{inputTokens:100,outputTokens:20,cachedInputTokens:0},elapsedMs:50,costUsd:null,model:"deepseek-flash"};
}
export async function mock(page:Page,findings=true){let calls=0;await page.route("**/api/review",async route=>{calls++;await route.fulfill({json:response(route,findings)});});return ()=>calls;}
export async function open(page:Page){await page.goto("/");await expect(page.getByTestId("language")).toBeVisible();await page.getByTestId("review-settings").locator("summary").click();}
export async function run(page:Page){await page.getByTestId("start-review").click();await expect(page.getByTestId("review-summary")).toBeVisible();}
