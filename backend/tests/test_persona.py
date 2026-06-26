from app.agents.persona import AgentConfig, build_system_prompt


def test_prompt_embeds_identity_and_files():
    cfg = AgentConfig(
        key="qa", agent_id=2, name="Ben", role="QA Engineer",
        personality="meticulous, loves emojis", instructions="writes Pytest",
    )
    prompt = build_system_prompt(cfg, ["auth.py", "models.py"])

    assert "Ben" in prompt
    assert "QA Engineer" in prompt
    assert "meticulous" in prompt
    assert "writes Pytest" in prompt
    assert "auth.py" in prompt
    assert "run_command" in prompt  # tool docs present