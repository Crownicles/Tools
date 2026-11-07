// Screenshots the pages with a headless Chromium
import { chromium } from "playwright";

/**
 * Starts the Chromium of Playwright, or the Chrome installed on the computer when Playwright did not download its own
 */
export async function launchBrowser() {
	try {
		return await chromium.launch();
	}
	catch {
		return chromium.launch({ channel: "chrome" });
	}
}

/**
 * Screenshots a whole page into a PNG file
 * @param {import("playwright").Browser} browser
 * @param {{ html: string, file: string, width: number, scale: number }} params
 */
export async function screenshotPage(browser, {
	html, file, width, scale
}) {
	const page = await browser.newPage({
		viewport: {
			width, height: 1
		},
		deviceScaleFactor: scale
	});
	try {
		await page.setContent(html, { waitUntil: "load" });
		await page.evaluate(() => document.fonts.ready);
		await page.screenshot({
			path: file, fullPage: true
		});
	}
	finally {
		await page.close();
	}
}
