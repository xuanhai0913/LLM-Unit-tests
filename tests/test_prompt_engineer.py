from src.prompt_engineer import build_test_generation_prompt


def test_build_prompt_contains_sections():
    code = "def add(a,b):\n    return a+b"
    specs = "Add should return sum of a and b"
    prompt = build_test_generation_prompt(code=code, specs=specs, framework="pytest")

    assert "System:" in prompt
    assert "Specifications:" in prompt
    assert "Code under test:" in prompt
    assert "```python" in prompt
    assert code in prompt
    assert "pytest" in prompt

