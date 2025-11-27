from types import SimpleNamespace
from src.config import Config
from src.test_generator import TestGenerator


class FakeClient:
    def __init__(self, response: str):
        self._response = response

    def generate_text(self, prompt: str) -> str:
        return self._response


def test_generate_tests_extracts_code_block():
    cfg = Config(load_env=False, validate=False)
    cfg.deepseek_api_key = "test-key"

    fake = FakeClient(
        """
Here are your tests:
```python
import pytest
from examples.sample_code import add

def test_add():
    assert add(1,2) == 3
```
"""
    )

    gen = TestGenerator(cfg, client=fake)
    out = gen.generate_tests("def add(a,b):\n    return a+b")
    assert "def test_add" in out
    assert "pytest" in out


def test_generate_and_save(tmp_path):
    cfg = Config(load_env=False, validate=False)
    cfg.deepseek_api_key = "test-key"

    fake = FakeClient("""```python\n# content\n```\n""")
    gen = TestGenerator(cfg, client=fake)

    output = tmp_path / "test_generated.py"
    saved = gen.generate_and_save("print('x')", str(output), overwrite=True)
    assert saved == str(output)
    assert output.exists()
    assert output.read_text().strip() != ""

