import {test,expect} from "./teacher-fixture";
import {choose,open,pptx,response} from "./helpers";
test("restart after cancellation keeps original settings and hides setup",async({page})=>{
 await open(page);await page.getByTestId("subject").selectOption("Business");
 let calls=0,release!:()=>void;const held=new Promise<void>(resolve=>release=resolve);
 await page.route("**/api/review",async route=>{
  calls++;if(route.request().postDataJSON().slides[0].slideNumber===1)await route.fulfill({json:response(route)});
  else {await held;try{await route.fulfill({json:response(route)});}catch{}}
 });
 await choose(page,pptx(6));await page.getByTestId("start-review").click();await expect(page.getByTestId("progress")).toContainText("1 of 2");
 await page.getByTestId("cancel").click();release();await expect(page.getByTestId("review-summary")).toContainText("Review stopped");
 const restart=page.getByRole("button",{name:"Review all slides again"});await expect(restart).toBeEnabled();
 await expect(page.getByTestId("subject")).toHaveCount(0);await expect(page.getByTestId("toefl-number")).toHaveCount(0);await expect(restart).toBeEnabled();
 expect(calls).toBe(2);await expect(page.getByTestId("finding")).toHaveCount(1);
});

