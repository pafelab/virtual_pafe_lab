import re
import os

with open("virtual-ai-office-implementation-plan.md", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern for ### X.Y `filepath`
pattern = r"### \d+\.\d+\s+`(.*?)`.*?\n```[a-z]*\n(.*?)```"
matches = re.findall(pattern, content, re.DOTALL)

for filepath, code in matches:
    # Need to handle backend/ or frontend/ logic.
    if filepath.startswith("app/") or filepath.startswith("tests/") or filepath == "backend/pytest.ini" or filepath == "backend/requirements.txt":
        full_path = filepath if filepath.startswith("backend/") else f"backend/{filepath}"
    elif filepath.startswith("src/") or filepath == "frontend/package.json" or filepath.endswith(".jsx") or filepath.endswith(".js"):
        full_path = filepath if filepath.startswith("frontend/") else f"frontend/src/{filepath}" if not filepath.startswith("src/") else f"frontend/{filepath}"
    else:
        full_path = filepath

    # fix edge cases
    full_path = full_path.replace('frontend/src/src/', 'frontend/src/')
    full_path = full_path.replace('backend/backend/', 'backend/')

    print(full_path)
    # Actually, write the file
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as out_f:
        out_f.write(code)
