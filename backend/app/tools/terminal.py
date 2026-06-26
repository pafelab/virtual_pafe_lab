import shlex
import subprocess
from pathlib import Path


class TerminalSecurityError(Exception):
    pass


class SafeTerminal:
    """Runs a small allow-list of commands inside the sandbox, capturing output."""

    DEFAULT_ALLOW = {
        "pytest", "python", "python3", "pip",
        "npm", "npx", "node", "yarn",
        "ls", "cat", "git",
    }

    def __init__(self, cwd: Path, timeout: int = 90,
                 allow: set[str] | None = None) -> None:
        self.cwd = Path(cwd).resolve()
        self.timeout = timeout
        self.allow = allow or set(self.DEFAULT_ALLOW)

    def run(self, command: str) -> dict:
        parts = shlex.split(command)
        if not parts:
            raise TerminalSecurityError("empty command")
        program = parts[0]
        if program not in self.allow:
            raise TerminalSecurityError(f"command not allowed: {program!r}")
        # Block shell metacharacters that could chain commands.
        if any(tok in command for tok in ("&&", "||", ";", "|", ">", "<", "`", "$(")):
            raise TerminalSecurityError("shell operators are not permitted")
        try:
            proc = subprocess.run(
                parts,
                cwd=self.cwd,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                shell=False,  # never invoke a shell
            )
            return {
                "command": command,
                "returncode": proc.returncode,
                "stdout": proc.stdout[-8000:],   # cap to keep prompts small
                "stderr": proc.stderr[-8000:],
                "timed_out": False,
            }
        except subprocess.TimeoutExpired:
            return {
                "command": command, "returncode": -1,
                "stdout": "", "stderr": f"timeout after {self.timeout}s",
                "timed_out": True,
            }
