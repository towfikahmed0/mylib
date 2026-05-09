import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Load the app
        await page.goto('http://localhost:8080')

        # Give it a moment to render
        await asyncio.sleep(2)

        # Check if the revitalized elements are present
        hero_h1 = await page.query_selector('main h1.animate-slide-up')
        if hero_h1:
            print("Hero H1 found.")
        else:
            print("Hero H1 NOT found.")

        # Check initial visibility (should be 0 or small because of reveal)
        opacity = await page.evaluate("window.getComputedStyle(document.querySelector('main')).opacity")
        print(f"Initial main opacity: {opacity}")

        # Scroll down to trigger reveals
        await page.evaluate("window.scrollTo(0, 500)")
        await asyncio.sleep(1)

        # Check visibility after scroll
        opacity_after = await page.evaluate("window.getComputedStyle(document.querySelector('main')).opacity")
        print(f"Main opacity after scroll: {opacity_after}")

        # Check scroll variable
        scroll_var = await page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--scroll')")
        print(f"Scroll variable value: {scroll_var}")

        # Take screenshots
        os.makedirs('verification', exist_ok=True)
        await page.screenshot(path='verification/hero_revitalized.png')

        await page.evaluate("window.scrollTo(0, 1000)")
        await asyncio.sleep(1)
        await page.screenshot(path='verification/features_revitalized.png')

        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1)
        await page.screenshot(path='verification/footer_revitalized.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(verify())
