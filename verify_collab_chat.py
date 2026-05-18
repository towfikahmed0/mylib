import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        path = os.path.abspath("index.html")
        await page.goto(f"file://{path}")

        # Inject necessary globals and bypass auth to trigger render
        await page.evaluate("""
            window.__test_data.currentUser = { uid: 'test-user', email: 'test@example.com' };
            window.__test_data.userProfile = { displayName: 'Test User' };
            window.__test_data.activities = [{type: 'book_added', userName: 'Test', bookTitle: 'Book', addedTo: 'Test', timestamp: new Date()}];

            // Bypass auth observer and trigger render
            window.authObserverStarted = true;
            window.setTab('activity');
        """)

        # Give it a moment to render
        await asyncio.sleep(2)

        # Verify new Messaging feature
        has_post_msg = await page.evaluate("typeof window.postActivityMessage === 'function'")

        # Check if activity-message-input is present in the DOM
        input_element = await page.query_selector("#activity-message-input")
        has_msg_input = input_element is not None

        # Verify old chat is GONE
        no_send_collab = await page.evaluate("typeof window.sendCollabMessage === 'undefined'")

        print(f"window.postActivityMessage exists: {has_post_msg}")
        print(f"activity-message-input exists: {has_msg_input}")
        print(f"window.sendCollabMessage is removed: {no_send_collab}")

        # Verify Copy helper
        has_copy_helper = await page.evaluate("typeof window.copyToClipboard === 'function'")
        print(f"window.copyToClipboard exists: {has_copy_helper}")

        await browser.close()
        return has_post_msg and has_msg_input and no_send_collab and has_copy_helper

if __name__ == "__main__":
    result = asyncio.run(verify())
    if not result:
        exit(1)
