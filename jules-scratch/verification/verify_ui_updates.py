
from playwright.sync_api import sync_playwright, Page, expect
import re

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000", wait_until="networkidle")
        print("Page loaded.")

        # Wait for the "Active Tasks" header to indicate the panel has loaded data.
        # This is more reliable than a fixed sleep.
        print("Waiting for tasks panel to load...")
        active_tasks_header = page.get_by_text(re.compile(r"Active Tasks \(\d+\)"))
        expect(active_tasks_header).to_be_visible(timeout=15000)
        print("Tasks panel loaded.")

        # 1. Verify initial tasks are present
        print("Verifying initial tasks...")
        # Increase the timeout for this specific expectation to handle async data loading.
        expect(page.get_by_text("(a-->b).")).to_be_visible(timeout=10000)
        expect(page.get_by_text("(b-->c).")).to_be_visible(timeout=10000)
        print("Initial tasks are visible.")

        # 2. Verify throttle slider UI change
        print("Verifying throttle slider...")
        throttle_emoji = page.get_by_role("img", name="CPU Throttle")
        expect(throttle_emoji).to_be_visible()
        print("Throttle slider emoji is visible.")

        # 3. Verify Concept Map legend change
        print("Verifying Concept Map legend...")
        individual_concepts_legend = page.get_by_text("Individual Concepts")
        expect(individual_concepts_legend).not_to_be_visible()
        print("'Individual Concepts' legend is not visible, as expected.")

        # 4. Screenshot: Capture the final result.
        screenshot_path = "jules-scratch/verification/verification.png"
        print(f"Taking screenshot to '{screenshot_path}'...")
        page.screenshot(path=screenshot_path)
        print("Screenshot successful.")

        browser.close()

if __name__ == "__main__":
    main()
