from pathlib import Path


class SandboxSecurityError(Exception):
    """Raised when an operation tries to escape the sandbox root."""


class FileSandbox:
    """Read/write/patch confined to a single project root. Blocks path traversal."""

    def __init__(self, root: Path) -> None:
        self.root = Path(root).resolve()
        self.root.mkdir(parents=True, exist_ok=True)

    def _resolve(self, rel_path: str) -> Path:
        candidate = (self.root / rel_path).resolve()
        # Path.is_relative_to (3.9+) is the robust containment check.
        if not candidate.is_relative_to(self.root):
            raise SandboxSecurityError(f"Blocked path escape: {rel_path!r}")
        return candidate

    def read_file(self, rel_path: str) -> str:
        path = self._resolve(rel_path)
        if not path.exists():
            return f"[error] file not found: {rel_path}"
        return path.read_text(encoding="utf-8")

    def write_file(self, rel_path: str, content: str) -> str:
        path = self._resolve(rel_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return f"[ok] wrote {len(content)} chars to {rel_path}"

    def patch_file(self, rel_path: str, old: str, new: str) -> str:
        """Targeted edit: replace the first exact occurrence of `old` with `new`."""
        path = self._resolve(rel_path)
        if not path.exists():
            return f"[error] cannot patch missing file: {rel_path}"
        text = path.read_text(encoding="utf-8")
        if old not in text:
            return f"[error] patch anchor not found in {rel_path}"
        path.write_text(text.replace(old, new, 1), encoding="utf-8")
        return f"[ok] patched {rel_path}"

    def list_tree(self, max_entries: int = 200) -> list[str]:
        out = []
        for p in sorted(self.root.rglob("*")):
            if p.is_file():
                out.append(str(p.relative_to(self.root)))
            if len(out) >= max_entries:
                break
        return out
