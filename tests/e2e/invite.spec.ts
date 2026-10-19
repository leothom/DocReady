import {test,expect} from "@playwright/test";
test("a private invite completes in development Strict Mode",async({page})=>{
 let calls=0;await page.route("**/api/invite",async route=>{calls++;await route.fulfill({status:200,json:{ok:true}});});
 await page.goto("/#invite=test-invite");
 await expect(page.getByTestId("file-drop")).toBeVisible();
 await expect(page.getByLabel("School email", { exact: true })).toHaveCount(0);
 await expect(page.locator("main")).not.toContainText("Checking your invite");
 await expect(page).toHaveURL(/\/$/);expect(calls).toBe(1);
});
test("a rejected private invite has a safe Chinese message",async({page})=>{
 await page.route("**/api/invite",route=>route.fulfill({status:403,json:{error:"INVITE_REQUIRED"}}));
 await page.goto("/#invite=test-invite");await page.getByTestId("language").selectOption("zh-Hans");
 await expect(page.getByLabel("学校邮箱", { exact: true })).toBeVisible();await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("public visitors can read the site but cannot start a paid review", async ({ page }) => {
 let paidCalls = 0;
 await page.route("**/api/session", route => route.fulfill({ status: 401, json: { error: "INVITE_REQUIRED" } }));
 await page.route(/\/api\/reviews?$/, route => { paidCalls++; return route.abort(); });
 await page.goto("/");
 await expect(page.getByLabel("School email", { exact: true })).toBeVisible();
 await expect(page.getByTestId("start-review")).toHaveCount(0);
 await expect(page.locator('input[type="file"]')).toHaveCount(0);
 await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
 await page.getByTestId("language").selectOption("zh-Hans");
 await expect(page.getByLabel("学校邮箱", { exact: true })).toBeVisible();
 expect(paidCalls).toBe(0);
 await page.goto("/privacy");
 await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
 expect(paidCalls).toBe(0);
});
