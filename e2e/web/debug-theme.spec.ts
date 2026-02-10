import { test, expect } from "../lib/playwright-logger";
import {
  gotoWithTheme,
  clickThemeToggle,
  getCurrentTheme,
  waitForThemeClass,
} from "../lib/theme-helpers";

test("debug theme toggle state", async ({ page }) => {
  await gotoWithTheme(page, "/", "light");

  const theme1 = await getCurrentTheme(page);
  console.log("BEFORE click - theme:", theme1);

  await clickThemeToggle(page);
  await waitForThemeClass(page, "dark", 10000);

  const theme2 = await getCurrentTheme(page);
  console.log("AFTER click - theme:", theme2);

  expect(theme2).toBe("dark");
});
