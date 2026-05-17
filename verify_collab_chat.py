import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        path = os.path.abspath("index.html")
        await page.goto(f"file://{path}")

        # Manually trigger app start
        await page.evaluate("window.startApp()")

        # Verify Chat components
        has_send_msg = await page.evaluate("typeof window.sendCollabMessage === 'function'")
        has_chat_input = await page.evaluate("document.getElementById('collab-chat-input') !== null")

        print(f"window.sendCollabMessage exists: {has_send_msg}")

        # Verify Copy helper
        has_copy_helper = await page.evaluate("typeof window.copyToClipboard === 'function'")
        print(f"window.copyToClipboard exists: {has_copy_helper}")

        await browser.close()
        return has_send_msg and has_copy_helper

if __name__ == "__main__":
    result = asyncio.run(verify())
    if not result:
        exit(1)
