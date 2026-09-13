const { createHash } = await import("node:crypto");
const { mkdir, readFile, stat } = await import("node:fs/promises");
const path = await import("node:path");

const baseUrl = process.env.UX_SCREENSHOT_BASE_URL;
const outputDir = process.env.UX_SCREENSHOT_OUTPUT_DIR;
const signInPath = process.env.UX_SCREENSHOT_SIGN_IN_PATH;

if (!baseUrl || !outputDir || !signInPath) {
  throw new Error("UX screenshot base URL, output directory, and sign-in path are required");
}
if (!path.isAbsolute(outputDir)) {
  throw new Error("UX_SCREENSHOT_OUTPUT_DIR must resolve to an absolute path");
}

await mkdir(outputDir, { recursive: true });

const devices = {
  desktop: { height: 1000, mobile: false, name: "desktop", width: 1440 },
  mobile: { height: 844, mobile: true, name: "mobile", width: 390 },
};
const expectedPaths = [];
const task = await taskSpace("LunchPick reproducible UX screenshots");
const page = task.page("p1");

console.log(`Browser task space: ${task.spaceId}`);

async function setViewport(device) {
  await page.cdp("Emulation.setDeviceMetricsOverride", {
    deviceScaleFactor: 1,
    height: device.height,
    mobile: device.mobile,
    width: device.width,
  });
}

async function hideDevelopmentTools() {
  await page.evaluate(() => {
    const portal = document.querySelector("nextjs-portal");
    if (portal) portal.style.display = "none";
  });
}

async function capture(name, device) {
  await setViewport(device);
  await hideDevelopmentTools();
  const destination = path.join(outputDir, `${name}-${device.name}.png`);
  expectedPaths.push({ destination, device });
  await page.screenshot({ fullPage: true, path: destination });
  console.log(`Captured ${path.basename(destination)}`);
}

async function capturePair(name) {
  await capture(name, devices.desktop);
  await capture(name, devices.mobile);
}

async function navigate(relativeUrl, readySelector = "loc=css:h1") {
  await setViewport(devices.desktop);
  await page.goto(new URL(relativeUrl, baseUrl).toString());
  await page.waitForSelector(readySelector, { timeout: 10_000 });
}

async function referralUrlFor(pollId) {
  // The referral link lives in the workspace's "Share & settings" tab, and the
  // panel truncates it on screen — read the full URL from its data attribute.
  await navigate(`/admin/polls/${pollId}?tab=settings`, "text=Invite the team");
  const rawUrl = await page.evaluate(
    () =>
      document
        .querySelector("[data-referral-url]")
        ?.getAttribute("data-referral-url") ?? "",
  );
  if (!rawUrl) throw new Error(`Referral URL not found for poll ${pollId}`);

  const url = new URL(rawUrl);
  const expectedOrigin = new URL(baseUrl);
  url.protocol = expectedOrigin.protocol;
  url.hostname = expectedOrigin.hostname;
  url.port = expectedOrigin.port;
  return url.toString();
}

async function grantPollAccess(pollId, publicId) {
  const referralUrl = await referralUrlFor(pollId);
  await page.goto(referralUrl);
  await page.waitForURL(`**/poll/${publicId}`);
  await navigate(`/poll/${publicId}`);
}

async function deleteDeviceCookie(publicId) {
  const suffix = createHash("sha256")
    .update(publicId, "utf8")
    .digest("hex")
    .slice(0, 16);
  const hostname = new URL(baseUrl).hostname;
  await page.cdp("Network.deleteCookies", {
    domain: hostname,
    name: `rv_poll_device_${suffix}`,
    path: "/",
  });
}

