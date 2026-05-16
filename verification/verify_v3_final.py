import asyncio
from playwright.async_api import async_playwright
import os

async def verify_v3_final():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 800})
        page = await context.new_page()

        # Capture console logs
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))

        # Go to the app
        await page.goto('http://localhost:8080')
        await asyncio.sleep(2)

        # 1. Capture Landing Page (v3 check)
        await page.screenshot(path='verification/v3_landing_final.png', full_page=True)
        print("Captured v3_landing_final.png")

        # 2. Mock Auth and State
        await page.evaluate("""
            window.__setCurrentUser({
                uid: 'test-user-123',
                email: 'test@example.org',
                displayName: 'Test User'
            });
            window.__setUserProfile({
                name: 'Test User',
                email: 'test@example.org'
            });

            window.__setInitialSync(false);
            window.activeTab = 'feed';

            // Ensure socialReviews has content to avoid 'Quiet in the Library' state
            window.socialReviews = [{
                id: 'rev1',
                userId: 'test-user-123',
                userName: 'Test User',
                bookTitle: 'Great Gatsby',
                author: 'F. Scott Fitzgerald',
                body: 'A classic that defines an era.',
                rating: 5,
                likesCount: 10,
                commentsCount: 2,
                createdAt: { toDate: () => new Date() }
            }];

            if (window.queueRenderMainApp) window.queueRenderMainApp();
        """)
        await asyncio.sleep(2)

        # 3. Verify Feed Tab
        try:
            # Try both "Write Review" and "Write a Review" just in case
            btn = await page.wait_for_selector('button:has-text("Write Review")', timeout=5000)
            await page.screenshot(path='verification/v3_feed_final.png')
            print("Captured v3_feed_final.png")

            # Open Review Modal to check stars
            await btn.click()
            await asyncio.sleep(1)
            stars = await page.wait_for_selector('#rev-rating-container', timeout=5000)
            await stars.screenshot(path='verification/v3_stars_final.png')
            print("Captured v3_stars_final.png")
            await page.keyboard.press("Escape")
            await asyncio.sleep(0.5)
        except Exception as e:
            print(f"Feed verification failed: {e}")
            await page.screenshot(path='verification/v3_feed_error_final.png')

        # 4. Verify Activity Tab
        try:
            await page.click('button[aria-label="Activity"]')
            await asyncio.sleep(1)
            await page.screenshot(path='verification/v3_activity_final.png')
            print("Captured v3_activity_final.png")
        except Exception as e:
            print(f"Activity tab verification failed: {e}")

        # 5. Verify Manual Add Modal (Scan button)
        try:
            await page.click('#manual-add-btn')
            await asyncio.sleep(1)
            await page.screenshot(path='verification/v3_manual_add_final.png')
            print("Captured v3_manual_add_final.png")
        except Exception as e:
            print(f"Manual add verification failed: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_v3_final())
