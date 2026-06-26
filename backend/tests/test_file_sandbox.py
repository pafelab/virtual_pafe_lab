import pytest
from app.tools.file_sandbox import FileSandbox, SandboxSecurityError


def test_write_then_read_roundtrip(tmp_project):
    box = FileSandbox(tmp_project)
    assert "[ok]" in box.write_file("notes/todo.md", "hello")
    assert box.read_file("notes/todo.md") == "hello"


def test_patch_replaces_first_occurrence(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("a.txt", "foo bar foo")
    box.patch_file("a.txt", "foo", "BAZ")
    assert box.read_file("a.txt") == "BAZ bar foo"


def test_read_missing_file_is_graceful(tmp_project):
    box = FileSandbox(tmp_project)
    assert "[error]" in box.read_file("does/not/exist.txt")


def test_patch_missing_anchor_reports_error(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("a.txt", "content")
    assert "[error]" in box.patch_file("a.txt", "NOPE", "x")


@pytest.mark.parametrize("evil", ["../secret.txt", "../../etc/passwd", "sub/../../out.txt"])
def test_path_traversal_is_blocked(tmp_project, evil):
    box = FileSandbox(tmp_project)
    with pytest.raises(SandboxSecurityError):
        box.read_file(evil)
    with pytest.raises(SandboxSecurityError):
        box.write_file(evil, "x")


def test_nested_write_creates_dirs(tmp_project):
    box = FileSandbox(tmp_project)
    box.write_file("deep/a/b/c.txt", "ok")
    assert (tmp_project / "deep/a/b/c.txt").exists()