async function verifyScreenshots() {
  if (expectedPaths.length !== 50) {
    throw new Error(`Expected 50 capture paths but produced ${expectedPaths.length}`);
  }

  for (const { destination, device } of expectedPaths) {
    const file = await stat(destination);
    if (file.size === 0) throw new Error(`Screenshot is empty: ${destination}`);

    const header = await readFile(destination);
    if (header.toString("ascii", 1, 4) !== "PNG") {
      throw new Error(`Screenshot is not a PNG: ${destination}`);
    }
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    const maximumExpectedWidth = device.name === "mobile" ? device.width + 8 : device.width;
    if (width < device.width || width > maximumExpectedWidth || height < device.height) {
      throw new Error(
        `Unexpected screenshot dimensions for ${path.basename(destination)}: ${width}x${height}`,
      );
    }
  }
}

await navigate(signInPath, "text=Lunch polls");

for (const [name, route] of [
  ["01-home", "/"],
  ["02-organizer-sign-in", "/auth/login"],
  ["03-check-email", "/auth/check-email"],
  ["04-privacy", "/privacy"],
  ["05-terms", "/terms"],
  ["06-link-unavailable", "/link-unavailable"],
  ["07-public-not-found", "/this-page-does-not-exist"],
]) {
  await navigate(route);
  await capturePair(name);
}

for (const [name, route] of [
  ["08-admin-dashboard", "/admin"],
  ["09-admin-lunch-centers", "/admin/centers"],
  ["10-admin-winner-history", "/admin/winners"],
  ["11-admin-create-poll", "/admin/polls/new"],
  ["12-admin-poll-draft", "/admin/polls/21000000-0000-4000-8000-000000000001"],
  ["13-admin-poll-nominations", "/admin/polls/20000000-0000-4000-8000-000000000001"],
  ["14-admin-poll-voting", "/admin/polls/22000000-0000-4000-8000-000000000001"],
  ["15-admin-poll-closed-winner", "/admin/polls/23000000-0000-4000-8000-000000000001"],
  ["16-admin-poll-closed-tie", "/admin/polls/24000000-0000-4000-8000-000000000001"],
  ["17-admin-poll-closed-no-votes", "/admin/polls/25000000-0000-4000-8000-000000000001"],
  ["18-admin-not-found", "/admin/polls/99999999-9999-4999-8999-999999999999"],
]) {
  await navigate(route);
  await capturePair(name);
}

await grantPollAccess("20000000-0000-4000-8000-000000000001", "demo-lunch-poll");
await deleteDeviceCookie("demo-lunch-poll");
await navigate("/poll/demo-lunch-poll", 'loc=css:input[name="displayName"]');
await capturePair("19-public-nominations-join");
await setViewport(devices.desktop);
await page.fill('loc=css:input[name="displayName"]', "Alex Morgan");
await page.click('loc=css:form button[type="submit"]', { label: "join nomination poll" });
await page.waitForSelector("text=Current shortlist", { timeout: 10_000 });
await capturePair("20-public-nominations-participant");

await grantPollAccess("22000000-0000-4000-8000-000000000001", "ux-voting-poll");
await deleteDeviceCookie("ux-voting-poll");
await navigate("/poll/ux-voting-poll", 'loc=css:input[name="displayName"]');
await capturePair("21-public-voting-join");
await setViewport(devices.desktop);
await page.fill('loc=css:input[name="displayName"]', "Chris Bennett");
await page.click('loc=css:form button[type="submit"]', { label: "join voting poll" });
await page.waitForSelector("text=Choose up to 3", { timeout: 10_000 });
await capturePair("22-public-voting-participant");

for (const { id, name, publicId } of [
  {
    id: "23000000-0000-4000-8000-000000000001",
    name: "23-public-results-winner",
    publicId: "ux-winner-poll",
  },
  {
    id: "24000000-0000-4000-8000-000000000001",
    name: "24-public-results-tie",
    publicId: "ux-tied-poll",
  },
  {
    id: "25000000-0000-4000-8000-000000000001",
    name: "25-public-results-no-votes",
    publicId: "ux-no-votes-poll",
  },
]) {
  await grantPollAccess(id, publicId);
  await page.waitForSelector("loc=css:h1", { timeout: 10_000 });
  await capturePair(name);
}

await verifyScreenshots();
await task.finish({ keep: [] });
console.log(`Verified ${expectedPaths.length} screenshots.`);
