import { test, expect } from "@playwright/test";

test("BUILTIN_POSITIONS canonical layout has zero collision conflicts", async ({
  page,
}) => {
  await page.goto("/");
  // Wait for collision module to mount its globals
  await page.waitForFunction(
    () =>
      typeof (window as any).findConflicts === "function" &&
      typeof (window as any).buildCanonicalWalls === "function" &&
      (window as any).BUILTIN_POSITIONS_CANONICAL,
    { timeout: 10000 },
  );

  const conflicts = await page.evaluate(() => {
    const w = window as any;
    const walls = w.buildCanonicalWalls(w.CANONICAL_COLS, w.CANONICAL_ROWS);
    return w.findConflicts(
      w.BUILTIN_POSITIONS_CANONICAL,
      walls,
      w.CANONICAL_COLS,
      w.CANONICAL_ROWS,
    );
  });

  if (conflicts.length) {
    console.log("Conflicts:", JSON.stringify(conflicts, null, 2));
  }
  expect(conflicts).toHaveLength(0);
});
