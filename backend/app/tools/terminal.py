import shlex
import shutil
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

        # Resolve to a concrete executable. On Windows npm/npx/yarn are .cmd
        # scripts that CreateProcess can't locate by bare name with shell=False;
        # shutil.which honours PATHEXT and returns the full path.
        executable = shutil.which(program)
        if executable is None:
            return self._error(command, f"executable not found on PATH: {program!r}")
        parts[0] = executable

        try:
            proc = subprocess.run(
                parts,
                cwd=self.cwd,
                capture_output=True,
                text=True,
                encoding="utf-8",      # decode output ourselves so a non-UTF-8
                errors="replace",      # locale (e.g. cp874) can't crash on decode
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
        except OSError as exc:  # e.g. failed to spawn the process
            return self._error(command, f"failed to launch {program!r}: {exc}")

    @staticmethod
    def _error(command: str, message: str) -> dict:
        return {"command": command, "returncode": -1, "stdout": "",
                "stderr": message, "timed_out": False}
