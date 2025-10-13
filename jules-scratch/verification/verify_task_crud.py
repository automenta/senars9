
import re
from playwright.sync_api import sync_playwright, Page, expect

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        print("Navigating to http://localhost:3000...")
        page.goto("http://localhost:3000")
        print("Page loaded.")

        # Give the app a moment to load components
        page.wait_for_selector(".reasoner-control-panel", timeout=10000)
        print("Reasoner control panel found.")

        # 2. Assert: Check that the "+ Add Task" button is not visible.
        print("Checking for '+ Add Task' button...")
        add_task_button = page.get_by_role("button", name="+ Add Task")
        expect(add_task_button).not_to_be_visible()
        print("'+ Add Task' button is not visible, as expected.")

        # 3. Act: Add a new task using the input field.
        task_content = "My new test task"
        print(f"Adding task: '{task_content}'")
        input_field = page.get_by_placeholder(re.compile("Enter a command or task", re.IGNORECASE))
        input_field.fill(task_content)
        send_button = page.get_by_role("button", name="Send")
        send_button.click()
        print("Task submitted.")

        # 4. Assert: Check that the new task appears in the TasksPanel.
        print("Verifying task appears in the list...")
        task_item = page.get_by_text(task_content)
        expect(task_item).to_be_visible()
        print("Task is visible in the list.")

        # 5. Screenshot: Capture the final result.
        screenshot_path = "jules-scratch/verification/verification.png"
        print(f"Taking screenshot to '{screenshot_path}'...")
        page.screenshot(path=screenshot_path)
        print("Screenshot successful.")

        browser.close()

if __name__ == "__main__":
    main()
