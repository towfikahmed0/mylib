import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Grant clipboard permissions as per memory
        context = browser.contexts[0]
        await context.grant_permissions(['clipboard-read', 'clipboard-write'])

        page.on("console", lambda msg: print(f"CONSOLE: {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        await page.goto("http://localhost:8000/index.html")

        # We need to bypass auth or mock it.
        # The app uses Firebase. We can try to inject a mock user.
        await page.evaluate("""
            window.__test_state = {
                mockUser: {
                    uid: 'test-user-id',
                    email: 'test@example.com',
                    displayName: 'Test User'
                }
            };

            // Mock Firebase auth
            auth.onAuthStateChanged = (callback) => {
                callback(window.__test_state.mockUser);
            };

            // Mock Firestore
            db.collection = (name) => ({
                doc: (id) => ({
                    get: () => Promise.resolve({ exists: true, data: () => ({}) }),
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve(),
                    collection: (subname) => ({
                        doc: (subid) => ({
                            get: () => Promise.resolve({ exists: true, data: () => ({}) }),
                            set: () => Promise.resolve(),
                        }),
                        get: () => Promise.resolve({ docs: [] }),
                        where: () => ({
                            onSnapshot: (cb) => { cb({ docs: [], docChanges: () => [] }); return () => {}; },
                            get: () => Promise.resolve({ docs: [] })
                        })
                    }),
                    onSnapshot: (cb) => { cb({ exists: true, data: () => ({}) }); return () => {}; }
                }),
                where: () => ({
                    onSnapshot: (cb) => { cb({ docs: [], docChanges: () => [] }); return () => {}; },
                    get: () => Promise.resolve({ docs: [] }),
                    limit: () => ({
                        get: () => Promise.resolve({ docs: [], empty: true })
                    })
                }),
                onSnapshot: (cb) => { cb({ docs: [], docChanges: () => [] }); return () => {}; }
            });
            db.collectionGroup = () => ({
                where: () => ({
                    onSnapshot: (cb) => { cb({ docs: [], docChanges: () => [] }); return () => {}; }
                })
            });

            // Start the app if not already started
            if (window.startApp) window.startApp();
        """)

        # Give it a second to render
        await asyncio.sleep(2)

        # Inject some mock books into the state if possible, or just mock the Firestore response better
        await page.evaluate("""
            books = [
                {
                    id: 'book1',
                    title: 'Test Book',
                    author: 'Test Author',
                    userId: 'test-user-id',
                    _searchStr: 'test book test author',
                    _createdTime: Date.now()
                }
            ];
            renderMainApp();
        """)

        await asyncio.sleep(1)

        # Click the book card
        print("Clicking book card...")
        await page.click('[data-book-id="book1"]')

        await asyncio.sleep(2)

        # Take a screenshot to see the "nothing happened" state
        await page.screenshot(path="bug_state.png")
        print("Screenshot saved to bug_state.png")

        await browser.close()

asyncio.run(run())
