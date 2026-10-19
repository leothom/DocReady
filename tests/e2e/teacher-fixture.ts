import { randomUUID } from "node:crypto";
import { test as base, expect } from "@playwright/test";

// Teacher workflow tests use an admitted invite. Access denial tests use the
// unmodified Playwright fixture so they cannot inherit this authorization.
export const test = base.extend({
  page: async ({ page }, providePage) => {
    await page.route("**/api/session", route => route.fulfill({ json: { ok: true } }));
    await page.route("**/api/reviews", async route => {
      expect(route.request().method()).toBe("POST");
      const body = route.request().postDataJSON();
      expect(Object.keys(body)).toEqual(["slideNumbers"]);
      expect(body.slideNumbers.length).toBeGreaterThan(0);
      expect(body.slideNumbers.every((number: number) => Number.isInteger(number) && number > 0)).toBe(true);
      await route.fulfill({ json: { reviewId: randomUUID() } });
    });
    await providePage(page);
  },
});
export { expect };

