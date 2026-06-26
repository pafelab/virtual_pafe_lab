import os
import tempfile
from pathlib import Path

import pytest

# Point the app at a throwaway DB and a dummy key BEFORE importing app modules.
_DB = os.path.join(tempfile.gettempdir(), "office_test.db")
if os.path.exists(_DB):
    os.remove(_DB)
os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ["GOOGLE_API_KEY"] = "test-key"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app                    # noqa: E402


@pytest.fixture
def client():
    # Entering the context manager fires FastAPI startup → init_db() on temp DB.
    with TestClient(app) as c:
        yield c


@pytest.fixture
def tmp_project(tmp_path: Path) -> Path:
    root = tmp_path / "project"
    root.mkdir()
    (root / "auth.py").write_text("def login():\n    return None\n")
    return root