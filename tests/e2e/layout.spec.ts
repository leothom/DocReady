import {test,expect} from "./teacher-fixture";
import {mkdir} from "node:fs/promises";
import {choose,language,mock,open,run} from "./helpers";
for(const locale of ["en","zh-Hans"] as const)for(const width of [1280,320]){
 test(locale+" layout at "+width+" pixels",async({page})=>{
  await page.setViewportSize({width,height:900});await open(page);await language(page,locale);await mock(page);await page.getByTestId("subject").selectOption("Business");await choose(page);await run(page);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator("main button").all()){const box=await button.boundingBox();if(box)expect(box.width).toBeGreaterThanOrEqual(44);}
  await mkdir(".superpowers/sdd/2026-10-04-slideready-mvp",{recursive:true});
  await page.screenshot({path:".superpowers/sdd/2026-10-04-slideready-mvp/stage5-"+locale+"-"+width+".png",fullPage:true});
 });
}

