import pytest
from app.tools.terminal import SafeTerminal, TerminalSecurityError


def test_allowed_command_runs(tmp_project):
    term = SafeTerminal(tmp_project)
    result = term.run("ls")
    assert result["returncode"] == 0
    assert result["timed_out"] is False


def test_disallowed_command_is_blocked(tmp_project):
    term = SafeTerminal(tmp_project)
    with pytest.raises(TerminalSecurityError):
        term.run("rm -rf /")


@pytest.mark.parametrize("cmd", ["ls && whoami", "cat a | grep b", "echo hi; ls", "ls > out.txt"])
def test_shell_operators_are_blocked(tmp_project, cmd):
    term = SafeTerminal(tmp_project)
    with pytest.raises(TerminalSecurityError):
        term.run(cmd)


def test_timeout_is_captured(tmp_project):
    (tmp_project / "slow.py").write_text("import time\ntime.sleep(3)\n")
    term = SafeTerminal(tmp_project, timeout=1)
    result = term.run("python slow.py")
    assert result["timed_out"] is True
    assert result["returncode"] == -1