import { test, expect, type Page } from "@playwright/test";

async function anonymous(page: Page) {
  await page.route("**/api/session", route => route.fulfill({ status: 401, json: { error: "INVITE_REQUIRED" } }));
}

test("approved email opens upload on the same page without storing the address", async ({ page }) => {
  await anonymous(page);
  let paidCalls = 0;
  await page.route(/\/api\/reviews?$/, route => { paidCalls++; return route.abort(); });
  const requests: unknown[] = [];
  await page.route("**/api/access", route => { requests.push(route.request().postDataJSON()); return route.fulfill({ json: { ok: true } }); });
  await page.goto("/");
  await expect(page.getByLabel("School email", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText("Your email and usage totals are recorded. Slide text and suggestions are not saved by SlideReady.")).toBeVisible();
  await page.getByLabel("School email", { exact: true }).fill("teacher.alpha@sendelta.com");
  await page.getByLabel("School email", { exact: true }).press("Enter");
  await expect(page.getByTestId("file-drop")).toBeVisible();
  await expect(page.getByLabel("School email", { exact: true })).toHaveCount(0);
  expect(requests).toEqual([{ email: "teacher.alpha@sendelta.com" }]);
  expect(page.url()).not.toContain("teacher.alpha");
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain("teacher.alpha");
  expect(paidCalls).toBe(0);
});

test("unapproved email shows a mail link and supports Chinese on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await anonymous(page);
  await page.route("**/api/access", route => route.fulfill({ status: 403, json: { error: "EMAIL_NOT_APPROVED" } }));
  await page.goto("/");
  await page.getByLabel("School email", { exact: true }).fill("teacher.other@example.com");
  await page.getByRole("button", { name: "Start reviewing", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("For access, email");
  await expect(page.getByRole("link", { name: "Leo@sendelta.com", exact: true })).toHaveAttribute("href", "mailto:Leo@sendelta.com");
  await page.getByTestId("language").selectOption("zh-Hans");
  await expect(page.getByLabel("学校邮箱", { exact: true })).toBeVisible();
  await expect(page.locator("main").getByRole("alert")).toContainText("如需访问权限，请发送邮件至");
  await expect(page.getByText("您的邮箱和使用总量会被记录。SlideReady 不保存幻灯片文本或建议。")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/email-access-mobile-zh.png", fullPage: true });
});

test("invalid email is checked inline and a failed request can be retried", async ({ page }) => {
  await anonymous(page);
  let calls = 0;
  await page.route("**/api/access", route => { calls++; return calls === 1 ? route.abort() : route.fulfill({ json: { ok: true } }); });
  await page.goto("/");
  await page.getByLabel("School email", { exact: true }).fill("not-an-email");
  await page.getByRole("button", { name: "Start reviewing", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Enter a valid email address.");
  expect(calls).toBe(0);
  await page.getByLabel("School email", { exact: true }).fill("teacher.alpha@sendelta.com");
  await page.getByRole("button", { name: "Start reviewing", exact: true }).click();
  await expect(page.locator("main").getByRole("alert")).toHaveText("Could not connect. Try again.");
  await expect(page.getByRole("button", { name: "Start reviewing", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Start reviewing", exact: true }).click();
  await expect(page.getByTestId("file-drop")).toBeVisible();
});

for (const [status, message] of [[429, "Too many attempts. Wait a moment and try again."], [503, "Access is not available now. Try again later."]] as const) {
  test(`email access handles ${status} without showing upload`, async ({ page }) => {
    await anonymous(page);
    await page.route("**/api/access", route => route.fulfill({ status, json: { error: "unavailable" } }));
    await page.goto("/");
    await page.getByLabel("School email", { exact: true }).fill("teacher.alpha@sendelta.com");
    await page.getByRole("button", { name: "Start reviewing", exact: true }).click();
    await expect(page.locator("main").getByRole("alert")).toHaveText(message);
    await expect(page.locator('input[type="file"]')).toHaveCount(0);
  });
}

test("an existing session skips the email form", async ({ page }) => {
  await page.route("**/api/session", route => route.fulfill({ json: { ok: true } }));
  await page.goto("/");
  await expect(page.getByTestId("file-drop")).toBeVisible();
  await expect(page.getByLabel("School email", { exact: true })).toHaveCount(0);
});
