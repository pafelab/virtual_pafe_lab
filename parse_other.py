import re
import os

with open("virtual-ai-office-implementation-plan.md", "r", encoding="utf-8") as f:
    content = f.read()

# Look for specific files not captured by the "### X.Y `filepath`" pattern.

# backend/requirements.txt
match = re.search(r"pinned versions \(`backend/requirements\.txt` excerpt\):\n\n```(?:\w+)?\n(.*?)```", content, re.DOTALL | re.IGNORECASE)
if match:
    os.makedirs("backend", exist_ok=True)
    with open("backend/requirements.txt", "w", encoding="utf-8") as f:
        f.write(match.group(1))
    print("Wrote backend/requirements.txt")

# .env.example
match = re.search(r"`\.env\.example`:\n\n```(?:\w+)?\n(.*?)```", content, re.DOTALL)
if match:
    os.makedirs("backend", exist_ok=True)
    with open("backend/.env.example", "w", encoding="utf-8") as f:
        f.write(match.group(1))
    print("Wrote backend/.env.example")

# src/index.css
match = re.search(r"### 8\.9 Tailwind helper \(`src/index\.css` excerpt\)\n\n```(?:\w+)?\n(.*?)```", content, re.DOTALL)
if match:
    os.makedirs("frontend/src", exist_ok=True)
    with open("frontend/src/index.css", "w", encoding="utf-8") as f:
        f.write(match.group(1))
    print("Wrote frontend/src/index.css")
